'use client';

import { useState } from 'react';
import { Building02, Users01, CurrencyDollar, MarkerPin01, Bell01, Shield01, AlertTriangle } from '@untitled-ui/icons-react';
import { TabNav } from '@/components/ui/TabNav';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { UsersSettings } from '@/components/settings/UsersSettings';
import { PricingSettings } from '@/components/settings/PricingSettings';
import { ZonesSettings } from '@/components/settings/ZonesSettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { PermissionsSettings } from '@/components/settings/PermissionsSettings';
import { FailureCodesSettings } from '@/components/settings/FailureCodesSettings';

const TABS = [
  { id: 'company',       label: 'Company',       icon: Building02,     component: CompanySettings },
  { id: 'users',         label: 'Users',          icon: Users01,        component: UsersSettings },
  { id: 'pricing',       label: 'Pricing',        icon: CurrencyDollar, component: PricingSettings },
  { id: 'zones',         label: 'Zones',          icon: MarkerPin01,    component: ZonesSettings },
  { id: 'failure-codes', label: 'Failure Codes',  icon: AlertTriangle,  component: FailureCodesSettings },
  { id: 'notifications', label: 'Notifications',  icon: Bell01,         component: NotificationsSettings },
  { id: 'permissions',   label: 'Permissions',    icon: Shield01,       component: PermissionsSettings },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? CompanySettings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your workspace and preferences</p>
      </div>

      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <ActiveComponent />
    </div>
  );
}

