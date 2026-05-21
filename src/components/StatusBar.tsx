import type { ColorInfo } from '../App';

interface StatusBarProps {
  width: number;
  height: number;
  colorDepth: number; // В битах (например, 8, 24, 32)
  pickedColor: ColorInfo | null;
}

export function StatusBar({ width, height, colorDepth, pickedColor }: StatusBarProps) {
  return (
    <div className="h-7 bg-editor-panel border-t border-editor-border flex items-center px-4 justify-between text-[11px] text-editor-text/70 select-none">
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

      <div className="flex gap-4">
        {width > 0 && height > 0 ? (
          <>
            <span>Размер: {width} × {height} px</span>
            <span>Глубина: {colorDepth} bit</span>
          </>
        ) : (
          <span>Нет изображения</span>
        )}
      </div>
    </div>
  );
}