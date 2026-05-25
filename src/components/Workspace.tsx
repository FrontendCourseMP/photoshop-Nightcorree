import { useEffect, useRef, useState } from 'react';
import { decodeGB7 } from '../utils/gb7Codec';
import { rgbToLab, applyImageFilters } from '../utils/imageUtils';
import { ScalingProvider, type InterpolationMethod } from '../utils/interpolation';
import { applyConvolution, type EdgeStrategy } from '../utils/filters';
import type { ChannelState } from './ChannelPanel';
import type { EditorTool } from './Toolbar';
import type { ColorInfo } from '../App';

export interface ImageMeta {
    width: number;
    height: number;
    colorDepth: number;
    hasAlpha: boolean;
}

interface WorkspaceProps {
    file: File | null;
    onImageLoaded: (meta: ImageMeta, imageData: ImageData) => void;
    activeChannels: ChannelState;
    activeTool: EditorTool;
    onColorPicked: (info: ColorInfo) => void;
    imageMeta: ImageMeta | null;
    levelsLUTs: Record<string, Uint8Array> | null;
    imageData: ImageData | null;
    viewScale: number;
    interpolationMethod: InterpolationMethod;
    previewFilter: { kernel: number[], strategy: EdgeStrategy, channels: ChannelState } | null;
}

export function Workspace({ 
    file, onImageLoaded, activeChannels, activeTool, onColorPicked, 
    imageMeta, levelsLUTs, imageData, viewScale, interpolationMethod,
    previewFilter
}: WorkspaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasBeenFilteredRef = useRef<boolean>(false);
    
    // ПЕРФОРМАНС: Буферы для результирующих данных (Zero-Allocation)
    const targetDataRef = useRef<ImageData | null>(null);

    // ПЕРФОРМАНС: Гибридный рендеринг для Zoom (Fast + High Quality)
    const isZoomingRef = useRef(false);
    const [, forceUpdate] = useState(0);
    const zoomTimeoutRef = useRef<number | null>(null);
    const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Логика панорамирования (Hand Tool)
    const isDraggingRef = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'hand') return;
        isDraggingRef.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        containerRef.current.scrollLeft -= dx;
        containerRef.current.scrollTop -= dy;
        
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    // 1. Дефолтное состояние и очистка при смене файла
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Если файла нет, возвращаем стандартный размер 800x600
            if (!file) {
                canvas.width = 800;
                canvas.height = 600;
            }
            
            // Мгновенно очищаем холст и сбрасываем кэши при смене файла
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            hasBeenFilteredRef.current = false;
            targetDataRef.current = null;
            sourceCanvasRef.current = null;
        }
    }, [file]);

    // 2. Логика загрузки (Оптимизировано: URL.createObjectURL + Direct Canvas Access)
    useEffect(() => {
        if (!file || !canvasRef.current) return;

        const extension = file.name.split('.').pop()?.toLowerCase();
        let isCancelled = false;

        if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                if (isCancelled) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }

                const canvas = canvasRef.current;
                if (!canvas) return;

                // Рисуем на главный холст мгновенно
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                }
                hasBeenFilteredRef.current = false;

                // Считываем данные напрямую с главного холста (экономим ОЗУ)
                setTimeout(() => {
                    if (isCancelled) return;
                    
                    const mainCanvas = canvasRef.current;
                    if (!mainCanvas) return;
                    const mainCtx = mainCanvas.getContext('2d');
                    if (!mainCtx) return;

                    const loadedData = mainCtx.getImageData(0, 0, img.width, img.height);
                    targetDataRef.current = new ImageData(img.width, img.height);

                    const isJpeg = extension === 'jpg' || extension === 'jpeg';
                    
                    // УМНАЯ ПРОВЕРКА АЛЬФЫ
                    let hasRealAlpha = false;
                    if (!isJpeg) {
                        const data = loadedData.data;
                        for (let i = 3; i < data.length; i += 4) {
                            if (data[i] < 255) {
                                hasRealAlpha = true;
                                break;
                            }
                        }
                    }

                    onImageLoaded({ 
                        width: img.width, 
                        height: img.height, 
                        colorDepth: isJpeg ? 24 : 32,
                        hasAlpha: hasRealAlpha
                    }, loadedData);

                    // Очистка памяти
                    img.onload = null;
                    img.onerror = null;
                    img.src = ''; 
                    URL.revokeObjectURL(objectUrl);
                }, 10);
            };

            img.src = objectUrl;

        } else if (extension === 'gb7') {
            file.arrayBuffer().then((buffer) => {
                if (isCancelled) return;
                const result = decodeGB7(buffer);
                if (!result) {
                    alert("Ошибка: не удалось прочитать файл формата GB7.");
                    return;
                }
                
                targetDataRef.current = new ImageData(result.width, result.height);
                hasBeenFilteredRef.current = false;

                // МГНОВЕННАЯ ОТРИСОВКА
                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.width = result.width;
                    canvas.height = result.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.putImageData(result.imageData, 0, 0);
                }

                onImageLoaded({ 
                    width: result.width, 
                    height: result.height, 
                    colorDepth: result.colorDepth,
                    hasAlpha: result.colorDepth === 8
                }, result.imageData);
            });
        }

        return () => {
            isCancelled = true;
        };

    }, [file, onImageLoaded]);

    // 2.1 Логика отслеживания Zoom-активности
    useEffect(() => {
        isZoomingRef.current = true;
        if (zoomTimeoutRef.current) window.clearTimeout(zoomTimeoutRef.current);
        
        zoomTimeoutRef.current = window.setTimeout(() => {
            isZoomingRef.current = false;
            zoomTimeoutRef.current = null;
            forceUpdate(v => v + 1); 
        }, 150);
        
        return () => {
            if (zoomTimeoutRef.current) window.clearTimeout(zoomTimeoutRef.current);
        };
    }, [viewScale]);

    // 3. Логика отрисовки при изменении (Оптимизировано + Лаба 4 Интерполяция + Фикс Resize)
    useEffect(() => {
        // ВАЖНО: Если imageData отсутствует (идет загрузка нового файла), выходим.
        // Это предотвращает наложение старой картинки на новый холст.
        if (!imageData || !canvasRef.current || !imageMeta) return;

        // ФИКС РЕСАЙЗА: Если буфер не совпадает с размером картинки — пересоздаем его
        if (!targetDataRef.current || targetDataRef.current.width !== imageData.width || targetDataRef.current.height !== imageData.height) {
            targetDataRef.current = new ImageData(imageData.width, imageData.height);
            sourceCanvasRef.current = null;
        }

        const isGrayscale = imageMeta.colorDepth === 7 || imageMeta.colorDepth === 8;
        const isDefaultChannels = isGrayscale 
            ? (activeChannels.r && activeChannels.a) 
            : (activeChannels.r && activeChannels.g && activeChannels.b && activeChannels.a);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ЭТАП А: Применяем фильтры (Уровни, Каналы, Свертка)
        let finalOriginalData: ImageData;
        if (!levelsLUTs && isDefaultChannels && !previewFilter) {
            finalOriginalData = imageData;
        } else {
            const lutsTyped = levelsLUTs as { r: Uint8Array, g: Uint8Array, b: Uint8Array, a: Uint8Array };
            finalOriginalData = applyImageFilters(
                imageData, 
                activeChannels, 
                isGrayscale,
                lutsTyped,
                targetDataRef.current!
            );

            if (previewFilter) {
                finalOriginalData = applyConvolution(
                    finalOriginalData, 
                    previewFilter.kernel, 
                    previewFilter.strategy, 
                    previewFilter.channels,
                    isGrayscale
                );
            }
        }

        // ПЕРФОРМАНС: Обновляем кэш-холст для быстрого зума
        if (!sourceCanvasRef.current) {
            sourceCanvasRef.current = document.createElement('canvas');
            sourceCanvasRef.current.width = imageData.width;
            sourceCanvasRef.current.height = imageData.height;
        }
        const sCtx = sourceCanvasRef.current.getContext('2d', { alpha: true });
        if (sCtx) {
            sCtx.putImageData(finalOriginalData, 0, 0);
        }

        // ЭТАП Б: Масштабируем результат для отображения (Лабораторная 4)
        const targetWidth = Math.max(1, Math.round(imageData.width * viewScale));
        const targetHeight = Math.max(1, Math.round(imageData.height * viewScale));

        // ПРОВЕРКА: Если текущий размер холста не совпадает с расчетным — обновляем.
        // Браузер очистит холст автоматически при смене width/height.
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        // ГИБРИДНЫЙ РЕНДЕРИНГ: 
        if (isZoomingRef.current && viewScale !== 1) {
            ctx.imageSmoothingEnabled = interpolationMethod === 'bilinear';
            ctx.drawImage(sourceCanvasRef.current, 0, 0, targetWidth, targetHeight);
        } else if (viewScale === 1) {
            ctx.putImageData(finalOriginalData, 0, 0);
        } else {
            const scaledData = ScalingProvider.scale(
                finalOriginalData, 
                targetWidth, 
                targetHeight, 
                interpolationMethod
            );
            ctx.putImageData(scaledData, 0, 0);
        }
        
        hasBeenFilteredRef.current = true;
    }, [imageData, activeChannels, imageMeta, levelsLUTs, viewScale, interpolationMethod, previewFilter]);

    // 4. Логика пипетки
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'eyedropper' || !imageData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

        const x = Math.floor(canvasX / viewScale);
        const y = Math.floor(canvasY / viewScale);

        if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
            const idx = (y * imageData.width + x) * 4;
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            const lab = rgbToLab(r, g, b);
            onColorPicked({ x, y, r, g, b, lab });
        }
    };

    return (
        <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full bg-editor-bg flex overflow-auto p-12 no-scrollbar"
        >
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`shadow-2xl border border-editor-border bg-checkerboard m-auto ${activeTool === 'eyedropper' ? 'cursor-crosshair' : activeTool === 'hand' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                style={{
                    display: 'block',
                    flexShrink: 0
                }}
            />
        </div>
    );
}
