import { useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { Workspace, type ImageMeta } from './components/Workspace';
import { StatusBar } from './components/StatusBar';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);

  return (
    // Корневой контейнер: жестко 100% высоты и ширины, скрываем глобальный скролл
    <div className="h-screen w-full flex flex-col bg-editor-bg text-editor-text overflow-hidden">
      
      {/* Обертка для Toolbar: запрещаем сжиматься по высоте */}
      <div className="shrink-0">
        <Toolbar onFileSelect={setSelectedFile} />
      </div>
      
      {/* Рабочая область: занимает всё доступное место (flex-1) и позволяет внутренний скролл (overflow-auto) */}
      <main className="flex-1 overflow-hidden relative min-h-0">
        <Workspace 
          file={selectedFile} 
          onImageLoaded={setImageMeta} 
        />
      </main>
      
      {/* Обертка для StatusBar: запрещаем сжиматься по высоте */}
      <div className="shrink-0">
        <StatusBar 
          width={imageMeta?.width || 0} 
          height={imageMeta?.height || 0} 
          colorDepth={imageMeta?.colorDepth || 0} 
        />
      </div>
      
    </div>
  );
}

export default App;