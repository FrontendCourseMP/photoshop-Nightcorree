import { useEffect, useRef } from 'react';

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

    // 1. Устанавливаем дефолтный размер для пустого состояния
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

    // 2. Логика загрузки и отрисовки изображения
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

                    // Определяем глубину цвета на основе расширения
                    // Jpeg обычно 24-битный (без прозрачности), PNG - 32-битный (с прозрачностью)
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
            console.log('Формат GB7 скоро будет реализован!');
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