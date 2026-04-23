import { Upload, Download, Image as ImageIcon } from 'lucide-react';

export function Toolbar() {
  return (
    <div className="h-12 bg-editor-panel border-b border-editor-border flex items-center px-4 gap-2 shadow-sm select-none">
      <div className="flex items-center gap-2 text-editor-accent mr-4">
        <ImageIcon size={20} />
        <span className="font-semibold text-sm">GB7 Editor</span>
      </div>
      
      <div className="h-6 w-[1px] bg-editor-border mx-2"></div>
      
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/10 text-sm transition-colors text-editor-text cursor-pointer">
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