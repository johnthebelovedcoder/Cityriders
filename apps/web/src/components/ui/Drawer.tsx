'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XClose } from '@untitled-ui/icons-react';

type DrawerWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const widthCls: Record<DrawerWidth, string> = {
  sm:  'w-full max-w-sm',
  md:  'w-full max-w-md',
  lg:  'w-full max-w-lg',
  xl:  'w-full max-w-xl',
  '2xl': 'w-full max-w-2xl',
  full: 'w-full max-w-none',
};

type Props = {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: DrawerWidth;
  footer?: React.ReactNode;
};

export function Drawer({ title, onClose, children, width = 'md', footer }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className={`relative flex h-full flex-col bg-card shadow-xl ${widthCls[width]}`}>
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <XClose className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
