import { useEffect, useRef } from 'react';
import { decodeGB7 } from '../utils/gb7Codec';
import { rgbToLab, applyImageFilters } from '../utils/imageUtils';
import { ScalingProvider, type InterpolationMethod } from '../utils/interpolation';
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
}

export function Workspace({ 
    file, onImageLoaded, activeChannels, activeTool, onColorPicked, 
    imageMeta, levelsLUTs, imageData, viewScale, interpolationMethod 
}: WorkspaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasBeenFilteredRef = useRef<boolean>(false);
    
    // ПЕРФОРМАНС: Буферы для результирующих данных (Zero-Allocation)
    const targetDataRef = useRef<ImageData | null>(null);

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

    // 1. Дефолтное состояние без файла
    useEffect(() => {
        if (!file && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = 800;
            canvas.height = 600;
            hasBeenFilteredRef.current = false;
            targetDataRef.current = null;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
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

    // 3. Логика отрисовки при изменении (Оптимизировано + Лаба 5 Интерполяция)
    useEffect(() => {
        if (!imageData || !canvasRef.current || !targetDataRef.current) return;

        const isGrayscale = imageMeta?.colorDepth === 7 || imageMeta?.colorDepth === 8;
        const isDefaultChannels = isGrayscale 
            ? (activeChannels.r && activeChannels.a) 
            : (activeChannels.r && activeChannels.g && activeChannels.b && activeChannels.a);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ЭТАП А: Применяем фильтры (Уровни, Каналы) в оригинальном разрешении
        let finalOriginalData: ImageData;
        if (!levelsLUTs && isDefaultChannels) {
            finalOriginalData = imageData;
        } else {
            finalOriginalData = applyImageFilters(
                imageData, 
                activeChannels, 
                isGrayscale,
                levelsLUTs as any,
                targetDataRef.current!
            );
        }

        // ЭТАП Б: Масштабируем результат для отображения (Лабораторная 5)
        const targetWidth = Math.max(1, Math.round(imageData.width * viewScale));
        const targetHeight = Math.max(1, Math.round(imageData.height * viewScale));

        // Выставляем размер холста под масштаб
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (viewScale === 1) {
            // Если масштаб 100%, просто выводим
            ctx.putImageData(finalOriginalData, 0, 0);
        } else {
            // Используем СОБСТВЕННУЮ реализацию интерполяции
            const scaledData = ScalingProvider.scale(
                finalOriginalData, 
                targetWidth, 
                targetHeight, 
                interpolationMethod
            );
            ctx.putImageData(scaledData, 0, 0);
        }
        
        hasBeenFilteredRef.current = true;
    }, [imageData, activeChannels, imageMeta, levelsLUTs, viewScale, interpolationMethod]);

    // 4. Логика пипетки
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'eyedropper' || !imageData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Масштабирование координат: экранные -> в пиксели холста (уже смасштабированного)
        const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Масштабирование координат: пиксели холста -> оригинальные пиксели изображения
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