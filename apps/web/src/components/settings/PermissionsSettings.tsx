'use client';

import React from 'react';
import { Check, XClose } from '@untitled-ui/icons-react';

const ROLES = ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT', 'RIDER'] as const;

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Admin',
  MANAGER:       'Manager',
  DISPATCHER:    'Dispatcher',
  ACCOUNTANT:    'Accountant',
  RIDER:         'Rider',
};

type PermRow = {
  group: string;
  label: string;
  ADMINISTRATOR: boolean;
  MANAGER: boolean;
  DISPATCHER: boolean;
  ACCOUNTANT: boolean;
  RIDER: boolean;
};

const PERMISSIONS: PermRow[] = [
  // Packages
  { group: 'Packages', label: 'Register new package',       ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false, RIDER: false },
  { group: 'Packages', label: 'View all packages',          ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: true,  RIDER: false },
  { group: 'Packages', label: 'Edit package details',       ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false, RIDER: false },
  { group: 'Packages', label: 'Cancel / delete package',    ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
  // Riders
  { group: 'Riders',   label: 'View riders',                ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false, RIDER: false },
  { group: 'Riders',   label: 'Create / edit rider',        ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
  { group: 'Riders',   label: 'Assign delivery to rider',   ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false, RIDER: false },
  { group: 'Riders',   label: 'Update delivery status',     ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: false, RIDER: true  },
  // Finance
  { group: 'Finance',  label: 'View financial reports',     ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true,  RIDER: false },
  { group: 'Finance',  label: 'Record payments / expenses', ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true,  RIDER: false },
  { group: 'Finance',  label: 'Manage payroll',             ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true,  RIDER: false },
  { group: 'Finance',  label: 'Generate payslips',          ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: true,  RIDER: false },
  // Customers
  { group: 'Customers', label: 'View customers',            ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: true,  ACCOUNTANT: true,  RIDER: false },
  { group: 'Customers', label: 'Edit customer details',     ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
  // Admin
  { group: 'Admin',    label: 'Manage users & roles',       ADMINISTRATOR: true,  MANAGER: false, DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
  { group: 'Admin',    label: 'System settings',            ADMINISTRATOR: true,  MANAGER: false, DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
  { group: 'Admin',    label: 'View audit log',             ADMINISTRATOR: true,  MANAGER: true,  DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
  { group: 'Admin',    label: 'Export audit log CSV',       ADMINISTRATOR: true,  MANAGER: false, DISPATCHER: false, ACCOUNTANT: false, RIDER: false },
];

const groups = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

export function PermissionsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Role Permissions</h2>
        <p className="text-sm text-muted-foreground">
          Read-only reference of what each role can and cannot do. Contact your administrator to request access changes.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-56">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const rows = PERMISSIONS.filter((p) => p.group === group);
                return (
                  <React.Fragment key={group}>
                    <tr className="border-t border-b bg-muted/20">
                      <td colSpan={ROLES.length + 1} className="px-4 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group}</span>
                      </td>
                    </tr>
                    {rows.map((perm) => (
                      <tr key={perm.label} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-sm">{perm.label}</td>
                        {ROLES.map((role) => (
                          <td key={role} className="px-4 py-2.5 text-center">
                            {(perm as any)[role] ? (
                              <Check className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <XClose className="mx-auto h-4 w-4 text-muted-foreground/30" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Permissions are enforced server-side. This table reflects the current policy configuration.
      </p>
    </div>
  );
}
