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
    hasAlpha: boolean;
}

function ChannelThumbnail({ thumbnailData, channel }: { thumbnailData: ImageData | null, channel: keyof ChannelState }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!thumbnailData || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const previewData = getChannelPreview(thumbnailData, channel);
        
        // Создаем временный холст для корректного центрирования через drawImage
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = previewData.width;
        tempCanvas.height = previewData.height;
        tempCanvas.getContext('2d')?.putImageData(previewData, 0, 0);

        const dx = (canvas.width - previewData.width) / 2;
        const dy = (canvas.height - previewData.height) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, dx, dy);
    }, [thumbnailData, channel]);

    return (
        <canvas 
            ref={canvasRef} 
            width={48} 
            height={48} 
            className="w-12 h-12 border border-editor-border shrink-0 bg-editor-panel"
        />
    );
}

export function ChannelPanel({ channels, onToggle, thumbnailImageData, isGrayscale, hasAlpha }: ChannelPanelProps) {
    const channelList = [
        { id: 'r' as const, label: isGrayscale ? 'Серый' : 'Красный (R)', visible: true },
        { id: 'g' as const, label: 'Зеленый (G)', visible: !isGrayscale },
        { id: 'b' as const, label: 'Синий (B)', visible: !isGrayscale },
        { id: 'a' as const, label: 'Альфа (A)', visible: hasAlpha },
    ];

    const visibleChannels = channelList.filter(c => c.visible);

    return (
        <div className="w-64 bg-editor-panel border-l border-editor-border flex flex-col h-full select-none">
            <div className="p-3 border-b border-editor-border font-bold text-xs uppercase tracking-wider text-editor-text/50">
                Каналы
            </div>
            <div className="flex-1 overflow-y-auto">
                {visibleChannels.map(({ id, label }) => (
                    <div 
                        key={id}
                        onClick={() => onToggle(id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer border-b border-editor-border/30 hover:bg-white/5 transition-colors ${!channels[id] ? 'bg-black/20 text-editor-text/40' : ''}`}
                    >
                        <ChannelThumbnail thumbnailData={thumbnailImageData} channel={id} />
                        <span className="text-xs">{label}</span>
                        <div className="ml-auto">
                            <div className={`w-3 h-3 rounded-full border ${channels[id] ? 'bg-editor-accent border-blue-400' : 'bg-transparent border-editor-text/20'}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}