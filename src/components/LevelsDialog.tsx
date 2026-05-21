import { useEffect, useRef, useState, useMemo } from 'react';
import { calculateHistogram } from '../utils/imageUtils';

interface LevelsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: () => void;
    originalImageData: ImageData | null;
    isGrayscale: boolean;
}

type LevelsChannel = 'master' | 'r' | 'g' | 'b' | 'a';

export function LevelsDialog({ isOpen, onClose, onApply, originalImageData, isGrayscale }: LevelsDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [selectedChannel, setSelectedChannel] = useState<LevelsChannel>('master');
    const [isLogarithmic, setIsLogarithmic] = useState(false);

    // Управление диалогом через нативный API
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        
        if (isOpen) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }, [isOpen]);

    // Расчет гистограммы
    const histogramData = useMemo(() => {
        if (!originalImageData) return [];
        return calculateHistogram(originalImageData, selectedChannel, isGrayscale);
    }, [originalImageData, selectedChannel, isGrayscale]);

    // Отрисовка гистограммы на канвасе
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || histogramData.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const maxCount = Math.max(...histogramData);
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#666';
        
        const barWidth = width / histogramData.length;
        
        for (let i = 0; i < histogramData.length; i++) {
            const count = histogramData[i];
            let barHeight = 0;
            
            if (count > 0) {
                if (isLogarithmic) {
                    barHeight = (Math.log(count) / Math.log(maxCount)) * height;
                } else {
                    barHeight = (count / maxCount) * height;
                }
            }
            
            ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
    }, [histogramData, isLogarithmic]);

    return (
        <dialog 
            ref={dialogRef}
            className="bg-editor-panel text-editor-text border border-editor-border rounded-lg shadow-2xl p-0 backdrop:bg-black/50 overflow-hidden"
            onClose={onClose}
        >
            <div className="w-[500px] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-editor-border flex justify-between items-center bg-white/5">
                    <h2 className="font-bold text-sm uppercase tracking-wider">Уровни (Levels)</h2>
                    <button onClick={onClose} className="text-editor-text/50 hover:text-white">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6">
                    {/* Channel Selector */}
                    <div className="flex items-center gap-4">
                        <label className="text-xs opacity-70">Канал:</label>
                        <select 
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value as LevelsChannel)}
                            className="bg-black/40 border border-editor-border rounded px-2 py-1 text-xs outline-none"
                        >
                            <option value="master">{isGrayscale ? 'Композитный (Gray)' : 'Композитный (RGB)'}</option>
                            <option value="r">{isGrayscale ? 'Серый (Gray)' : 'Красный (Red)'}</option>
                            {!isGrayscale && <option value="g">Зеленый (Green)</option>}
                            {!isGrayscale && <option value="b">Синий (Blue)</option>}
                            <option value="a">Альфа (Alpha)</option>
                        </select>

                        <div className="ml-auto flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="logScale"
                                checked={isLogarithmic}
                                onChange={(e) => setIsLogarithmic(e.target.checked)}
                            />
                            <label htmlFor="logScale" className="text-xs cursor-pointer select-none">Логарифмическая шкала</label>
                        </div>
                    </div>

                    {/* Histogram Canvas Container */}
                    <div className="relative bg-black/40 border border-editor-border rounded p-2 overflow-hidden">
                        <canvas 
                            ref={canvasRef} 
                            width={400} 
                            height={200} 
                            className="w-full h-[200px]"
                        />
                    </div>

                    {/* Placeholder for Sliders (Part 2) */}
                    <div className="h-20 flex items-center justify-center border border-dashed border-editor-border rounded opacity-30 text-[10px] uppercase">
                        Слайдеры уровней будут здесь (Часть 2)
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 border-t border-editor-border flex gap-3 justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-xs rounded hover:bg-white/5 transition-colors"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={() => {}} // Reset (Part 2)
                        className="px-4 py-2 text-xs rounded border border-editor-border hover:bg-white/5 transition-colors"
                    >
                        Сбросить
                    </button>
                    <button 
                        onClick={onApply}
                        className="px-6 py-2 text-xs rounded bg-editor-accent text-white font-bold hover:brightness-110 transition-all"
                    >
                        Применить
                    </button>
                </div>
            </div>
        </dialog>
    );
}