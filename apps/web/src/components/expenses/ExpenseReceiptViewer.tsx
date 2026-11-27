'use client';

import { useEffect, useState } from 'react';
import { XClose } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

export function ExpenseReceiptViewer({ expenseId, onClose }: { expenseId: string; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let active = true;
    api.get(`/expenses/${expenseId}/receipt`, { responseType: 'blob' }).then((response) => {
      objectUrl = URL.createObjectURL(response.data);
      if (!active) { URL.revokeObjectURL(objectUrl); return; }
      setUrl(objectUrl);
      setMimeType(response.headers['content-type'] ?? response.data.type ?? '');
    }).catch(() => { if (active) setError('This receipt could not be opened.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [expenseId]);
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Expense receipt" onClick={(event) => event.stopPropagation()} className="flex h-full max-h-[900px] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <header className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Expense Receipt</h2><button onClick={onClose} aria-label="Close receipt" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><XClose className="h-4 w-4" /></button></header>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-3">{error ? <p className="text-sm text-destructive">{error}</p> : !url ? <p className="text-sm text-muted-foreground">Loading receipt…</p> : mimeType.startsWith('image/') ? <img src={url} alt="Expense receipt" className="max-h-full max-w-full object-contain" /> : <iframe title="Expense receipt PDF" src={url} className="h-full w-full rounded-md bg-white" />}</div>
    </section>
  </div>;
}
