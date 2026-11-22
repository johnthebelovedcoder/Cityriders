'use client';

import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';

interface Package {
  id: string;
  trackingNumber: string;
  status: string;
  recipient: { name: string; area?: string };
  weight?: number;
  rider?: { user: { firstName: string; lastName: string } };
}

interface Props {
  id: string;
  title: string;
  color: string;
  packages: Package[];
  terminal?: boolean;
}

export function KanbanColumn({ id, title, color, packages, terminal }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 lg:w-auto lg:flex-1">
      <div className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{packages.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-col gap-2 rounded-lg p-2 transition-colors ${isOver ? 'bg-primary/5 ring-1 ring-primary/30' : 'bg-muted/20'}`}
      >
        {packages.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded border border-dashed p-4">
            <p className="text-xs text-muted-foreground">Drop here</p>
          </div>
        )}
        {packages.map((pkg) => (
          <KanbanCard key={pkg.id} pkg={pkg} disabled={terminal} />
        ))}
      </div>
    </div>
  );
}

