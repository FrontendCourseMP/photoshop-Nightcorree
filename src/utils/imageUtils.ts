import type { ChannelState } from '../components/ChannelPanel';

/**
 * Применяет маску каналов к ImageData, возвращая новый объект ImageData.
 * Исходный объект не мутируется.
 */
export function applyChannels(original: ImageData, channels: ChannelState): ImageData {
    const { width, height, data } = original;
    const filtered = new ImageData(new Uint8ClampedArray(data), width, height);
    const fData = filtered.data;

    for (let i = 0; i < fData.length; i += 4) {
        if (!channels.r) fData[i] = 0;
        if (!channels.g) fData[i + 1] = 0;
        if (!channels.b) fData[i + 2] = 0;
        if (!channels.a) fData[i + 3] = 0;
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
 * Теперь работает быстро, так как принимает уже уменьшенную копию.
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
