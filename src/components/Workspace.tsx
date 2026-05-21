import { useEffect, useRef } from 'react';
import { decodeGB7 } from '../utils/gb7Codec'; // <-- Импортируем наш декодер

export interface ImageMeta {
    width: number;
    height: number;
    colorDepth: number;
}

interface WorkspaceProps {
    file: File | null;
    onImageLoaded: (meta: ImageMeta) => void;
}

export function Workspace({ file, onImageLoaded }: WorkspaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
                    const canvas = canvasRef.current;
                    if (!canvas) return;

                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, img.width, img.height);
                        ctx.drawImage(img, 0, 0);
                    }

                    const isJpeg = extension === 'jpg' || extension === 'jpeg';
                    const depth = isJpeg ? 24 : 32;

                    onImageLoaded({ 
                        width: img.width, 
                        height: img.height, 
                        colorDepth: depth 
                    });
                };
                img.src = e.target?.result as string;
            };

            reader.readAsDataURL(file);
        } else if (extension === 'gb7') {
            // Новая логика для формата GB7
            file.arrayBuffer().then((buffer) => {
                const result = decodeGB7(buffer);
                
                if (!result) {
                    alert("Ошибка: не удалось прочитать файл формата GB7.");
                    return;
                }

                const canvas = canvasRef.current;
                if (!canvas) return;

                // Устанавливаем размеры из декодированных данных
                canvas.width = result.width;
                canvas.height = result.height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.putImageData(result.imageData, 0, 0);
                }

                onImageLoaded({ 
                    width: result.width, 
                    height: result.height, 
                    colorDepth: result.colorDepth 
                });
            }).catch(err => {
                console.error("Ошибка при чтении файла:", err);
            });
        }

    }, [file, onImageLoaded]);

    return (
        <div className="w-full h-full bg-editor-bg flex items-center justify-center overflow-hidden">
            <canvas
                ref={canvasRef}
                className="shadow-2xl border border-editor-border bg-checkerboard"
                style={{
                    maxWidth: 'calc(100% - 96px)',
                    maxHeight: 'calc(100% - 96px)',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
}