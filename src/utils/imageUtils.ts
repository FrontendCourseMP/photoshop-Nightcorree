import type { ChannelState } from '../components/ChannelPanel';

/**
 * Применяет маску каналов к ImageData, возвращая новый объект ImageData.
 * Исходный объект не мутируется.
 */
export function applyChannels(original: ImageData, channels: ChannelState, isGrayscale: boolean): ImageData {
    const { width, height, data } = original;
    const filtered = new ImageData(width, height);
    const fData = filtered.data;

    // Проверяем, включена ли ТОЛЬКО альфа
    const onlyAlpha = channels.a && (isGrayscale ? !channels.r : (!channels.r && !channels.g && !channels.b));

    for (let i = 0; i < data.length; i += 4) {
        if (onlyAlpha) {
            // Режим маски прозрачности: 
            // Белый там, где непрозрачно, черный там, где прозрачно.
            const alphaValue = data[i + 3];
            fData[i] = alphaValue;
            fData[i + 1] = alphaValue;
            fData[i + 2] = alphaValue;
            fData[i + 3] = 255;
        } else {
            // Обычный режим фильтрации
            fData[i] = channels.r ? data[i] : 0;
            
            if (isGrayscale) {
                // Для ч/б изображений все каналы R,G,B одинаковы
                fData[i + 1] = channels.r ? data[i + 1] : 0;
                fData[i + 2] = channels.r ? data[i + 2] : 0;
            } else {
                fData[i + 1] = channels.g ? data[i + 1] : 0;
                fData[i + 2] = channels.b ? data[i + 2] : 0;
            }

            // Если альфа-канал выключен, делаем пиксель полностью непрозрачным (255),
            // чтобы "проявить" скрытые данные (как в Photoshop).
            // Если включен - оставляем оригинальную прозрачность.
            fData[i + 3] = channels.a ? data[i + 3] : 255;
        }
    }

    return filtered;
}

/**
 * Создает уменьшенную копию ImageData для превью.
 */
export function createThumbnail(original: ImageData, maxW: number = 100, maxH: number = 100): ImageData {
    const scale = Math.min(maxW / original.width, maxH / original.height, 1);
    const w = Math.floor(original.width * scale);
    const h = Math.floor(original.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = original.width;
    canvas.height = original.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;

    ctx.putImageData(original, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return original;

    outCtx.drawImage(canvas, 0, 0, w, h);
    return outCtx.getImageData(0, 0, w, h);
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

        pData[i] = value;
        pData[i + 1] = value;
        pData[i + 2] = value;
        pData[i + 3] = 255;
    }

    return preview;
}

/**
 * Конвертирует RGB в CIELAB.
 * Использует стандартный осветитель D65.
 */
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
    // 1. Нормализация и перевод в линейный RGB (sRGB -> XYZ)
    let nr = r / 255;
    let ng = g / 255;
    let nb = b / 255;

    nr = nr > 0.04045 ? Math.pow((nr + 0.055) / 1.055, 2.4) : nr / 12.92;
    ng = ng > 0.04045 ? Math.pow((ng + 0.055) / 1.055, 2.4) : ng / 12.92;
    nb = nb > 0.04045 ? Math.pow((nb + 0.055) / 1.055, 2.4) : nb / 12.92;

    nr *= 100;
    ng *= 100;
    nb *= 100;

    // 2. Linear RGB -> XYZ (D65)
    const x = nr * 0.4124 + ng * 0.3576 + nb * 0.1805;
    const y = nr * 0.2126 + ng * 0.7152 + nb * 0.0722;
    const z = nr * 0.0193 + ng * 0.1192 + nb * 0.9505;

    // 3. XYZ -> CIELAB
    // Точка белого D65: X=95.047, Y=100.0, Z=108.883
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const fx = f(x / xn);
    const fy = f(y / yn);
    const fz = f(z / zn);

    const l = 116 * fy - 16;
    const la = 500 * (fx - fy);
    const lb = 200 * (fy - fz);

    return { 
        l: Math.round(l * 100) / 100, 
        a: Math.round(la * 100) / 100, 
        b: Math.round(lb * 100) / 100 
    };
}
function f(t: number): number {
    return t > Math.pow(6 / 29, 3) ? Math.pow(t, 1 / 3) : (1 / 3) * Math.pow(29 / 6, 2) * t + 4 / 29;
}

/**
 * Рассчитывает гистограмму для указанного канала или композитную.
 * Возвращает массив частот.
 */
export function calculateHistogram(imageData: ImageData, channel: 'master' | 'r' | 'g' | 'b' | 'a', isGrayscale: boolean): number[] {
    const { data } = imageData;
    const maxVal = isGrayscale ? 128 : 256;
    const histogram = new Array(maxVal).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        let value = 0;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (channel === 'master') {
            if (isGrayscale) {
                value = r; // В GB7 r=g=b
            } else {
                // Формула светимости (luminance)
                value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            }
        } else if (channel === 'r') value = r;
        else if (channel === 'g') value = g;
        else if (channel === 'b') value = b;
        else if (channel === 'a') value = a;

        // Коррекция для GB7 (если данные в 0-255, а нам нужно 0-127)
        // Но наш декодер GB7 уже возвращает данные в 0-255 (gray8).
        // Однако в задании сказано про 0-127. 
        // Если изображение GB7, то мы будем использовать 128 корзин, 
        // но значения у нас 0-255. Значит делим на 2.
        if (isGrayscale) {
            histogram[Math.min(127, Math.floor(value / 2))]++;
        } else {
            histogram[Math.min(255, value)]++;
        }
    }

    return histogram;
}
