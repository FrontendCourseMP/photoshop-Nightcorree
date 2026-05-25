/**
 * Типы поддерживаемых алгоритмов интерполяции
 */
export type InterpolationMethod = 'nearest' | 'bilinear';

export const INTERPOLATION_INFO: Record<InterpolationMethod, { label: string, description: string, advantages: string }> = {
    nearest: {
        label: 'Ближайший сосед',
        description: 'Выбирает цвет самого близкого пикселя из исходного изображения.',
        advantages: 'Самый быстрый метод. Сохраняет жесткие края и не вносит новых цветов. Идеален для Pixel Art.'
    },
    bilinear: {
        label: 'Билинейная',
        description: 'Вычисляет среднее значение цвета на основе 4-х соседних пикселей.',
        advantages: 'Обеспечивает плавные переходы и отсутствие ступенчатости. Лучший выбор для фотографий.'
    }
};

/**
 * Интерфейс для реализации алгоритмов масштабирования
 */
export interface ScalingAlgorithm {
    calculate(src: ImageData, targetWidth: number, targetHeight: number): ImageData;
}

/**
 * Метод ближайшего соседа (Nearest Neighbor)
 * Самый быстрый, но дает эффект "пикселизации" (ступенчатости) при увеличении.
 */
class NearestNeighborScaling implements ScalingAlgorithm {
    calculate(src: ImageData, targetWidth: number, targetHeight: number): ImageData {
        const dst = new ImageData(targetWidth, targetHeight);
        const srcData = src.data;
        const dstData = dst.data;
        const sw = src.width;
        const sh = src.height;

        const xRatio = sw / targetWidth;
        const yRatio = sh / targetHeight;

        for (let y = 0; y < targetHeight; y++) {
            const srcY = Math.floor(y * yRatio);
            const dstOffset = y * targetWidth * 4;
            const srcOffsetBase = srcY * sw * 4;

            for (let x = 0; x < targetWidth; x++) {
                const srcX = Math.floor(x * xRatio);
                const i = dstOffset + x * 4;
                const j = srcOffsetBase + srcX * 4;

                dstData[i] = srcData[j];
                dstData[i + 1] = srcData[j + 1];
                dstData[i + 2] = srcData[j + 2];
                dstData[i + 3] = srcData[j + 3];
            }
        }
        return dst;
    }
}

/**
 * Билинейная интерполяция (Bilinear Interpolation)
 * Обеспечивает плавные переходы цветов, усредняя значения 4-х соседних пикселей.
 */
class BilinearScaling implements ScalingAlgorithm {
    calculate(src: ImageData, targetWidth: number, targetHeight: number): ImageData {
        const dst = new ImageData(targetWidth, targetHeight);
        const srcData = src.data;
        const dstData = dst.data;
        const sw = src.width;
        const sh = src.height;

        const xRatio = (sw - 1) / targetWidth;
        const yRatio = (sh - 1) / targetHeight;

        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const xSrc = x * xRatio;
                const ySrc = y * yRatio;
                const xL = Math.floor(xSrc);
                const yL = Math.floor(ySrc);
                const xH = Math.ceil(xSrc);
                const yH = Math.ceil(ySrc);

                const xWeight = xSrc - xL;
                const yWeight = ySrc - yL;

                const i00 = (yL * sw + xL) * 4;
                const i01 = (yL * sw + xH) * 4;
                const i10 = (yH * sw + xL) * 4;
                const i11 = (yH * sw + xH) * 4;

                for (let c = 0; c < 4; c++) {
                    const val = srcData[i00 + c] * (1 - xWeight) * (1 - yWeight) +
                                srcData[i01 + c] * xWeight * (1 - yWeight) +
                                srcData[i10 + c] * yWeight * (1 - xWeight) +
                                srcData[i11 + c] * xWeight * yWeight;
                    
                    dstData[(y * targetWidth + x) * 4 + c] = val;
                }
            }
        }
        return dst;
    }
}

/**
 * Фабрика для получения нужного алгоритма
 */
export const ScalingProvider = {
    get(method: InterpolationMethod): ScalingAlgorithm {
        switch (method) {
            case 'nearest': return new NearestNeighborScaling();
            case 'bilinear': return new BilinearScaling();
            default: return new BilinearScaling();
        }
    },
    
    /**
     * Основная функция масштабирования
     */
    scale(src: ImageData, width: number, height: number, method: InterpolationMethod): ImageData {
        return this.get(method).calculate(src, width, height);
    }
};
