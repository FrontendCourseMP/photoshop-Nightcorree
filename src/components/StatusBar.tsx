interface StatusBarProps {
  width: number;
  height: number;
  colorDepth: number; // В битах (например, 8, 24, 32)
}

export function StatusBar({ width, height, colorDepth }: StatusBarProps) {
  return (
    <div className="h-6 bg-editor-panel border-t border-editor-border flex items-center px-4 justify-between text-[11px] text-editor-text/70 select-none">
      <div className="flex gap-4">
        <span>Готово</span>
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