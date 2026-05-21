import { useEffect, useRef, useState, useMemo } from 'react';
import { calculateHistogram, generateLevelsLUT } from '../utils/imageUtils';

interface LevelSettings {
    black: number;
    white: number;
    gamma: number;
}

interface LevelsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (luts: Record<string, Uint8Array>) => void;
    onPreview: (luts: Record<string, Uint8Array> | null) => void;
    originalImageData: ImageData | null;
    isGrayscale: boolean;
}

type LevelsChannel = 'master' | 'r' | 'g' | 'b' | 'a';

const DEFAULT_LEVELS: LevelSettings = { black: 0, white: 255, gamma: 1.0 };
const DEFAULT_LEVELS_GS: LevelSettings = { black: 0, white: 127, gamma: 1.0 };

export function LevelsDialog({ isOpen, onClose, onApply, onPreview, originalImageData, isGrayscale }: LevelsDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    
    const [selectedChannel, setSelectedChannel] = useState<LevelsChannel>('master');
    const [isLogarithmic, setIsLogarithmic] = useState(false);
    const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);

    // Логика перетаскивания (Dragging)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        const handleMouseMove = (moveEvent: MouseEvent) => {
            setPosition({ x: moveEvent.clientX - dragStartPos.current.x, y: moveEvent.clientY - dragStartPos.current.y });
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const initialSettings = useMemo(() => ({
        master: isGrayscale ? { ...DEFAULT_LEVELS_GS } : { ...DEFAULT_LEVELS },
        r: isGrayscale ? { ...DEFAULT_LEVELS_GS } : { ...DEFAULT_LEVELS },
        g: { ...DEFAULT_LEVELS },
        b: { ...DEFAULT_LEVELS },
        a: { ...DEFAULT_LEVELS }
    }), [isGrayscale]);

    const [settings, setSettings] = useState(initialSettings);
    const current = settings[selectedChannel];
    const maxVal = (selectedChannel === 'master' || selectedChannel === 'r') && isGrayscale ? 127 : 255;

    useEffect(() => {
        if (isOpen) setSettings(initialSettings);
    }, [isOpen, initialSettings]);

    const currentLUTs = useMemo(() => {
        const luts: Record<string, Uint8Array> = {};
        const channels: LevelsChannel[] = ['master', 'r', 'g', 'b', 'a'];
        channels.forEach(ch => {
            const s = settings[ch];
            const m = (ch === 'master' || ch === 'r') && isGrayscale ? 127 : 255;
            luts[ch] = generateLevelsLUT(s.black, s.white, s.gamma, m);
        });
        return {
            r: combineLUTs(luts.master, luts.r),
            g: isGrayscale ? luts.master : combineLUTs(luts.master, luts.g),
            b: isGrayscale ? luts.master : combineLUTs(luts.master, luts.b),
            a: luts.a
        };
    }, [settings, isGrayscale]);

    useEffect(() => {
        if (isOpen && isPreviewEnabled) onPreview(currentLUTs); else onPreview(null);
    }, [isOpen, isPreviewEnabled, currentLUTs, onPreview]);

    const handleLevelChange = (key: keyof LevelSettings, value: number) => {
        setSettings(prev => {
            const curr = prev[selectedChannel];
            let next = { ...curr, [key]: value };
            if (key === 'black' && next.black >= next.white) next.black = next.white - 1;
            if (key === 'white' && next.white <= next.black) next.white = next.black + 1;
            return { ...prev, [selectedChannel]: next };
        });
    };

    const handleReset = () => {
        setSettings(initialSettings);
    };

    const handleCancel = () => {
        onPreview(null);
        onClose();
    };

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isOpen) {
            dialog.show(); 
            setPosition({ x: (window.innerWidth - 520) / 2, y: 100 });
        } else {
            dialog.close();
        }
    }, [isOpen]);

    const histogramData = useMemo(() => {
        if (!isOpen || !originalImageData) return [];
        return calculateHistogram(originalImageData, selectedChannel, isGrayscale);
    }, [isOpen, originalImageData, selectedChannel, isGrayscale]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || histogramData.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { width, height } = canvas;
        const maxCount = Math.max(...histogramData);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#444c56';
        const barWidth = width / histogramData.length;
        for (let i = 0; i < histogramData.length; i++) {
            const count = histogramData[i];
            if (count <= 0) continue;
            const barHeight = isLogarithmic ? (Math.log(count) / Math.log(maxCount)) * height : (count / maxCount) * height;
            ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
    }, [histogramData, isLogarithmic]);

    const handleSliderMouseDown = (_e: React.MouseEvent, type: 'black' | 'white' | 'gamma') => {
        const track = sliderRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, currentX / rect.width));
            if (type === 'gamma') {
                const bRatio = current.black / maxVal;
                const wRatio = current.white / maxVal;
                const clampedRatio = Math.max(bRatio + 0.01, Math.min(wRatio - 0.01, ratio));
                const relativePos = (clampedRatio - bRatio) / (wRatio - bRatio);
                const newGamma = Math.pow(9.9, (0.5 - relativePos) * 2);
                handleLevelChange('gamma', Math.round(newGamma * 100) / 100);
            } else {
                let newVal = Math.round(ratio * maxVal);
                handleLevelChange(type, newVal);
            }
        };
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const gammaPosRatio = useMemo(() => {
        const b = current.black / maxVal;
        const w = current.white / maxVal;
        const relativePos = 0.5 - (Math.log(current.gamma) / (2 * Math.log(9.9)));
        const clampedRelative = Math.max(0.01, Math.min(0.99, relativePos));
        return b + clampedRelative * (w - b);
    }, [current.black, current.white, current.gamma, maxVal]);

    return (
        <dialog 
            ref={dialogRef}
            className={`fixed bg-editor-panel text-editor-text border border-editor-border rounded-lg shadow-2xl p-0 overflow-hidden outline-none select-none transition-opacity ${isDragging ? 'opacity-90' : 'opacity-100'}`}
            style={{ margin: 0, left: `${position.x}px`, top: `${position.y}px`, zIndex: 1000 }}
            onClose={handleCancel}
        >
            <div className="w-[520px] flex flex-col font-sans">
                <div onMouseDown={handleHeaderMouseDown} className={`p-4 flex justify-between items-center border-b border-editor-border bg-white/5 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
                    <h2 className="text-xs font-bold uppercase tracking-widest opacity-80 pointer-events-none">Коррекция уровней</h2>
                    <button onClick={handleCancel} className="text-editor-text/40 hover:text-white transition-colors cursor-pointer z-50">✕</button>
                </div>
                <div className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <label className="text-[10px] uppercase font-bold text-editor-text/60">Канал:</label>
                        <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value as LevelsChannel)} className="flex-1 bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent transition-colors cursor-pointer">
                            <option value="master" className="bg-editor-panel text-white">{isGrayscale ? 'Композитный (Серый)' : 'Композитный (RGB)'}</option>
                            <option value="r" className="bg-editor-panel text-white">{isGrayscale ? 'Серый' : 'Красный'}</option>
                            {!isGrayscale && <option value="g" className="bg-editor-panel text-white">Зеленый</option>}
                            {!isGrayscale && <option value="b" className="bg-editor-panel text-white">Синий</option>}
                            <option value="a" className="bg-editor-panel text-white">Альфа</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-0">
                        <div className="bg-black/40 border border-editor-border border-b-0 rounded-t-lg p-1 h-[180px]">
                            <canvas ref={canvasRef} width={470} height={170} className="w-full h-full opacity-90" />
                        </div>
                        <div ref={sliderRef} className="relative h-5 bg-gradient-to-r from-black to-white border border-editor-border border-t-0 shadow-inner">
                            <div onMouseDown={(e) => handleSliderMouseDown(e, 'black')} className="absolute top-full -translate-y-1/2 -translate-x-1/2 cursor-ew-resize z-10" style={{ left: `${(current.black / maxVal) * 100}%` }}>
                                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-black drop-shadow-md" />
                            </div>
                            <div onMouseDown={(e) => handleSliderMouseDown(e, 'white')} className="absolute top-full -translate-y-1/2 -translate-x-1/2 cursor-ew-resize z-10" style={{ left: `${(current.white / maxVal) * 100}%` }}>
                                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-white drop-shadow-md" />
                            </div>
                            <div onMouseDown={(e) => handleSliderMouseDown(e, 'gamma')} className="absolute top-full -translate-y-1/2 -translate-x-1/2 cursor-ew-resize z-20" style={{ left: `${gammaPosRatio * 100}%` }}>
                                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-editor-text/60 drop-shadow-md" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-8 px-1 text-[10px] font-bold text-editor-text/40 uppercase tracking-tighter">
                            <div className="flex flex-col items-center gap-1">
                                <span>Black</span>
                                <span className="text-editor-text text-sm font-mono">{current.black}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span>Mid</span>
                                <input type="number" step="0.01" min="0.1" max="9.9" value={current.gamma} onChange={(e) => handleLevelChange('gamma', parseFloat(e.target.value) || 1.0)} className="bg-black/20 border-b border-editor-accent/30 w-12 text-center text-editor-accent text-sm outline-none focus:border-editor-accent" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span>White</span>
                                <span className="text-editor-text text-sm font-mono">{current.white}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={isPreviewEnabled} onChange={(e) => setIsPreviewEnabled(e.target.checked)} className="w-4 h-4 rounded accent-editor-accent" />
                            <span className="text-xs group-hover:text-white transition-colors">Предпросмотр</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={isLogarithmic} onChange={(e) => setIsLogarithmic(e.target.checked)} className="w-4 h-4 rounded accent-editor-accent" />
                            <span className="text-xs group-hover:text-white transition-colors">Логарифм. гистограмма</span>
                        </label>
                    </div>
                </div>
                <div className="p-4 bg-black/20 border-t border-editor-border flex justify-between items-center">
                    <button onClick={handleReset} className="px-5 py-2 text-xs font-bold rounded border border-editor-border hover:bg-white/5 transition-colors cursor-pointer">Сбросить всё</button>
                    <div className="flex gap-3">
                        <button onClick={handleCancel} className="px-5 py-2 text-xs font-bold rounded hover:bg-white/5 transition-colors cursor-pointer">Отмена</button>
                        <button onClick={() => onApply(currentLUTs)} className="px-8 py-2 text-xs rounded bg-editor-accent text-white font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-editor-accent/20 transition-all cursor-pointer">Применить</button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}

function combineLUTs(master: Uint8Array, channel: Uint8Array): Uint8Array {
    const result = new Uint8Array(master.length);
    for (let i = 0; i < master.length; i++) {
        result[i] = channel[master[i]];
    }
    return result;
}