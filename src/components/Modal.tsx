import React, { useEffect, useRef } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

/**
 * Обобщенный компонент модального окна для многократного использования.
 * Использует стандартный тег <dialog> для лучшей доступности.
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            dialog.showModal();
            // Блокируем скролл body при открытии
            document.body.style.overflow = 'hidden';
        } else {
            dialog.close();
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    // Закрытие при клике на Backdrop
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === dialogRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            onCancel={onClose}
            onClick={handleBackdropClick}
            className="bg-editor-panel text-editor-text border border-editor-border rounded-lg shadow-2xl p-0 backdrop:bg-black/60 overflow-hidden min-w-[420px] outline-none select-none"
        >
            {/* Заголовок (в стиле LevelsDialog) */}
            <div className="px-4 py-4 flex justify-between items-center border-b border-editor-border bg-white/5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-80">{title}</h3>
                <button 
                    onClick={onClose}
                    className="text-editor-text/40 hover:text-white transition-colors cursor-pointer"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Контент */}
            <div className="p-6">
                {children}
            </div>
        </dialog>
    );
}
