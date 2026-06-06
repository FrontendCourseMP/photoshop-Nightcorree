import type { FilterWorkerMessage, FilterWorkerResponse } from '../workers/filter.worker';
import type { EdgeStrategy } from './filters';
import type { ChannelState } from '../components/ChannelPanel';

class FilterWorkerManager {
    private worker: Worker | null = null;
    private currentRequestId: number = 0;
    private lastFinishedId: number = 0;
    private resolveMap: Map<number, (data: ImageData) => void> = new Map();

    private getWorker() {
        if (!this.worker) {
            this.worker = new Worker(new URL('../workers/filter.worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = (e: MessageEvent<FilterWorkerResponse>) => {
                const { id, imageData } = e.data;
                if (id > this.lastFinishedId) {
                    this.lastFinishedId = id;
                }
                const resolve = this.resolveMap.get(id);
                if (resolve) {
                    resolve(imageData);
                    // Очищаем все предыдущие ожидающие промисы, так как их результат уже не актуален
                    for (const key of this.resolveMap.keys()) {
                        if (key <= id) this.resolveMap.delete(key);
                    }
                }
            };
        }
        return this.worker;
    }

    public applyConvolution(
        imageData: ImageData, 
        kernel: number[], 
        edgeStrategy: EdgeStrategy, 
        activeChannels: ChannelState, 
        isGrayscale: boolean
    ): Promise<ImageData> {
        const id = ++this.currentRequestId;
        const worker = this.getWorker();
        
        return new Promise((resolve) => {
            this.resolveMap.set(id, resolve);
            
            // Клонируем данные для передачи в воркер, чтобы не отключать основной буфер
            // Для превью это важно. Для финального применения можно было бы и перенести.
            const dataCopy = new Uint8ClampedArray(imageData.data);
            const copy = new ImageData(dataCopy, imageData.width, imageData.height);
            
            worker.postMessage({
                id,
                imageData: copy,
                kernel,
                edgeStrategy,
                activeChannels,
                isGrayscale
            }, [copy.data.buffer]);
        });
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.resolveMap.clear();
    }
}

export const filterWorkerManager = new FilterWorkerManager();
