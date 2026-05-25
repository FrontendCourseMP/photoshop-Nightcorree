import type { ColorInfo } from '../App';
import type { InterpolationMethod } from '../utils/interpolation';

interface StatusBarProps {
  width: number;
  height: number;
  colorDepth: number; 
  pickedColor: ColorInfo | null;
  viewScale?: number;
  onViewScaleChange?: (scale: number) => void;
  interpolationMethod?: InterpolationMethod;
  onInterpolationMethodChange?: (method: InterpolationMethod) => void;
}

export function StatusBar({ 
  width, height, colorDepth, pickedColor, 
  viewScale = 1, onViewScaleChange,
  interpolationMethod = 'bilinear', onInterpolationMethodChange
}: StatusBarProps) {
  return (
    <div className="h-8 bg-editor-panel border-t border-editor-border flex items-center px-4 justify-between text-[11px] text-editor-text/70 select-none">
      <div className="flex gap-6 items-center">
        <div className="flex gap-4">
          <span>Готово</span>
        </div>
        
        {pickedColor && (
          <div className="flex gap-4 items-center border-l border-editor-border pl-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 border border-white/20 rounded-sm" 
                style={{ backgroundColor: `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})` }}
              />
              <span>X: {pickedColor.x}, Y: {pickedColor.y}</span>
            </div>
            <span className="opacity-50">|</span>
            <span>RGB: {pickedColor.r}, {pickedColor.g}, {pickedColor.b}</span>
            <span className="opacity-50">|</span>
            <span>LAB: {pickedColor.lab.l}, {pickedColor.lab.a}, {pickedColor.lab.b}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center h-full">
        {width > 0 && height > 0 && (
          <div className="flex gap-4 items-center mr-4 border-r border-editor-border pr-4 h-full">
             <div className="flex items-center gap-2">
              <span className="opacity-50">Алгоритм:</span>
              <select 
                value={interpolationMethod}
                onChange={(e) => onInterpolationMethodChange?.(e.target.value as InterpolationMethod)}
                className="bg-editor-bg border border-editor-border rounded px-1 outline-none focus:border-editor-accent cursor-pointer h-5"
              >
                <option value="nearest">Ближайший сосед</option>
                <option value="bilinear">Билинейная</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="opacity-50">Масштаб:</span>
              <input 
                type="range"
                min="0.12"
                max="3"
                step="0.01"
                value={viewScale}
                onChange={(e) => onViewScaleChange?.(Number(e.target.value))}
                className="w-32 accent-editor-accent cursor-pointer"
              />
              <span className="w-8 text-right">{Math.round(viewScale * 100)}%</span>
            </div>
          </div>
        )}

        {width > 0 && height > 0 ? (
          <div className="flex gap-4">
            <span>Размер: {width} × {height} px</span>
            <span>Глубина: {colorDepth} bit</span>
          </div>
        ) : (
          <span>Нет изображения</span>
        )}
      </div>
    </div>
  );
}