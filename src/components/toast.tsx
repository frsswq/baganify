import { useEffect } from "react";

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

  if (!visible) {
    return null;
  }

  return (
    <div className="fade-in slide-in-from-bottom-2 fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-in rounded-md bg-gray-900 px-4 py-2 font-medium text-sm text-white shadow-lg duration-200">
      {message}
    </div>
  );
}
