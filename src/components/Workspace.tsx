import { useEffect, useRef } from 'react';
import { decodeGB7 } from '../utils/gb7Codec';
import { rgbToLab, applyImageFilters } from '../utils/imageUtils';
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
}

export function Workspace({ file, onImageLoaded, activeChannels, activeTool, onColorPicked, imageMeta, levelsLUTs, imageData }: WorkspaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hasBeenFilteredRef = useRef<boolean>(false);
    
    // ПЕРФОРМАНС: Буфер для результирующих данных (Zero-Allocation)
    const targetDataRef = useRef<ImageData | null>(null);

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
                    img.src = ''; // Явный намек GC на очистку декодированных данных
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

                // МГНОВЕННАЯ ОТРИСОВКА: Выводим на экран сразу после декодирования
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

    // 3. Логика отрисовки при изменении (Оптимизировано: предотвращение лишних перерисовок)
    useEffect(() => {
        if (!imageData || !canvasRef.current || !targetDataRef.current) return;

        const isGrayscale = imageMeta?.colorDepth === 7 || imageMeta?.colorDepth === 8;
        const isDefaultChannels = isGrayscale 
            ? (activeChannels.r && activeChannels.a) 
            : (activeChannels.r && activeChannels.g && activeChannels.b && activeChannels.a);

        // Если изменений нет
        if (!levelsLUTs && isDefaultChannels) {
            // Рисуем только если до этого были фильтры (сброс состояния)
            if (hasBeenFilteredRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Важно: не меняем canvas.width без нужды, чтобы не вызывать мерцание
                    ctx.putImageData(imageData, 0, 0);
                    hasBeenFilteredRef.current = false;
                }
            }
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Применяем фильтры в буфер
            const processedData = applyImageFilters(
                imageData, 
                activeChannels, 
                isGrayscale,
                levelsLUTs as any,
                targetDataRef.current!
            );
            
            ctx.putImageData(processedData, 0, 0);
            hasBeenFilteredRef.current = true;
        }
    }, [imageData, activeChannels, imageMeta, levelsLUTs]);

    // 4. Логика пипетки
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'eyedropper' || !imageData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

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
        <div className="w-full h-full bg-editor-bg flex items-center justify-center overflow-hidden p-12">
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`shadow-2xl border border-editor-border bg-checkerboard ${activeTool === 'eyedropper' ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
}