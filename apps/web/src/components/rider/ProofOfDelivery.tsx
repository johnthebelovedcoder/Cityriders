'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera01, Edit03, Trash01, Upload01, CheckCircle } from '@untitled-ui/icons-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Props {
  packageId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProofOfDelivery({ packageId, onSuccess, onCancel }: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = 'touches' in e ? e.touches[0] : e;
    if (!src) return { x: 0, y: 0 };
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSig(true);
  }, [drawing]);

  const endDraw = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
    if (hasSig && canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  }, [hasSig]);

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    setSignatureData(null);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const submitPod = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (photo) form.append('photo', photo);
      if (signatureData) {
        const blob = await (await fetch(signatureData)).blob();
        form.append('signature', blob, 'signature.png');
      }
      return api.post(`/deliveries/${packageId}/proof`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Proof of delivery submitted');
      onSuccess();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Proof could not be saved. Please try again.'),
  });

  const canSubmit = photo || hasSig;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Proof of Delivery</h2>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Photo capture */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Camera01 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Delivery Photo</span>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Delivery" className="w-full rounded-xl object-cover max-h-56" />
              <button
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
              >
                <Trash01 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 cursor-pointer hover:bg-muted/30 transition-colors">
              <Camera01 className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">Tap to take a photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
          )}
        </div>

        {/* Signature pad */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit03 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recipient Signature</span>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            {hasSig && (
              <button onClick={clearSignature} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Trash01 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          <div className="relative rounded-xl border-2 border-dashed border-muted-foreground/30 bg-gray-50 dark:bg-gray-900 overflow-hidden" style={{ touchAction: 'none' }}>
            {!hasSig && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground/50">Sign here with your finger</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full cursor-crosshair"
              style={{ height: 160 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          At least one proof (photo or signature) is required to mark as delivered.
        </p>
      </div>

      <div className="border-t p-4">
        <button
          disabled={!canSubmit || submitPod.isPending}
          onClick={() => submitPod.mutate()}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {submitPod.isPending
            ? 'Submitting…'
            : <><Upload01 className="h-4 w-4" /> Submit & Mark Delivered</>
          }
        </button>
      </div>
    </div>
  );
}
