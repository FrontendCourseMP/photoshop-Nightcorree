import { applyConvolution, type EdgeStrategy } from '../utils/filters';
import type { ChannelState } from '../components/ChannelPanel';

export interface FilterWorkerMessage {
    id: number;
    imageData: ImageData;
    kernel: number[];
    edgeStrategy: EdgeStrategy;
    activeChannels: ChannelState;
    isGrayscale: boolean;
}

export interface FilterWorkerResponse {
    id: number;
    imageData: ImageData;
}

self.onmessage = (e: MessageEvent<FilterWorkerMessage>) => {
    const { id, imageData, kernel, edgeStrategy, activeChannels, isGrayscale } = e.data;
    
    const result = applyConvolution(imageData, kernel, edgeStrategy, activeChannels, isGrayscale);
    
    // Передаем результат обратно, используя transferable objects для скорости
    self.postMessage({ id, imageData: result }, [result.data.buffer] as any);
};
