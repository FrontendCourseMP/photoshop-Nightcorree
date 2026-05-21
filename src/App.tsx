import { useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { Workspace, type ImageMeta } from './components/Workspace';
import { StatusBar } from './components/StatusBar';
import { ChannelPanel, type ChannelState } from './components/ChannelPanel';
import { createThumbnail } from './utils/imageUtils';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [thumbnailImageData, setThumbnailImageData] = useState<ImageData | null>(null);
  const [channels, setChannels] = useState<ChannelState>({
    r: true,
    g: true,
    b: true,
    a: true
  });

  const handleToggleChannel = (channel: keyof ChannelState) => {
    setChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  const handleImageLoaded = (meta: ImageMeta, imageData: ImageData) => {
    setImageMeta(meta);
    // Генерируем маленькое превью один раз при загрузке
    setThumbnailImageData(createThumbnail(imageData, 48, 48));
  };

  return (
    // Корневой контейнер: жестко 100% высоты и ширины, скрываем глобальный скролл
    <div className="h-screen w-full flex flex-col bg-editor-bg text-editor-text overflow-hidden">
      
      {/* Обертка для Toolbar: запрещаем сжиматься по высоте */}
      <div className="shrink-0">
        <Toolbar onFileSelect={setSelectedFile} />
      </div>
      
      {/* Рабочая область: занимает всё доступное место (flex-1) и позволяет внутренний скролл (overflow-auto) */}
      <main className="flex-1 overflow-hidden relative min-h-0 flex">
        <div className="flex-1 relative overflow-hidden">
          <Workspace 
            file={selectedFile} 
            onImageLoaded={handleImageLoaded} 
            activeChannels={channels}
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
        />
      </div>
      
    </div>
  );
}

export default App;