'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DotsGrid, User01 } from '@untitled-ui/icons-react';

interface Package {
  id: string;
  trackingNumber: string;
  recipient: { name: string; area?: string };
  weight?: number;
  rider?: { user: { firstName: string; lastName: string }; zone?: { name: string } | null };
}

interface Props {
  pkg: Package;
  disabled?: boolean;
}

export function KanbanCard({ pkg, disabled }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pkg.id,
    disabled,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow ${
        disabled ? 'cursor-default' : isDragging ? 'cursor-grabbing shadow-lg ring-2 ring-primary/50' : 'cursor-grab hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2">
        <DotsGrid className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-semibold text-primary">{pkg.trackingNumber}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{pkg.recipient.name}</p>
          {pkg.recipient.area && (
            <p className="text-xs text-muted-foreground">{pkg.recipient.area}</p>
          )}
          {pkg.weight && (
            <p className="mt-1 text-xs text-muted-foreground">{pkg.weight}kg</p>
          )}
        </div>
      </div>
      {pkg.rider && (
        <div className="mt-2 flex items-center justify-between gap-1 border-t pt-2">
          <div className="flex items-center gap-1">
            <User01 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {pkg.rider.user.firstName} {pkg.rider.user.lastName}
            </span>
          </div>
          {pkg.rider.zone && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              {pkg.rider.zone.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

