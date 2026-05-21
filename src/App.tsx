import { useState, useCallback } from 'react';
import { Toolbar, type EditorTool } from './components/Toolbar';
import { Workspace, type ImageMeta } from './components/Workspace';
import { StatusBar } from './components/StatusBar';
import { ChannelPanel, type ChannelState } from './components/ChannelPanel';
import { createThumbnail } from './utils/imageUtils';

export interface ColorInfo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  lab: { l: number; a: number; b: number };
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [thumbnailImageData, setThumbnailImageData] = useState<ImageData | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('hand');
  const [pickedColor, setPickedColor] = useState<ColorInfo | null>(null);

  const [channels, setChannels] = useState<ChannelState>({
    r: true,
    g: true,
    b: true,
    a: true
  });

  const handleToggleChannel = useCallback((channel: keyof ChannelState) => {
    setChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  }, []);

  const handleImageLoaded = useCallback((meta: ImageMeta, imageData: ImageData) => {
    setImageMeta(meta);
    setPickedColor(null);
    // Генерируем маленькое превью один раз при загрузке
    setThumbnailImageData(createThumbnail(imageData, 48, 48));
  }, []);

  return (
    // Корневой контейнер: жестко 100% высоты и ширины, скрываем глобальный скролл
    <div className="h-screen w-full flex flex-col bg-editor-bg text-editor-text overflow-hidden">

      {/* Обертка для Toolbar: запрещаем сжиматься по высоте */}
      <div className="shrink-0">
        <Toolbar 
          onFileSelect={setSelectedFile} 
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />
      </div>

      {/* Рабочая область: занимает всё доступное место (flex-1) и позволяет внутренний скролл (overflow-auto) */}
      <main className="flex-1 overflow-hidden relative min-h-0 flex">
        <div className="flex-1 relative overflow-hidden">
          <Workspace 
            file={selectedFile} 
            onImageLoaded={handleImageLoaded} 
            activeChannels={channels}
            activeTool={activeTool}
            onColorPicked={setPickedColor}
          />
        </div>
        <ChannelPanel 
          channels={channels} 
          onToggle={handleToggleChannel} 
          thumbnailImageData={thumbnailImageData}
        />
      </main>

      {/* Обертка для StatusBar: запрещаем сжиматься по высоте */}
      <div className="shrink-0">
        <StatusBar 
          width={imageMeta?.width || 0} 
          height={imageMeta?.height || 0} 
          colorDepth={imageMeta?.colorDepth || 0} 
          pickedColor={pickedColor}
        />
      </div>

    </div>
  );
}

export default App;