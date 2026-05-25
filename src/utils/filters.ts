import type { ChannelState } from '../components/ChannelPanel';

export type EdgeStrategy = 'black' | 'white' | 'copy';

/**
 * Стандартные ядра для фильтров согласно заданию
 */
export const FILTER_PRESETS = {
    identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    gaussian: [1, 2, 1, 2, 4, 2, 1, 2, 1], // Нормализуется на 16
    boxBlur: [1, 1, 1, 1, 1, 1, 1, 1, 1],   // Нормализуется на 9
    pruittX: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
    pruittY: [-1, -1, -1, 0, 0, 0, 1, 1, 1]
};

/**
 * Применяет свертку к ImageData с использованием ядра 3x3.
 */
export function applyConvolution(
    src: ImageData,
    kernel: number[],
    edgeStrategy: EdgeStrategy,
    activeChannels: ChannelState,
    isGrayscale: boolean = false
): ImageData {
    const { width: w, height: h, data: srcData } = src;
    const dst = new ImageData(w, h);
    const dstData = dst.data;

    // Расчет суммы весов для нормализации
    let kernelSum = kernel.reduce((a, b) => a + b, 0);
    if (kernelSum === 0) kernelSum = 1; 
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;

            for (let c = 0; c < 4; c++) {
                const isAlpha = c === 3;
                
                // Определяем, нужно ли фильтровать этот канал
                let shouldFilter: boolean;
                if (isAlpha) {
                    shouldFilter = activeChannels.a;
                } else if (isGrayscale) {
                    // В Ч/Б режиме фильтруем любой из RGB, если активен 'r' (Серый)
                    shouldFilter = activeChannels.r;
                } else {
                    const channelKey = c === 0 ? 'r' : (c === 1 ? 'g' : 'b');
                    shouldFilter = activeChannels[channelKey as keyof ChannelState];
                }
                
                if (!shouldFilter) {
                    dstData[idx + c] = srcData[idx + c];
                    continue;
                }

                let sum = 0;

                // Проход по ядру 3x3
                for (let ky = -1; ky <= 1; ky++) {
                    const iy = y + ky;
                    for (let kx = -1; kx <= 1; kx++) {
                        const ix = x + kx;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];

                        let pixelVal: number;

                        // Логика обработки краев (Edge Handling)
                        if (ix < 0 || ix >= w || iy < 0 || iy >= h) {
                            if (edgeStrategy === 'black') {
                                pixelVal = isAlpha ? 255 : 0;
                            } else if (edgeStrategy === 'white') {
                                pixelVal = 255;
                            } else { // copy (clamp)
                                const cx = Math.max(0, Math.min(w - 1, ix));
                                const cy = Math.max(0, Math.min(h - 1, iy));
                                pixelVal = srcData[(cy * w + cx) * 4 + c];
                            }
                        } else {
                            pixelVal = srcData[(iy * w + ix) * 4 + c];
                        }

                        sum += pixelVal * weight;
                    }
                }
                
                dstData[idx + c] = Math.max(0, Math.min(255, sum / kernelSum));
            }
        }
    }

    return dst;
}
