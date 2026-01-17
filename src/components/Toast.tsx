import { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export function Toast({ message, visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {message}
    </div>
  );
}
