'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

const COLUMNS = [
  { id: 'AWAITING_ASSIGNMENT', title: 'Unassigned', color: 'bg-yellow-400' },
  { id: 'ASSIGNED', title: 'Assigned', color: 'bg-blue-400' },
  { id: 'PICKED_UP', title: 'Picked Up', color: 'bg-indigo-400' },
  { id: 'IN_TRANSIT', title: 'In Transit', color: 'bg-amber-400' },
  { id: 'DELIVERED', title: 'Delivered', color: 'bg-green-400', terminal: true },
];

const STATUS_LABEL: Record<string, string> = {
  AWAITING_ASSIGNMENT: 'Unassigned',
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
};

interface Package {
  id: string;
  trackingNumber: string;
  status: string;
  recipient: { name: string; area?: string };
  weight?: number;
  rider?: { user: { firstName: string; lastName: string }; zone?: { name: string } | null };
}

interface Props { packages: Package[] }

export function KanbanBoard({ packages }: Props) {
  const [items, setItems] = useState<Package[]>(Array.isArray(packages) ? packages : []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!pendingRef.current) {
      setItems(Array.isArray(packages) ? packages : []);
    }
  }, [packages]);
  const qc = useQueryClient();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const movePackage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/packages/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages/kanban'] });
      qc.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const newStatus = over.id as string;
    if (!COLUMNS.find((c) => c.id === newStatus)) return;

    pendingRef.current = true;
    setItems((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, status: newStatus } : p)),
    );
    movePackage.mutate(
      { id: active.id as string, status: newStatus },
      { onSettled: () => { pendingRef.current = false; } },
    );
    toast.success(`Moved to ${STATUS_LABEL[newStatus] ?? newStatus}`);
  }, [movePackage]);

  const activePackage = activeId ? items.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            terminal={col.terminal}
            packages={items.filter((p) => p.status === col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activePackage && <KanbanCard pkg={activePackage} />}
      </DragOverlay>
    </DndContext>
  );
}

