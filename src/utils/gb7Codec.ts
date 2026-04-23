// src/utils/gb7Codec.ts

/**
 * Декодер: из бинарных данных в ImageData
 */
export function decodeGB7(buffer: ArrayBuffer): ImageData | null {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Проверка сигнатуры
    if (bytes[0] !== 0x47 || bytes[1] !== 0x42 || bytes[2] !== 0x37 || bytes[3] !== 0x1D) return null;

    // Читаем версию и ПРОВЕРЯЕМ её (это исправит ошибку TypeScript)
    const version = bytes[4];
    if (version !== 0x01) {
        console.error("Неподдерживаемая версия формата GB7");
        return null;
    }

    const flags = bytes[5];
    const hasMask = (flags & 0x01) === 1;
    const width = view.getUint16(6, false);
    const height = view.getUint16(8, false);

    const imageData = new ImageData(width, height);
    const pixelData = bytes.subarray(12, 12 + width * height);

    for (let i = 0; i < pixelData.length; i++) {
        const byte = pixelData[i];
        const gray7 = byte & 0x7F;
        const gray8 = Math.round((gray7 / 127) * 255);
        let alpha = 255;
        if (hasMask) alpha = ((byte >> 7) & 0x01) === 1 ? 255 : 0;

        const idx = i * 4;
        imageData.data[idx] = gray8;
        imageData.data[idx + 1] = gray8;
        imageData.data[idx + 2] = gray8;
        imageData.data[idx + 3] = alpha;
    }
    return imageData;
}

/**
 * Кодер: из ImageData в бинарный формат GB7
 */
export function encodeGB7(imageData: ImageData): ArrayBuffer {
    const { width, height, data } = imageData;
    // Размер: 12 байт заголовок + W*H байт данных
    const buffer = new ArrayBuffer(12 + width * height);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 1. Заголовок
    bytes[0] = 0x47; // G
    bytes[1] = 0x42; // B
    bytes[2] = 0x37; // 7
    bytes[3] = 0x1D; // Разделитель
    bytes[4] = 0x01; // Версия
    bytes[5] = 0x01; // Флаг: всегда ставим 1 (маска присутствует), чтобы поддерживать прозрачность
    view.setUint16(6, width, false);  // Ширина (Big-Endian)
    view.setUint16(8, height, false); // Высота (Big-Endian)
    view.setUint16(10, 0, false);     // Резерв

    // 2. Данные изображения
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Считаем оттенки серого (0-255) и переводим в 7 бит (0-127)
        const gray8 = Math.round((r + g + b) / 3);
        const gray7 = Math.round((gray8 / 255) * 127);

        // Бит маски (Bit 7): 1 если непрозрачный, 0 если прозрачный
        const maskBit = a >= 128 ? 1 : 0;

        // Собираем байт: [Маска (1 бит)] [Серый (7 бит)]
        bytes[12 + i] = (maskBit << 7) | (gray7 & 0x7F);
    }

    return buffer;
}