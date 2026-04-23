import { useRef } from 'react';
import { Upload, Download, Image as ImageIcon } from 'lucide-react';

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
      
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/10 text-sm transition-colors text-editor-text cursor-pointer opacity-50">
        <Download size={16} />
        Сохранить
      </button>
    </div>
  );
}