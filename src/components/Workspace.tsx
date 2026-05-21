import { useEffect, useRef, useState } from 'react';
import { decodeGB7 } from '../utils/gb7Codec';
import { applyChannels, rgbToLab } from '../utils/imageUtils';
import type { ChannelState } from './ChannelPanel';
import type { EditorTool } from './Toolbar';
import type { ColorInfo } from '../App';

export interface ImageMeta {
    width: number;
    height: number;
    colorDepth: number;
}

interface WorkspaceProps {
    file: File | null;
    onImageLoaded: (meta: ImageMeta, imageData: ImageData) => void;
    activeChannels: ChannelState;
    activeTool: EditorTool;
    onColorPicked: (info: ColorInfo) => void;
    imageMeta: ImageMeta | null;
}

export function Workspace({ file, onImageLoaded, activeChannels, activeTool, onColorPicked, imageMeta }: WorkspaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);

    // 1. Дефолтное состояние без файла
    useEffect(() => {
        if (!file && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = 800;
            canvas.height = 600;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            setOriginalImageData(null);
        }
    }, [file]);

    // 2. Логика загрузки
    useEffect(() => {
        if (!file || !canvasRef.current) return;

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);

                    const isJpeg = extension === 'jpg' || extension === 'jpeg';
                    const depth = isJpeg ? 24 : 32;

                    setOriginalImageData(imageData);
                    onImageLoaded({ 
                        width: img.width, 
                        height: img.height, 
                        colorDepth: depth 
                    }, imageData);
                };
                img.src = e.target?.result as string;
            };

            reader.readAsDataURL(file);
        } else if (extension === 'gb7') {
            file.arrayBuffer().then((buffer) => {
                const result = decodeGB7(buffer);
                
                if (!result) {
                    alert("Ошибка: не удалось прочитать файл формата GB7.");
                    return;
                }

                setOriginalImageData(result.imageData);
                onImageLoaded({ 
                    width: result.width, 
                    height: result.height, 
                    colorDepth: result.colorDepth 
                }, result.imageData);
            }).catch(err => {
                console.error("Ошибка при чтении файла:", err);
            });
        }

    }, [file, onImageLoaded]);

    // 3. Логика отрисовки при изменении каналов или оригинальных данных
    useEffect(() => {
        if (!originalImageData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = originalImageData.width;
        canvas.height = originalImageData.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            const isGrayscale = imageMeta?.colorDepth === 7 || imageMeta?.colorDepth === 8;
            const filteredData = applyChannels(originalImageData, activeChannels, isGrayscale);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.putImageData(filteredData, 0, 0);
        }
    }, [originalImageData, activeChannels, imageMeta]);

    // 4. Логика пипетки
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'eyedropper' || !originalImageData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Вычисляем масштаб (реальные пиксели / CSS пиксели)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Координаты клика относительно начала холста
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        // Проверка границ (на всякий случай)
        if (x >= 0 && x < originalImageData.width && y >= 0 && y < originalImageData.height) {
            const idx = (y * originalImageData.width + x) * 4;
            const r = originalImageData.data[idx];
            const g = originalImageData.data[idx + 1];
            const b = originalImageData.data[idx + 2];
            
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