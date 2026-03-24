"use client";

import { useEffect, useRef, useState } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDismiss = () => {
    setShowConfirm(true);
  };

  const handleConfirmClose = () => {
    setShowConfirm(false);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setShowConfirm(false);
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConfirm) {
          setShowConfirm(false);
        } else {
          handleDismiss();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, showConfirm]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8 px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleDismiss();
      }}
    >
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-primary/10 rounded transition-colors"
            aria-label="關閉"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>

      {/* Confirm close dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl max-w-sm w-full text-center">
            <p className="text-sm mb-4">尚未儲存，確定要關閉嗎？</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirmClose}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                關閉不儲存
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="border border-border px-4 py-2 rounded-lg hover:bg-card transition-colors text-sm"
              >
                繼續編輯
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
