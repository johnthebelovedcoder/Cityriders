'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XClose, Upload01, FileCheck01, Eye } from '@untitled-ui/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Props { invoiceId: string; invoiceNumber: string; onClose: () => void }

export function PaymentProofModal({ invoiceId, invoiceNumber, onClose }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const { data: proofs = [] } = useQuery({
    queryKey: ['payment-proof', invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}/payment-proof`).then(r => r.data),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => { const body = new FormData(); body.append('file', file); return api.post(`/invoices/${invoiceId}/payment-proof`, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data); },
    onSuccess: () => {
      toast.success('Proof of payment uploaded');
      qc.invalidateQueries({ queryKey: ['payment-proof', invoiceId] });
    },
    onError: () => toast.error('Upload failed'),
  });

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach(f => uploadMut.mutate(f));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Payment Proof</h2>
            <p className="text-xs text-muted-foreground">{invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XClose className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'}`}
          >
            <Upload01 className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Drop file here or click to browse</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG — bank transfer receipts, screenshots</p>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* Uploaded proofs */}
          {(proofs as any[]).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded ({(proofs as any[]).length})</p>
              <ul className="space-y-2">
                {(proofs as any[]).map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <FileCheck01 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.filename}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.uploadedAt).toLocaleString()} · {p.uploadedBy}</p>
                    </div>
                    <button type="button" title="View receipt" aria-label="View payment proof" className="rounded p-1.5 text-primary hover:bg-muted" onClick={async () => { try { const { data } = await api.get(`/invoices/${invoiceId}/payment-proof/${p.id}/file`, { responseType: 'blob' }); const url = URL.createObjectURL(data); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); } catch { toast.error('Could not open payment proof'); } }}><Eye className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(proofs as any[]).length === 0 && !uploadMut.isPending && (
            <p className="text-center text-xs text-muted-foreground">No proof uploaded yet</p>
          )}

          <div className="flex justify-end pt-1">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
