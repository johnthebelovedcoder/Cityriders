'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UploadCloud01, DownloadCloud01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

const TEMPLATE = [
  'recipientName,recipientPhone,recipientEmail,destStreet,destCity,destState,senderPhone,description,weightKg,fromZoneId,toZoneId',
  'John Doe,08012345678,,123 Main St,Lagos,Lagos,,,,,',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cityrider_packages_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkUploadButton() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/packages/bulk-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    onSuccess: (data) => {
      const ok = data.created ?? 0;
      const failed = data.errors?.length ?? 0;
      toast.success(`${ok} package(s) imported${failed ? `, ${failed} failed` : ''}`);
      qc.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Upload failed'),
  });

  return (
    <div className="flex gap-2">
      <button onClick={downloadTemplate} className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted" title="Download CSV template (also works as an Excel template)">
        <DownloadCloud01 className="h-3.5 w-3.5" /> Template
      </button>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted disabled:opacity-60"
      >
        <UploadCloud01 className="h-3.5 w-3.5" /> {upload.isPending ? 'Uploading…' : 'Import CSV / Excel'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { upload.mutate(f); e.target.value = ''; }
        }}
      />
    </div>
  );
}

