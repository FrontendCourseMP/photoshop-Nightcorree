export function Workspace() {
  return (
    <div className="flex-1 bg-editor-bg overflow-auto flex items-center justify-center relative">
      {/* Контейнер для холста с фоном "шахматкой" */}
      <div className="relative shadow-2xl border border-editor-border bg-checkerboard">
        <canvas 
          id="main-canvas"
          className="block"
          width={800} // Пока зададим размер заглушки
          height={600}
        />
      </div>
    </div>
  );
}