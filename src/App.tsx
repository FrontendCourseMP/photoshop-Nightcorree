import { useState, useCallback } from 'react';
import { Toolbar, type EditorTool } from './components/Toolbar';
import { Workspace, type ImageMeta } from './components/Workspace';
import { StatusBar } from './components/StatusBar';
import { ChannelPanel, type ChannelState } from './components/ChannelPanel';
import { LevelsDialog } from './components/LevelsDialog';
import { ResizeDialog } from './components/ResizeDialog';
import { FilterDialog } from './components/FilterDialog';
import { createThumbnail, applyImageFilters } from './utils/imageUtils';
import { ScalingProvider, type InterpolationMethod } from './utils/interpolation.ts';
import { applyConvolution, type EdgeStrategy } from './utils/filters';

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
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [thumbnailImageData, setThumbnailImageData] = useState<ImageData | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('hand');
  const [pickedColor, setPickedColor] = useState<ColorInfo | null>(null);
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const [previewLUTs, setPreviewLUTs] = useState<Record<string, Uint8Array> | null>(null);
  const [previewFilter, setPreviewFilter] = useState<{ kernel: number[], strategy: EdgeStrategy, channels: ChannelState } | null>(null);

  // ЛАБА 4: Состояние масштаба и метода интерполяции
  const [viewScale, setViewScale] = useState(1); // 1 = 100%
  const [interpolationMethod, setInterpolationMethod] = useState<InterpolationMethod>('bilinear');

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

  // ФИКС: Мгновенная очистка при выборе нового файла
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setOriginalImageData(null);
    setImageMeta(null);
    setThumbnailImageData(null);
    setPickedColor(null);
    setPreviewFilter(null);
    setPreviewLUTs(null);
  }, []);

  const handleImageLoaded = useCallback((meta: ImageMeta, imageData: ImageData) => {
    setImageMeta(meta);
    setPickedColor(null);
    setOriginalImageData(imageData);
    setPreviewLUTs(null);
    
    // ЛАБА 4: Авто-масштабирование под размер экрана (с отступом 50px)
    const viewportWidth = window.innerWidth - 300; 
    const viewportHeight = window.innerHeight - 150; 
    
    const scaleX = (viewportWidth - 100) / meta.width;
    const scaleY = (viewportHeight - 100) / meta.height;
    
    let initialScale = Math.min(scaleX, scaleY);
    initialScale = Math.max(0.12, Math.min(3, initialScale));
    setViewScale(initialScale);
    
    setTimeout(() => {
        setThumbnailImageData(createThumbnail(imageData, 48, 48));
    }, 100);
  }, []);

  const isGrayscale = imageMeta?.colorDepth === 7 || imageMeta?.colorDepth === 8;

  const handleApplyLevels = (luts: Record<string, Uint8Array>) => {
    if (!originalImageData) return;
    const allChannels: ChannelState = { r: true, g: true, b: true, a: true };
    const targetBuffer = new ImageData(originalImageData.width, originalImageData.height);
    const lutsTyped = luts as { r: Uint8Array, g: Uint8Array, b: Uint8Array, a: Uint8Array };
    const processed = applyImageFilters(originalImageData, allChannels, isGrayscale, lutsTyped, targetBuffer);
    
    setOriginalImageData(processed);
    setThumbnailImageData(createThumbnail(processed, 48, 48));
    setPreviewLUTs(null);
    setIsLevelsOpen(false);
  };

  const handleCancelLevels = () => {
    setPreviewLUTs(null);
    setIsLevelsOpen(false);
  };

  const handleApplyResize = (width: number, height: number, method: InterpolationMethod) => {
    if (!originalImageData) return;
    const resized = ScalingProvider.scale(originalImageData, width, height, method);
    setOriginalImageData(resized);
    setThumbnailImageData(createThumbnail(resized, 48, 48));
    setImageMeta(prev => prev ? { ...prev, width, height } : null);
    setIsResizeOpen(false);
  };

  const handleApplyFilters = (kernel: number[], strategy: EdgeStrategy, activeChannels: ChannelState) => {
    if (!originalImageData) return;
    const processed = applyConvolution(originalImageData, kernel, strategy, activeChannels, isGrayscale);
    setOriginalImageData(processed);
    setThumbnailImageData(createThumbnail(processed, 48, 48));
    setPreviewFilter(null);
    setIsFiltersOpen(false);
  };

  const handlePreviewFilter = useCallback((kernel: number[] | null, strategy: EdgeStrategy, activeChannels: ChannelState) => {
    if (!kernel) setPreviewFilter(null);
    else setPreviewFilter({ kernel, strategy, channels: activeChannels });
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-editor-bg text-editor-text overflow-hidden">
      <div className="shrink-0">
        <Toolbar 
          onFileSelect={handleFileSelect} 
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onOpenLevels={() => setIsLevelsOpen(true)}
          onOpenResize={() => setIsResizeOpen(true)}
          onOpenFilters={() => setIsFiltersOpen(true)}
          hasImage={!!imageMeta}
        />
      </div>
      
      <main className="flex-1 overflow-hidden relative min-h-0 flex">
        <div className="flex-1 relative overflow-hidden">
          <Workspace 
            file={selectedFile} 
            onImageLoaded={handleImageLoaded} 
            activeChannels={channels}
            activeTool={activeTool}
            onColorPicked={setPickedColor}
            imageMeta={imageMeta}
            levelsLUTs={previewLUTs}
            imageData={originalImageData}
            viewScale={viewScale}
            interpolationMethod={interpolationMethod}
            previewFilter={previewFilter}
          />
        </div>
        <ChannelPanel 
          channels={channels} 
          onToggle={handleToggleChannel} 
          thumbnailImageData={thumbnailImageData}
          isGrayscale={isGrayscale}
          hasAlpha={!!imageMeta?.hasAlpha}
        />
      </main>
      
      <div className="shrink-0">
        <StatusBar 
          width={imageMeta?.width || 0} 
          height={imageMeta?.height || 0} 
          colorDepth={imageMeta?.colorDepth || 0} 
          pickedColor={pickedColor}
          viewScale={viewScale}
          onViewScaleChange={setViewScale}
          interpolationMethod={interpolationMethod}
          onInterpolationMethodChange={setInterpolationMethod}
        />
      </div>

      {isLevelsOpen && (
        <LevelsDialog 
          onClose={handleCancelLevels}
          onApply={handleApplyLevels}
          onPreview={setPreviewLUTs}
          originalImageData={originalImageData}
          isGrayscale={isGrayscale}
          hasAlpha={!!imageMeta?.hasAlpha}
        />
      )}

      {isResizeOpen && (
        <ResizeDialog 
          onClose={() => setIsResizeOpen(false)}
          onApply={handleApplyResize}
          currentWidth={originalImageData?.width || 0}
          currentHeight={originalImageData?.height || 0}
        />
      )}

      {isFiltersOpen && (
        <FilterDialog
          onClose={() => setIsFiltersOpen(false)}
          onApply={handleApplyFilters}
          onPreview={handlePreviewFilter}
          isGrayscale={isGrayscale}
          hasAlpha={!!imageMeta?.hasAlpha}
        />
      )}
    </div>
  );
}

export default App;
