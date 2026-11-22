'use client';

type Props = {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ElementType;
  iconCls: string;
  valueColor?: string;
};

export function MetricCard({ label, value, sub, icon: Icon, iconCls, valueColor = '' }: Props) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`ml-2 shrink-0 rounded-xl p-2.5 ${iconCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
