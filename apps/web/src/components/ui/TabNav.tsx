'use client';

type TabItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type Props = {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
};

export function TabNav({ tabs, active, onChange }: Props) {
  return (
    <>
      {/* Mobile: select dropdown */}
      <div className="sm:hidden">
        <select
          value={active}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {tabs.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      {/* Desktop: horizontal underline tabs */}
      <div className="hidden sm:block border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
