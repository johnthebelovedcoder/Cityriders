'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MarkerPin01, Clock, ArrowRight, Package, Truck01, CheckCircle } from '@untitled-ui/icons-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useTrackingSocket } from '@/hooks/use-tracking-socket';
import { MetricCard } from '@/components/ui/MetricCard';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_URL;

const STATUS_CLS: Record<string, string> = {
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
};

const MARKER_COLOR: Record<string, string> = {
  IN_TRANSIT: '#f59e0b',
  PICKED_UP: '#6366f1',
  ASSIGNED: '#3b82f6',
};

// Lagos bounding box for coordinate mapping
const MAP_BOUNDS = { minLng: 3.3, maxLng: 3.6, minLat: 6.4, maxLat: 6.65 };

function latLngToPercent(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function TrackingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const qc = useQueryClient();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['tracking-active'],
    queryFn: () => api.get('/track/active').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const handleStatusUpdate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['tracking-active'] });
  }, [qc]);

  const { isConnected } = useTrackingSocket({
    onStatus: handleStatusUpdate,
    onUpdate: (live) => qc.setQueryData(['tracking-active'], live),
    enabled: !IS_MOCK,
  });

  // Track connection state for the status badge
  useState(() => {
    const interval = setInterval(() => setWsConnected(isConnected()), 2000);
    return () => clearInterval(interval);
  });

  const selectedDelivery = deliveries.find((d: any) => d.id === selected);

  const mapSrc = selectedDelivery
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedDelivery.lng - 0.03},${selectedDelivery.lat - 0.02},${selectedDelivery.lng + 0.03},${selectedDelivery.lat + 0.02}&layer=mapnik`
    : `https://www.openstreetmap.org/export/embed.html?bbox=3.3,6.4,3.6,6.65&layer=mapnik`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Tracking</h1>
          <p className="text-muted-foreground">Real-time view of active deliveries in the field</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
          <span className={`h-2 w-2 rounded-full animate-pulse ${wsConnected ? 'bg-green-500' : 'bg-amber-400'}`} />
          <span className="text-xs text-muted-foreground">
            {deliveries.length} active · {wsConnected ? 'live' : 'polling 30s'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active" value={deliveries.length} sub="Live deliveries" icon={Package} iconCls="text-primary" />
        <MetricCard label="In Transit" value={(deliveries as any[]).filter((d: any) => d.status === 'IN_TRANSIT').length} sub="On the road" icon={Truck01} iconCls="text-amber-500" valueColor="text-amber-600" />
        <MetricCard label="Picked Up" value={(deliveries as any[]).filter((d: any) => d.status === 'PICKED_UP').length} sub="With rider" icon={MarkerPin01} iconCls="text-indigo-500" valueColor="text-indigo-600" />
        <MetricCard label="Assigned" value={(deliveries as any[]).filter((d: any) => d.status === 'ASSIGNED').length} sub="Rider assigned" icon={CheckCircle} iconCls="text-blue-500" valueColor="text-blue-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
        {/* Left: delivery list */}
        <div className="lg:col-span-2 flex flex-col rounded-lg border bg-card overflow-hidden">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Active Deliveries</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {isLoading && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
            {!isLoading && deliveries.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                <MarkerPin01 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                No active deliveries right now
              </div>
            )}
            {deliveries.map((d: any) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id === selected ? null : d.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-colors ${selected === d.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold text-primary">{d.trackingNumber}</p>
                    <p className="mt-0.5 text-sm font-medium truncate">{d.riderName}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate max-w-[80px]">{d.origin}</span>
                      <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate max-w-[80px]">{d.destination}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLS[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2 w-2" /> {timeAgo(d.lastUpdate)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/packages/${d.packageId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-primary"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: map */}
        <div className="lg:col-span-3 relative rounded-lg border overflow-hidden">
          <iframe
            key={mapSrc}
            title="Live delivery map"
            src={mapSrc}
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block w-full h-full"
            style={{ border: 0, minHeight: 400 }}
          />
          {/* Overlay markers — only shown when rider has GPS data */}
          {deliveries.filter((d: any) => d.lat != null && d.lng != null).map((d: any) => {
            const { x, y } = latLngToPercent(d.lat, d.lng);
            const color = MARKER_COLOR[d.status] ?? '#94a3b8';
            const isActive = d.id === selected;
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d.id === selected ? null : d.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: color, transform: isActive ? 'scale(1.5)' : 'scale(1)', transition: 'transform 0.2s' }}
                />
                {isActive && (
                  <span className="absolute left-1/2 -translate-x-1/2 top-5 whitespace-nowrap rounded bg-card px-1.5 py-0.5 text-[10px] font-medium shadow-md border">
                    {d.riderName}
                  </span>
                )}
              </button>
            );
          })}
          <div className="absolute bottom-3 left-3 rounded-md bg-card/90 backdrop-blur-sm border px-2 py-1.5 text-[10px] text-muted-foreground">
            Lagos, Nigeria · {wsConnected ? 'Live via WebSocket' : 'Updates every 30s'}
          </div>
        </div>
      </div>
    </div>
  );
}

