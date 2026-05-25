import type { ChannelState } from '../components/ChannelPanel';

export type EdgeStrategy = 'black' | 'white' | 'copy';

/**
 * Стандартные ядра для фильтров
 */
export const FILTER_PRESETS = {
    identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    gaussian: [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16],
    boxBlur: [1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9],
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
    activeChannels: ChannelState
): ImageData {
    const { width: w, height: h, data: srcData } = src;
    const dst = new ImageData(w, h);
    const dstData = dst.data;

    // Сумма коэффициентов ядра (для нормализации, если нужно)
    // Но в Custom фильтрах обычно используют сырые значения.
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;

            // Обрабатываем каждый цветовой канал (RGBA)
            for (let c = 0; c < 4; c++) {
                const isAlpha = c === 3;
                const channelKey = isAlpha ? 'a' : (c === 0 ? 'r' : (c === 1 ? 'g' : 'b'));
                
                // Если канал не активен для фильтрации, копируем оригинал
                if (!activeChannels[channelKey as keyof ChannelState]) {
                    dstData[idx + c] = srcData[idx + c];
                    continue;
                }

                let sum = 0;

                // Проход по ядру 3x3
                for (let ky = -1; y + ky <= y + 1; ky++) {
                    for (let kx = -1; x + kx <= x + 1; kx++) {
                        const iy = y + ky;
                        const ix = x + kx;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];

                        let pixelVal: number;

                        // Логика обработки краев
                        if (ix < 0 || ix >= w || iy < 0 || iy >= h) {
                            if (edgeStrategy === 'black') {
                                pixelVal = isAlpha ? 255 : 0;
                            } else if (edgeStrategy === 'white') {
                                pixelVal = 255;
                            } else { // copy
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
                
                // Ограничиваем диапазон 0-255
                dstData[idx + c] = Math.max(0, Math.min(255, sum));
            }
        }
    }

    return dst;
}
