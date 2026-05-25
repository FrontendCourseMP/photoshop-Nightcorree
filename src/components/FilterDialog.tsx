import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { FILTER_PRESETS, type EdgeStrategy } from '../utils/filters';
import type { ChannelState } from './ChannelPanel';

interface FilterDialogProps {
    onClose: () => void;
    onApply: (kernel: number[], edgeStrategy: EdgeStrategy, activeChannels: ChannelState) => void;
    onPreview: (kernel: number[] | null, edgeStrategy: EdgeStrategy, activeChannels: ChannelState) => void;
    isGrayscale: boolean;
}

export function FilterDialog({ onClose, onApply, onPreview, isGrayscale }: FilterDialogProps) {
    const [kernel, setKernel] = useState<number[]>(FILTER_PRESETS.identity);
    const [edgeStrategy, setEdgeStrategy] = useState<EdgeStrategy>('copy');
    const [activeChannels, setActiveChannels] = useState<ChannelState>({ r: true, g: true, b: true, a: false });
    const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
    const [selectedPreset, setSelectedPreset] = useState<string>('identity');

    // Синхронизация предпросмотра
    useEffect(() => {
        if (isPreviewEnabled) {
            onPreview(kernel, edgeStrategy, activeChannels);
        } else {
            onPreview(null, edgeStrategy, activeChannels);
        }
        return () => onPreview(null, edgeStrategy, activeChannels);
    }, [kernel, edgeStrategy, activeChannels, isPreviewEnabled, onPreview]);

    const handleKernelChange = (index: number, value: string) => {
        const num = parseFloat(value) || 0;
        const newKernel = [...kernel];
        newKernel[index] = num;
        setKernel(newKernel);
        setSelectedPreset('custom');
    };

    const applyPreset = (name: string) => {
        setSelectedPreset(name);
        if (name !== 'custom') {
            const presets = FILTER_PRESETS as Record<string, number[]>;
            setKernel(presets[name]);
        }
    };

    const toggleChannel = (ch: keyof ChannelState) => {
        setActiveChannels(prev => ({ ...prev, [ch]: !prev[ch] }));
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Фильтрация (Матрица свертки)">
            <div className="flex flex-col gap-6 w-[500px] font-sans">
                
                <div className="grid grid-cols-2 gap-8">
                    {/* Левая колонка: Матрица */}
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest block">Ядро свертки 3×3</label>
                        <div className="grid grid-cols-3 gap-2 bg-black/20 p-3 rounded-lg border border-editor-border">
                            {kernel.map((val, i) => (
                                <input
                                    key={i}
                                    type="number"
                                    step="0.1"
                                    value={val}
                                    onChange={(e) => handleKernelChange(i, e.target.value)}
                                    className="w-full bg-[#0d1117] border border-editor-border rounded p-2 text-center text-xs text-white outline-none focus:border-editor-accent font-mono transition-colors"
                                />
                            ))}
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest">Пресет</label>
                            <select 
                                value={selectedPreset}
                                onChange={(e) => applyPreset(e.target.value)}
                                className="w-full bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent cursor-pointer transition-colors"
                            >
                                <option value="identity">Тождественное отображение</option>
                                <option value="sharpen">Повышение резкости</option>
                                <option value="gaussian">Фильтр Гаусса (3×3)</option>
                                <option value="boxBlur">Прямоугольное размытие</option>
                                <option value="pruittX">Оператор Прюитта (X)</option>
                                <option value="pruittY">Оператор Прюитта (Y)</option>
                                <option value="custom">Пользовательское...</option>
                            </select>
                        </div>
                    </div>

                    {/* Правая колонка: Настройки */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest block">Применить к каналам</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['r', 'g', 'b', 'a'] as const).map(ch => {
                                    if (isGrayscale && (ch === 'g' || ch === 'b')) return null;
                                    const label = ch === 'r' ? (isGrayscale ? 'Серый' : 'Красный') : (ch === 'g' ? 'Зеленый' : (ch === 'b' ? 'Синий' : 'Альфа'));
                                    return (
                                        <label key={ch} className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={activeChannels[ch]} 
                                                onChange={() => toggleChannel(ch)}
                                                className="w-3.5 h-3.5 rounded accent-editor-accent"
                                            />
                                            <span className="text-[11px] font-bold text-editor-text/60 group-hover:text-white transition-colors">{label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-editor-text/40 tracking-widest block">Обработка краев</label>
                            <select 
                                value={edgeStrategy}
                                onChange={(e) => setEdgeStrategy(e.target.value as EdgeStrategy)}
                                className="w-full bg-[#0d1117] border border-editor-border rounded px-3 py-2 text-xs text-white outline-none focus:border-editor-accent cursor-pointer transition-colors"
                            >
                                <option value="copy">Копирование (Clamp)</option>
                                <option value="black">Заполнение черным</option>
                                <option value="white">Заполнение белым</option>
                            </select>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group pt-2">
                            <input 
                                type="checkbox" 
                                checked={isPreviewEnabled} 
                                onChange={(e) => setIsPreviewEnabled(e.target.checked)}
                                className="w-4 h-4 rounded accent-editor-accent"
                            />
                            <span className="text-xs font-bold text-editor-text/80 group-hover:text-white transition-colors">Предпросмотр</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-editor-border mt-2">
                    <button 
                        onClick={() => { setKernel(FILTER_PRESETS.identity); setSelectedPreset('identity'); }}
                        className="text-[10px] font-black uppercase tracking-widest text-editor-text/30 hover:text-editor-accent transition-colors"
                    >
                        Сбросить
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-1.5 text-[11px] font-bold rounded border border-editor-border hover:bg-white/5 transition-colors cursor-pointer text-editor-text/60"
                        >
                            ОТМЕНА
                        </button>
                        <button 
                            onClick={() => onApply(kernel, edgeStrategy, activeChannels)} 
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
