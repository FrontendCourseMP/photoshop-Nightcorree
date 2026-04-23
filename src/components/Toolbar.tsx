import { useRef } from 'react';
import { Upload, Download, Image as ImageIcon } from 'lucide-react';
import { encodeGB7 } from '../utils/gb7Codec';

interface ToolbarProps {
  onFileSelect: (file: File) => void;
}

export function Toolbar({ onFileSelect }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Симулируем клик по скрытому инпуту при нажатии на кнопку "Открыть"
  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Сбрасываем значение, чтобы можно было загрузить этот же файл повторно
    e.target.value = '';
  };

  // Логика скачивания холста
  const handleDownload = (format: 'png' | 'jpg' | 'gb7') => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Холст не найден!');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (format === 'gb7') {
      // Экспорт в наш кастомный бинарный формат
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const buffer = encodeGB7(imageData);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      triggerDownload(blob, 'image.gb7');
    } else {
      // Стандартный экспорт браузера для PNG и JPG
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, `image.${format}`);
      }, mimeType);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-12 bg-editor-panel border-b border-editor-border flex items-center px-4 gap-2 shadow-sm select-none shrink-0">
      <div className="flex items-center gap-2 text-editor-accent mr-4">
        <ImageIcon size={20} />
        <span className="font-semibold text-sm">GB7 Editor</span>
      </div>
      
      <div className="h-6 w-[1px] bg-editor-border mx-2"></div>
      
      {/* Скрытый инпут для выбора файлов */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".png,.jpg,.jpeg,.gb7" 
        onChange={handleFileChange}
      />
      
      <button 
        onClick={handleOpenClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/10 text-sm transition-colors text-editor-text cursor-pointer"
      >
        <Upload size={16} />
        Открыть
      </button>
      
      <div className="h-6 w-[1px] bg-editor-border mx-2"></div>

      {/* Панель экспорта */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-editor-text opacity-70">
          <Download size={16} />
          <span>Сохранить как:</span>
        </div>
        
        <button 
          onClick={() => handleDownload('png')} 
          className="px-2 py-1 text-xs rounded hover:bg-white/10 text-editor-text transition-colors"
        >
          PNG
        </button>
        <button 
          onClick={() => handleDownload('jpg')} 
          className="px-2 py-1 text-xs rounded hover:bg-white/10 text-editor-text transition-colors"
        >
          JPG
        </button>
        <button 
          onClick={() => handleDownload('gb7')} 
          className="px-2 py-1 text-xs font-bold rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition-colors border border-blue-500/30"
        >
          GB7
        </button>
      </div>
    </div>
  );
}