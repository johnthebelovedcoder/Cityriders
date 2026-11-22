'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DownloadCloud01, FileSearch01, RefreshCw05, FilePlus02, Calendar } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { MetricCard } from '@/components/ui/MetricCard';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REASSIGN', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT'];

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ASSIGN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  REASSIGN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  STATUS_CHANGE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOGIN: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

function exportCsv(logs: any[]) {
  const headers = ['When', 'User', 'Email', 'Action', 'Entity', 'Entity ID'];
  const rows = logs.map((l) => [
    new Date(l.createdAt).toLocaleString(),
    l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System',
    l.user?.email ?? '',
    l.action,
    l.entity ?? '',
    l.entityId ?? '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { range, setRange } = usePeriodFilter('this-week');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', search, entity, action, userFilter, range.from, range.to, page],
    queryFn: () => api.get('/audit', { params: { search: search || undefined, entity: entity || undefined, action: action || undefined, user: userFilter || undefined, from: range.from, to: range.to, page, limit: 50 } }).then((r) => r.data),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Track every action performed on the system</p>
        </div>
        <button
          onClick={() => exportCsv(logs)}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          <DownloadCloud01 className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Events" value={meta?.total ?? 0} icon={FileSearch01} iconCls="text-primary" />
        <MetricCard label="Status Changes" value={logs.filter((l: any) => l.action === 'STATUS_CHANGE').length} icon={RefreshCw05} iconCls="text-amber-500" valueColor="text-amber-600" sub="in this page" />
        <MetricCard label="Creates" value={logs.filter((l: any) => l.action === 'CREATE').length} icon={FilePlus02} iconCls="text-emerald-500" valueColor="text-emerald-600" sub="in this page" />
        <MetricCard label="This Page" value={logs.length} icon={Calendar} iconCls="text-muted-foreground" sub={`of ${meta?.total ?? 0}`} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search user, entity ID…"
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <PeriodFilter value={range} onChange={(r) => { setRange(r); setPage(1); }} defaultPreset="this-week" />
        <div className="h-5 w-px bg-border hidden sm:block" />
        <input
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          placeholder="Entity type (Package, User...)"
          className="h-10 min-w-40 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>
        <input
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
          placeholder="Filter by user name…"
          className="h-10 min-w-40 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No audit entries found</td></tr>
            )}
            {logs.map((log: any) => (
              <React.Fragment key={log.id}>
                <tr className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}</p>
                      {log.user?.email && <p className="text-xs text-muted-foreground">{log.user.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">{log.entity?.toLowerCase()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.entityId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    {(log.previousValue || log.newValue) && (
                      <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs text-primary hover:underline">
                        {expanded === log.id ? 'Hide' : 'View diff'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === log.id && (
                  <tr className="bg-muted/20 border-b">
                    <td colSpan={6} className="px-6 pb-4 pt-2">
                      <div className="grid gap-4 sm:grid-cols-2 font-mono text-xs">
                        {log.previousValue && (
                          <div>
                            <p className="mb-1 font-sans font-medium text-red-600 dark:text-red-400">Before</p>
                            <pre className="rounded-md bg-background border p-3 overflow-x-auto">{JSON.stringify(log.previousValue, null, 2)}</pre>
                          </div>
                        )}
                        {log.newValue && (
                          <div>
                            <p className="mb-1 font-sans font-medium text-green-600 dark:text-green-400">After</p>
                            <pre className="rounded-md bg-background border p-3 overflow-x-auto">{JSON.stringify(log.newValue, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">{(page - 1) * meta.limit + 1}-{Math.min(page * meta.limit, meta.total)} of {meta.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="rounded-lg border px-3 py-1 hover:bg-muted disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} className="rounded-lg border px-3 py-1 hover:bg-muted disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}