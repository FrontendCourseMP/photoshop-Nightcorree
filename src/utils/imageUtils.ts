import type { ChannelState } from '../components/ChannelPanel';

/**
 * Применяет уровни и маску каналов за один проход.
 * Оптимизировано для больших изображений (Zero-Allocation паттерн).
 * @param targetData Результирующий буфер, в который записываются данные (для исключения аллокаций памяти).
 */
export function applyImageFilters(
    original: ImageData,
    channels: ChannelState,
    isGrayscale: boolean,
    luts: { r: Uint8Array, g: Uint8Array, b: Uint8Array, a: Uint8Array } | null,
    targetData: ImageData
): ImageData {
    const { data: iData } = original;
    const oData = targetData.data;

    const onlyAlpha = channels.a && (isGrayscale ? !channels.r : (!channels.r && !channels.g && !channels.b));

    const lutR = luts?.r;
    const lutG = luts?.g;
    const lutB = luts?.b;
    const lutA = luts?.a;

    for (let i = 0; i < iData.length; i += 4) {
        if (onlyAlpha) {
            let a = iData[i + 3];
            if (lutA) a = lutA[a];
            oData[i] = a;
            oData[i + 1] = a;
            oData[i + 2] = a;
            oData[i + 3] = 255;
            continue;
        }

        let r = iData[i];
        let g = iData[i + 1];
        let b = iData[i + 2];
        let a = iData[i + 3];

        if (luts) {
            if (isGrayscale) {
                const idx = lutR!.length === 128 ? Math.min(127, Math.floor(r / 2)) : r;
                r = lutR!.length === 128 ? lutR![idx] * 2 : lutR![idx];
                g = r; b = r;
            } else {
                r = lutR![r];
                g = lutG![g];
                b = lutB![b];
            }
            a = lutA![a];
        }

        oData[i] = channels.r ? r : 0;
        if (isGrayscale) {
            oData[i + 1] = channels.r ? r : 0;
            oData[i + 2] = channels.r ? r : 0;
        } else {
            oData[i + 1] = channels.g ? g : 0;
            oData[i + 2] = channels.b ? b : 0;
        }
        oData[i + 3] = channels.a ? a : 255;
    }

    return targetData;
}

/**
 * Создает уменьшенную копию ImageData для превью.
 * Оптимизированный алгоритм ближайшего соседа (Nearest Neighbor),
 * гарантирующий сохранение raw-данных каналов даже при A=0.
 */
export function createThumbnail(original: ImageData, maxW: number = 100, maxH: number = 100): ImageData {
    const scale = Math.min(maxW / original.width, maxH / original.height, 1);
    const w = Math.max(1, Math.floor(original.width * scale));
    const h = Math.max(1, Math.floor(original.height * scale));

    const output = new ImageData(w, h);
    const oData = output.data;
    const iData = original.data;
    const iW = original.width;

    // Оптимизация: выносим расчеты индексов из вложенных циклов
    for (let y = 0; y < h; y++) {
        const srcY = Math.floor(y / scale);
        const srcRowOffset = srcY * iW * 4; // Смещение начала строки в исходных данных
        const dstRowOffset = y * w * 4;     // Смещение начала строки в целевых данных

        for (let x = 0; x < w; x++) {
            const srcX = Math.floor(x / scale);
            const srcIdx = srcRowOffset + (srcX * 4);
            const dstIdx = dstRowOffset + (x * 4);
            
            oData[dstIdx] = iData[srcIdx];
            oData[dstIdx + 1] = iData[srcIdx + 1];
            oData[dstIdx + 2] = iData[srcIdx + 2];
            oData[dstIdx + 3] = iData[srcIdx + 3];
        }
    }
    return output;
}

/**
 * Извлекает конкретный канал и возвращает ImageData в оттенках серого.
 */
export function getChannelPreview(thumbnail: ImageData, channel: keyof ChannelState): ImageData {
    const { width, height, data } = thumbnail;
    const preview = new ImageData(width, height);
    const pData = preview.data;
    for (let i = 0; i < data.length; i += 4) {
        let value = 0;
        if (channel === 'r') value = data[i];
        else if (channel === 'g') value = data[i + 1];
        else if (channel === 'b') value = data[i + 2];
        else if (channel === 'a') value = data[i + 3];
        pData[i] = value; pData[i + 1] = value; pData[i + 2] = value; pData[i + 3] = 255;
    }
    return preview;
}

/**
 * Конвертирует RGB в CIELAB.
 */
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
    let nr = r / 255; let ng = g / 255; let nb = b / 255;
    nr = nr > 0.04045 ? Math.pow((nr + 0.055) / 1.055, 2.4) : nr / 12.92;
    ng = ng > 0.04045 ? Math.pow((ng + 0.055) / 1.055, 2.4) : ng / 12.92;
    nb = nb > 0.04045 ? Math.pow((nb + 0.055) / 1.055, 2.4) : nb / 12.92;
    nr *= 100; ng *= 100; nb *= 100;
    const x = nr * 0.4124 + ng * 0.3576 + nb * 0.1805;
    const y = nr * 0.2126 + ng * 0.7152 + nb * 0.0722;
    const z = nr * 0.0193 + ng * 0.1192 + nb * 0.9505;
    const xn = 95.047; const yn = 100.000; const zn = 108.883;
    const fx = f(x / xn); const fy = f(y / yn); const fz = f(z / zn);
    const l = 116 * fy - 16; const la = 500 * (fx - fy); const lb = 200 * (fy - fz);
    return { l: Math.round(l * 100) / 100, a: Math.round(la * 100) / 100, b: Math.round(lb * 100) / 100 };
}

function f(t: number): number {
    return t > Math.pow(6 / 29, 3) ? Math.pow(t, 1 / 3) : (1 / 3) * Math.pow(29 / 6, 2) * t + 4 / 29;
}

/**
 * Генерирует таблицу подстановки (LUT) для коррекции уровней.
 */
export function generateLevelsLUT(black: number, white: number, gamma: number, max: number): Uint8Array {
    const lut = new Uint8Array(max + 1);
    const range = white - black;
    for (let i = 0; i <= max; i++) {
        if (i <= black) lut[i] = 0;
        else if (i >= white) lut[i] = max;
        else {
            const normalized = (i - black) / range;
            lut[i] = Math.round(Math.pow(normalized, 1 / gamma) * max);
        }
    }
    return lut;
}

/**
 * Рассчитывает гистограмму для указанного канала или композитную.
 */
export function calculateHistogram(imageData: ImageData, channel: 'master' | 'r' | 'g' | 'b' | 'a', isGrayscale: boolean): number[] {
    const { data } = imageData;
    const maxVal = isGrayscale ? 128 : 256;
    const histogram = new Array(maxVal).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        let value = 0;
        const r = data[i];
        if (channel === 'master') value = isGrayscale ? r : Math.round(0.299 * r + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        else if (channel === 'r') value = r;
        else if (channel === 'g') value = data[i + 1];
        else if (channel === 'b') value = data[i + 2];
        else if (channel === 'a') value = data[i + 3];
        if (isGrayscale) histogram[Math.min(127, Math.floor(value / 2))]++;
        else histogram[Math.min(255, value)]++;
    }
    return histogram;
}
