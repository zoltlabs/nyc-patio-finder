import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

export function Toast({ message, visible, onDismiss }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const timer = setTimeout(onDismiss, 2000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!mounted) return null;

  return (
    <div className={`toast${visible ? ' toast-visible' : ''}`}>
      {message}
    </div>
  );
}
