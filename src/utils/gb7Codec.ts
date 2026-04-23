export function decodeGB7(buffer: ArrayBuffer): ImageData | null {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 1. Проверяем сигнатуру: 0x47 (G), 0x42 (B), 0x37 (7), 0x1D
    if (bytes[0] !== 0x47 || bytes[1] !== 0x42 || bytes[2] !== 0x37 || bytes[3] !== 0x1D) {
        console.error("Неверная сигнатура файла GB7");
        return null;
    }

    // 2. Читаем версию и флаги
    const version = bytes[4];
    if (version !== 0x01) {
        console.error("Неподдерживаемая версия формата GB7");
        return null;
    }

    const flags = bytes[5];
    const hasMask = (flags & 0x01) === 1; // Проверяем 0-й бит флага маски

    // 3. Читаем ширину и высоту (Big-Endian, поэтому false во втором аргументе)
    const width = view.getUint16(6, false);
    const height = view.getUint16(8, false);

    // Смещение до данных (12 байт заголовка)
    const dataOffset = 12;
    const expectedLength = width * height;

    if (bytes.length < dataOffset + expectedLength) {
        console.error("Файл поврежден: недостаточно данных для изображения");
        return null;
    }

    // 4. Формируем массив пикселей для Canvas (ImageData требует 4 байта на пиксель: R, G, B, A)
    const imageData = new ImageData(width, height);
    const pixelData = bytes.subarray(dataOffset, dataOffset + expectedLength);

    for (let i = 0; i < expectedLength; i++) {
        const byte = pixelData[i];

        // Биты 6-0: значение оттенка серого (0 - 127)
        const gray7 = byte & 0x7F;
        // Переводим 7-битное значение в 8-битное (0 - 255) для отрисовки
        const gray8 = Math.round((gray7 / 127) * 255);

        let alpha = 255; // По умолчанию непрозрачный
        if (hasMask) {
            // Бит 7: маска прозрачности (1 - видим, 0 - прозрачен)
            const maskBit = (byte >> 7) & 0x01;
            alpha = maskBit === 1 ? 255 : 0;
        }

        const rgbaIndex = i * 4;
        imageData.data[rgbaIndex] = gray8;     // Red
        imageData.data[rgbaIndex + 1] = gray8; // Green
        imageData.data[rgbaIndex + 2] = gray8; // Blue
        imageData.data[rgbaIndex + 3] = alpha; // Alpha
    }

    return imageData;
}