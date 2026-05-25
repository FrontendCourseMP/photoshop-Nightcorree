import React, { useEffect, useRef, useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    initialWidth?: number;
}

/**
 * Обобщенный компонент плавающего перетаскиваемого окна.
 * Поведение идентично LevelsDialog: без затемнения, поддержка Drag-and-Drop.
 */
export function Modal({ isOpen, onClose, title, children, initialWidth = 420 }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    
    // Состояние позиции (Инициализируем сразу в центре)
    const [position, setPosition] = useState(() => ({
        x: (window.innerWidth - initialWidth) / 2,
        y: 150
    }));
    
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    // Эффект открытия/закрытия
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            dialog.show(); // Используем show() вместо showModal(), чтобы не было затемнения
        } else {
            dialog.close();
        }
    }, [isOpen]);

    // Логика перетаскивания (Header Drag)
    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        
        setIsDragging(true);
        dragStartPos.current = { 
            x: e.clientX - position.x, 
            y: e.clientY - position.y 
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            setPosition({ 
                x: moveEvent.clientX - dragStartPos.current.x, 
                y: moveEvent.clientY - dragStartPos.current.y 
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            className={`fixed bg-editor-panel text-editor-text border border-editor-border rounded-lg shadow-2xl p-0 overflow-hidden outline-none select-none transition-opacity z-[1000] ${isDragging ? 'opacity-90' : 'opacity-100'}`}
            style={{ 
                margin: 0, 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                width: `${initialWidth}px`
            }}
        >
            <div 
                onMouseDown={handleHeaderMouseDown}
                className={`px-4 py-4 flex justify-between items-center border-b border-editor-border bg-white/5 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-80 pointer-events-none">{title}</h3>
                <button 
                    onClick={onClose}
                    className="text-editor-text/40 hover:text-white transition-colors cursor-pointer z-50"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-6">
                {children}
            </div>
        </dialog>
    );
}
