import { useEffect, useRef } from 'react';
import { getChannelPreview } from '../utils/imageUtils';

export interface ChannelState {
    r: boolean;
    g: boolean;
    b: boolean;
    a: boolean;
}

interface ChannelPanelProps {
    channels: ChannelState;
    onToggle: (channel: keyof ChannelState) => void;
    thumbnailImageData: ImageData | null;
    isGrayscale: boolean;
}

function ChannelThumbnail({ thumbnailData, channel }: { thumbnailData: ImageData | null, channel: keyof ChannelState }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!thumbnailData || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const previewData = getChannelPreview(thumbnailData, channel);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(previewData, 0, 0);
    }, [thumbnailData, channel]);

    return (
        <canvas 
            ref={canvasRef} 
            width={48} 
            height={48} 
            className="w-12 h-12 bg-black border border-editor-border shrink-0"
        />
    );
}

export function ChannelPanel({ channels, onToggle, thumbnailImageData, isGrayscale }: ChannelPanelProps) {
    const channelList: { id: keyof ChannelState; label: string; visible: boolean }[] = [
        { id: 'r', label: isGrayscale ? 'Серый (Gray)' : 'Красный (R)', visible: true },
        { id: 'g', label: 'Зеленый (G)', visible: !isGrayscale },
        { id: 'b', label: 'Синий (B)', visible: !isGrayscale },
        { id: 'a', label: 'Альфа (A)', visible: true },
    ];

    return (
        <div className="w-64 bg-editor-panel border-l border-editor-border flex flex-col h-full select-none">
            <div className="p-3 border-b border-editor-border font-bold text-xs uppercase tracking-wider text-editor-text/50">
                Каналы
            </div>
            <div className="flex-1 overflow-y-auto">
                {channelList.filter(c => c.visible).map(({ id, label }) => (
                    <div 
                        key={id}
                        onClick={() => onToggle(id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer border-b border-editor-border/30 hover:bg-white/5 transition-colors ${!channels[id] ? 'bg-black/20 text-editor-text/40' : ''}`}
                    >
                        <ChannelThumbnail thumbnailData={thumbnailImageData} channel={id} />
                        <span className="text-xs">{label}</span>
                        <div className="ml-auto">
                            <div className={`w-3 h-3 rounded-full border ${channels[id] ? 'bg-blue-500 border-blue-400' : 'bg-transparent border-editor-text/20'}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}