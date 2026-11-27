'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit02, Trash01, XClose } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { SelectField } from '@/components/ui/SelectField';

const ROLES = ['MANAGER', 'ACCOUNTANT', 'DISPATCHER', 'CUSTOMER_SERVICE', 'RIDER'];
const ROLE_LABELS: Record<string, string> = { MANAGER: 'Manager', ACCOUNTANT: 'Accountant', DISPATCHER: 'Dispatcher', CUSTOMER_SERVICE: 'Customer Service', RIDER: 'Rider' };
const DEPARTMENTS = ['Operations', 'Finance', 'Support', 'Delivery', 'Management'];
const BANKS = ['First Bank', 'GTBank', 'Zenith Bank', 'Access Bank', 'UBA', 'Stanbic IBTC', 'FCMB', 'Fidelity Bank', 'Other'];

const inp = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const lbl = 'text-xs font-semibold uppercase tracking-wide';
const fmt = (n: number) => `₦${Number(n).toLocaleString()}`;

type Addition = { label: string; amount: number };
type FormState = {
  name: string; email: string; phone: string; role: string; department: string;
  employmentType: string; basicSalary: number; housingAllowance: number;
  transportAllowance: number; ratePerDelivery: number;
  bankName: string; accountNumber: string; accountHolderName: string;
  pensionPin: string; additions: Addition[];
};

const EMPTY: FormState = {
  name: '', email: '', phone: '', role: 'DISPATCHER', department: 'Operations',
  employmentType: 'STAFF', basicSalary: 0, housingAllowance: 0, transportAllowance: 0,
  ratePerDelivery: 5000, bankName: 'First Bank', accountNumber: '', accountHolderName: '',
  pensionPin: '', additions: [],
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 border-t mt-2">{children}</p>;
}

function EmployeeForm({ form, set }: { form: FormState; set: (k: keyof FormState, v: any) => void }) {
  const isRider = form.role === 'RIDER';

  function addAddition() {
    set('additions', [...form.additions, { label: '', amount: 0 }]);
  }
  function removeAddition(i: number) {
    set('additions', form.additions.filter((_, idx) => idx !== i));
  }
  function updateAddition(i: number, field: keyof Addition, value: string | number) {
    set('additions', form.additions.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }

  return (
    <div className="space-y-4">
      {/* Personal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Full Name *">
            <input className={inp} placeholder="e.g. Adaeze Okafor" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <input className={inp} type="email" placeholder="email@company.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inp} placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Role *">
          <SelectField value={form.role} onChange={(role) => {
            set('role', role);
            if (role === 'RIDER') { set('employmentType', 'RIDER'); set('department', 'Delivery'); }
            else { set('employmentType', 'STAFF'); }
          }} options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] ?? role }))} aria-label="Employee role" />
        </Field>
        <Field label="Department">
          <SelectField value={form.department} onChange={(department) => set('department', department)} options={DEPARTMENTS.map((department) => ({ value: department, label: department }))} aria-label="Department" />
        </Field>
      </div>

      {/* Compensation */}
      <SectionHead>{isRider ? 'Rider Compensation' : 'Salary Structure'}</SectionHead>
      {isRider ? (
        <Field label="Rate per Delivery (₦)">
          <MoneyInput value={form.ratePerDelivery > 0 ? String(form.ratePerDelivery) : ''} onChange={(v) => set('ratePerDelivery', Number(v) || 0)} />
        </Field>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Basic Salary (₦)">
            <MoneyInput value={form.basicSalary > 0 ? String(form.basicSalary) : ''} onChange={(v) => set('basicSalary', Number(v) || 0)} />
          </Field>
          <Field label="Housing (₦)">
            <MoneyInput value={form.housingAllowance > 0 ? String(form.housingAllowance) : ''} onChange={(v) => set('housingAllowance', Number(v) || 0)} />
          </Field>
          <Field label="Transport (₦)">
            <MoneyInput value={form.transportAllowance > 0 ? String(form.transportAllowance) : ''} onChange={(v) => set('transportAllowance', Number(v) || 0)} />
          </Field>
        </div>
      )}

      {/* Custom Additions */}
      <div>
        <div className="flex items-center justify-between pt-2 border-t mt-2">
          <p className={`${lbl} text-muted-foreground`}>Custom Additions / Bonuses</p>
          <button type="button" onClick={addAddition}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {form.additions.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">No custom additions. Click "Add" to create one (e.g. meal allowance, overtime).</p>
        )}
        <div className="space-y-2 mt-2">
          {form.additions.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={`${inp} flex-1`}
                placeholder="Label (e.g. Meal Allowance)"
                value={a.label}
                onChange={(e) => updateAddition(i, 'label', e.target.value)}
              />
              <div className="w-32 flex-shrink-0">
                <MoneyInput
                  value={a.amount > 0 ? String(a.amount) : ''}
                  onChange={(v) => updateAddition(i, 'amount', Number(v) || 0)}
                  className={`${inp} pl-7`}
                />
              </div>
              <button type="button" onClick={() => removeAddition(i)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border text-muted-foreground hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex-shrink-0">
                <XClose className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Details */}
      <SectionHead>Bank Details</SectionHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bank">
          <SelectField value={form.bankName} onChange={(bankName) => set('bankName', bankName)} options={BANKS.map((bank) => ({ value: bank, label: bank }))} aria-label="Bank" />
        </Field>
        <Field label="Account Number">
          <input className={`${inp} font-mono`} placeholder="0123456789" maxLength={10} value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Account Holder Name">
            <input className={inp} placeholder="As it appears on the bank account" value={form.accountHolderName} onChange={(e) => set('accountHolderName', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Pension */}
      <SectionHead>Pension &amp; Statutory</SectionHead>
      <Field label="Pension PIN (RSA)">
        <input className={inp} placeholder="e.g. PEN100001234" value={form.pensionPin} onChange={(e) => set('pensionPin', e.target.value)} />
      </Field>
    </div>
  );
}

export function EmployeesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editEmp, setEditEmp] = useState<(FormState & { id: string }) | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: FormState) => api.post('/employees', data),
    onSuccess: () => { toast.success('Employee added'); qc.invalidateQueries({ queryKey: ['employees'] }); setShowCreate(false); setForm({ ...EMPTY }); },
    onError: () => toast.error('Failed to add employee'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) => api.patch(`/employees/${id}`, data),
    onSuccess: () => { toast.success('Employee updated'); qc.invalidateQueries({ queryKey: ['employees'] }); setEditEmp(null); },
    onError: () => toast.error('Failed to update employee'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => { toast.success('Employee removed'); qc.invalidateQueries({ queryKey: ['employees'] }); },
    onError: () => toast.error('Failed to remove employee'),
  });

  function openEdit(e: any) {
    const name = e.name || (e.user ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() : '');
    const filled: FormState = {
      name,
      email: e.email ?? e.user?.email ?? '',
      phone: e.phone ?? '',
      role: e.role ?? 'DISPATCHER',
      department: e.department ?? 'Operations',
      employmentType: e.employmentType ?? 'STAFF',
      basicSalary: e.basicSalary ?? 0,
      housingAllowance: e.housingAllowance ?? 0,
      transportAllowance: e.transportAllowance ?? 0,
      ratePerDelivery: e.ratePerDelivery ?? 5000,
      bankName: e.bankName ?? 'First Bank',
      accountNumber: e.accountNumber ?? '',
      accountHolderName: e.accountHolderName ?? '',
      pensionPin: e.pensionPin ?? '',
      additions: Array.isArray(e.additions) ? e.additions : [],
    };
    setForm(filled);
    setEditEmp({ ...filled, id: e.id });
  }

  const footerCreate = (
    <div className="flex gap-3">
      <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
      <button onClick={() => create.mutate(form)} disabled={create.isPending || !form.name.trim()}
        className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {create.isPending ? 'Saving…' : 'Add Employee'}
      </button>
    </div>
  );

  const footerEdit = (
    <div className="flex gap-3">
      <button onClick={() => setEditEmp(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
      <button onClick={() => update.mutate({ id: editEmp!.id, data: form })} disabled={update.isPending || !form.name.trim()}
        className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {update.isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <p className="font-semibold text-sm">All Employees</p>
            <p className="text-xs text-muted-foreground mt-0.5">Salary figures used for monthly payroll calculations</p>
          </div>
          <button onClick={() => { setForm({ ...EMPTY }); setShowCreate(true); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Add Employee
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {['Name', 'Role', 'Type', 'Basic', 'Housing', 'Transport', 'Additions', 'Bank / Account', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e: any) => {
                const isRider = e.employmentType === 'RIDER';
                const gross = isRider ? 0 : (e.basicSalary ?? 0) + (e.housingAllowance ?? 0) + (e.transportAllowance ?? 0);
                const totalAdditions = Array.isArray(e.additions) ? e.additions.reduce((s: number, a: Addition) => s + (a.amount ?? 0), 0) : 0;
                const displayName = e.name || (e.user ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() : '—');
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{e.email || e.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">{ROLE_LABELS[e.role] ?? e.role}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${isRider ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {isRider ? 'Rider' : 'Staff'}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{isRider ? `${fmt(e.ratePerDelivery ?? 0)}/del` : fmt(e.basicSalary ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{isRider ? '—' : fmt(e.housingAllowance ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{isRider ? '—' : fmt(e.transportAllowance ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {totalAdditions > 0 ? <span className="text-green-600 font-medium">+{fmt(totalAdditions)}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p>{e.bankName}</p>
                      <p className="font-mono text-muted-foreground">{e.accountNumber}</p>
                      {e.accountHolderName && <p className="text-muted-foreground">{e.accountHolderName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit02 className="h-4 w-4" /></button>
                        <button onClick={() => { if (window.confirm(`Remove ${displayName}?`)) remove.mutate(e.id); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash01 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {employees.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No employees yet. Click "Add Employee" to get started.</p>}
        </div>
      </div>

      {showCreate && (
        <Drawer title="Add Employee" onClose={() => setShowCreate(false)} footer={footerCreate} width="lg">
          <EmployeeForm form={form} set={set} />
        </Drawer>
      )}

      {editEmp && (
        <Drawer title={`Edit — ${editEmp.name || 'Employee'}`} onClose={() => setEditEmp(null)} footer={footerEdit} width="lg">
          <EmployeeForm form={form} set={set} />
        </Drawer>
      )}
    </>
  );
}
