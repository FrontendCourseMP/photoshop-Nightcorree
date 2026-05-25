import { useState } from 'react';
import { Modal } from './Modal';
import { INTERPOLATION_INFO, type InterpolationMethod } from '../utils/interpolation';
import { Link2, Link2Off, Info, ArrowRightLeft } from 'lucide-react';

interface ResizeDialogProps {
    onClose: () => void;
    onApply: (width: number, height: number, method: InterpolationMethod) => void;
    currentWidth: number;
    currentHeight: number;
}

type ResizeUnit = 'pixels' | 'percent';

export function ResizeDialog({ onClose, onApply, currentWidth, currentHeight }: ResizeDialogProps) {
    const [unit, setUnit] = useState<ResizeUnit>('pixels');
    const [width, setWidth] = useState<number | ''>(currentWidth);
    const [height, setHeight] = useState<number | ''>(currentHeight);
    const [lockAspect, setLockAspect] = useState(true);
    const [method, setMethod] = useState<InterpolationMethod>('bilinear');
    const [error, setError] = useState<string | null>(null);

    const aspectRatio = currentWidth / currentHeight;

    const handleWidthChange = (val: string) => {
        if (val === '') {
            setWidth('');
            return;
        }
        const num = parseFloat(val);
        if (isNaN(num)) return;

        if (unit === 'pixels') {
            const w = Math.round(num);
            setWidth(w);
            if (lockAspect) setHeight(Math.round(w / aspectRatio));
        } else {
            const px = Math.round((num / 100) * currentWidth);
            setWidth(px);
            if (lockAspect) setHeight(Math.round(px / aspectRatio));
        }
    };

    const handleHeightChange = (val: string) => {
        if (val === '') {
            setHeight('');
            return;
        }
        const num = parseFloat(val);
        if (isNaN(num)) return;

        if (unit === 'pixels') {
            const h = Math.round(num);
            setHeight(h);
            if (lockAspect) setWidth(Math.round(h * aspectRatio));
        } else {
            const px = Math.round((num / 100) * currentHeight);
            setHeight(px);
            if (lockAspect) setWidth(Math.round(px * aspectRatio));
        }
    };

    const validate = () => {
        if (width === '' || height === '' || width <= 0 || height <= 0) return 'Размер должен быть больше нуля';
        if (width > 10000 || height > 10000) return 'Размер слишком велик (макс 10000px)';
        return null;
    };

    const handleApply = () => {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }
        onApply(width as number, height as number, method);
    };

    const getDisplayWidth = () => {
        if (width === '') return '';
        return unit === 'pixels' ? width : ((width / currentWidth) * 100).toFixed(0);
    };
    
    const getDisplayHeight = () => {
        if (height === '') return '';
        return unit === 'pixels' ? height : ((height / currentHeight) * 100).toFixed(0);
    };

    const beforeMP = ((currentWidth * currentHeight) / 1000000).toFixed(2);
    const afterMP = (width === '' || height === '') ? '0.00' : ((width * height) / 1000000).toFixed(2);

    return (
        <Modal isOpen={true} onClose={onClose} title="Масштабирование изображения">
            <div className="flex flex-col gap-6 w-[480px] font-sans">
                
                <div className="flex items-center justify-between px-4 py-2 bg-black/40 border border-editor-border rounded-lg text-[10px] uppercase font-bold tracking-wider">
                   <div className="flex items-center gap-2">
                        <span className="opacity-30">Исходный:</span>
                        <span className="text-white/60">{currentWidth}×{currentHeight}</span>
                        <span className="text-editor-accent/50">({beforeMP} MP)</span>
                   </div>
                   <ArrowRightLeft size={12} className="opacity-20" />
                   <div className="flex items-center gap-2">
                        <span className="opacity-30">Новый:</span>
                        <span className="text-editor-accent">{width === '' ? '?' : width}×{height === '' ? '?' : height}</span>
                        <span className="text-editor-accent/80">({afterMP} MP)</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest">Ширина</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={getDisplayWidth()}
                                    onChange={(e) => handleWidthChange(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent font-mono transition-colors"
                                />
                                <span className="text-[9px] opacity-20 font-bold w-4">{unit === 'pixels' ? 'PX' : '%'}</span>
                            </div>
                        </div>

                        <div className="flex justify-center -my-2 relative z-10">
                            <button 
                                onClick={() => setLockAspect(!lockAspect)}
                                className={`p-1.5 rounded-full border transition-all ${lockAspect ? 'bg-editor-accent/10 border-editor-accent text-editor-accent shadow-[0_0_10px_rgba(0,122,204,0.2)]' : 'bg-white/5 border-white/10 text-white/20'}`}
                                title="Связать пропорции"
                            >
                                {lockAspect ? <Link2 size={14} /> : <Link2Off size={14} />}
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest">Высота</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={getDisplayHeight()}
                                    onChange={(e) => handleHeightChange(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent font-mono transition-colors"
                                />
                                <span className="text-[9px] opacity-20 font-bold w-4">{unit === 'pixels' ? 'PX' : '%'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest">Единицы</label>
                            <select 
                                value={unit} 
                                onChange={(e) => setUnit(e.target.value as ResizeUnit)}
                                className="w-full bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent cursor-pointer transition-colors"
                            >
                                <option value="pixels" className="bg-editor-panel">Пиксели</option>
                                <option value="percent" className="bg-editor-panel">Проценты</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest">Интерполяция</label>
                                <div className="group relative">
                                    <Info size={12} className="text-editor-accent/40 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-editor-panel border border-editor-border rounded shadow-2xl text-[9px] leading-tight text-editor-text opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 italic">
                                        {INTERPOLATION_INFO[method].description} {INTERPOLATION_INFO[method].advantages}
                                    </div>
                                </div>
                            </div>
                            <select 
                                value={method} 
                                onChange={(e) => setMethod(e.target.value as InterpolationMethod)}
                                className="w-full bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent cursor-pointer transition-colors"
                            >
                                <option value="bilinear" className="bg-editor-panel">Билинейная</option>
                                <option value="nearest" className="bg-editor-panel">По соседям</option>
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="text-red-400 text-[10px] bg-red-400/5 p-2 rounded border border-red-400/20 text-center font-bold uppercase tracking-tighter">
                        {error}
                    </div>
                )}

                <div className="flex justify-end items-center pt-4 border-t border-editor-border mt-2">
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-1.5 text-[11px] font-bold rounded border border-editor-border hover:bg-white/5 transition-colors cursor-pointer text-editor-text/60"
                        >
                            ОТМЕНА
                        </button>
                        <button 
                            onClick={handleApply} 
                            className="px-8 py-1.5 text-[11px] rounded bg-editor-accent text-white font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-editor-accent/20 transition-all cursor-pointer"
                        >
                            ПРИМЕНИТЬ
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
