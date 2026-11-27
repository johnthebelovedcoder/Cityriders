'use client';

import { useState } from 'react';
import { SearchLg } from '@untitled-ui/icons-react';

const TERMS = [
  /* ── Operations ── */
  { category: 'Operations', term: 'Waybill', definition: 'A legal transport document that accompanies a shipment, containing sender, recipient, package details, and tracking number. Required for every delivery.' },
  { category: 'Operations', term: 'Tracking Number', definition: 'A unique identifier assigned to each package (format: CRD-MKXXXXXXX). Used to monitor a shipment\'s journey from pickup to delivery.' },
  { category: 'Operations', term: 'Last-Mile Delivery', definition: 'The final leg of a parcel\'s journey — from a distribution hub or pickup point to the recipient\'s address.' },
  { category: 'Operations', term: 'Pickup Location', definition: 'A registered address where a customer\'s packages are collected. Customers can register multiple pickup locations.' },
  { category: 'Operations', term: 'SLA (Service Level Agreement)', definition: 'The committed delivery timeframe agreed with a customer. A package\'s "promised delivery" date is the SLA deadline.' },
  { category: 'Operations', term: 'Delivery Attempt', definition: 'An effort by a rider to deliver a package. If the recipient is absent or unreachable, it is recorded as a failed delivery attempt.' },
  { category: 'Operations', term: 'Walk-in', definition: 'A customer who physically brings a package to the branch counter for dispatch, rather than scheduling a pickup.' },
  { category: 'Operations', term: 'Special Instructions', definition: 'Extra notes attached to a package (e.g. "fragile", "do not bend", "call before delivery") to guide the rider.' },
  { category: 'Operations', term: 'Dispatch', definition: 'The process of assigning and sending out a rider to collect or deliver a package.' },

  /* ── Riders ── */
  { category: 'Riders', term: 'Rider', definition: 'A delivery agent employed by City Riders. Riders are assigned packages and are responsible for pickup and delivery.' },
  { category: 'Riders', term: 'Active Assignment', definition: 'A current, ongoing delivery task assigned to a rider. A rider may have a configured maximum number of active assignments.' },
  { category: 'Riders', term: 'COD (Cash on Delivery)', definition: 'A payment arrangement where the recipient pays for the goods at the point of delivery. The rider collects cash and remits it.' },
  { category: 'Riders', term: 'Remittance', definition: 'The process of a rider submitting cash collected from COD deliveries back to the company.' },
  { category: 'Riders', term: 'Vehicle Plate', definition: 'The registration plate of a rider\'s vehicle, used for identity verification and tracking.' },
  { category: 'Riders', term: 'Zone', definition: 'A geographic area used to assign and manage riders\' delivery coverage, e.g. Lagos Island, Lekki.' },

  /* ── Customers & Billing ── */
  { category: 'Customers & Billing', term: 'Customer', definition: 'A business or individual that uses City Riders\' delivery services. Can be billed on a per-delivery or invoice basis.' },
  { category: 'Customers & Billing', term: 'Invoice', definition: 'A formal document sent to a customer requesting payment for delivery services rendered during a period.' },
  { category: 'Customers & Billing', term: 'Receipt', definition: 'A document confirming that payment for an invoice has been received in full.' },
  { category: 'Customers & Billing', term: 'Proof of Payment', definition: 'A document (bank transfer receipt, screenshot, etc.) submitted by a customer to confirm that an invoice has been settled.' },
  { category: 'Customers & Billing', term: 'Payment Terms', definition: 'The agreed schedule by which a customer pays — e.g. INVOICE (monthly billing), PREPAID, or COD.' },
  { category: 'Customers & Billing', term: 'Billing Cycle', definition: 'The frequency at which invoices are generated for a customer: Daily, Weekly, Bi-weekly, or Monthly.' },
  { category: 'Customers & Billing', term: 'Outstanding Balance', definition: 'The total amount a customer owes to City Riders across all unpaid or partially-paid invoices.' },
  { category: 'Customers & Billing', term: 'Credit Threshold', definition: 'The minimum account balance a prepaid customer must maintain. A low-credit alert is triggered when the balance drops below this level.' },
  { category: 'Customers & Billing', term: 'Delivery Fee', definition: 'The charge applied to a customer for a single package delivery, based on route, weight, and service tier.' },
  { category: 'Customers & Billing', term: 'VAT', definition: 'Value Added Tax. Applied to invoices where applicable per Nigerian tax regulations (currently 7.5%).' },

  /* ── Finance & Accounting ── */
  { category: 'Finance & Accounting', term: 'Reconciliation', definition: 'The process of verifying that money collected by riders (COD) matches what has been remitted and recorded in the system.' },
  { category: 'Finance & Accounting', term: 'Revenue', definition: 'All income generated by City Riders, including delivery fees, COD handling charges, and other service fees.' },
  { category: 'Finance & Accounting', term: 'Expense', definition: 'A business cost recorded in the system, e.g. fuel, rider salaries, vehicle maintenance, marketing.' },
  { category: 'Finance & Accounting', term: 'Expense Approval Threshold', definition: 'The maximum expense amount that can be approved without additional authorization. Expenses above this threshold require manager sign-off.' },
  { category: 'Finance & Accounting', term: 'Year-on-Year (YoY)', definition: 'A comparison of a metric (revenue, deliveries, etc.) against the same period in the previous year, expressed as a percentage change.' },

  /* ── Package Statuses ── */
  { category: 'Package Statuses', term: 'REGISTERED', definition: 'Package has been recorded in the system but not yet assigned to a rider.' },
  { category: 'Package Statuses', term: 'AWAITING ASSIGNMENT', definition: 'Package is queued and waiting for a rider to be assigned.' },
  { category: 'Package Statuses', term: 'ASSIGNED', definition: 'A rider has been assigned and is yet to pick up the package.' },
  { category: 'Package Statuses', term: 'PICKED UP', definition: 'The rider has collected the package from the sender.' },
  { category: 'Package Statuses', term: 'IN TRANSIT', definition: 'The package is on its way to the recipient\'s address.' },
  { category: 'Package Statuses', term: 'DELIVERY ATTEMPTED', definition: 'The rider reached the delivery address but could not complete delivery (recipient absent, wrong address, etc.).' },
  { category: 'Package Statuses', term: 'DELIVERED', definition: 'The package has been successfully handed to the recipient.' },
  { category: 'Package Statuses', term: 'RETURNED', definition: 'The package could not be delivered and has been returned to the sender or branch.' },
  { category: 'Package Statuses', term: 'CANCELLED', definition: 'The delivery has been cancelled by the customer or operations team.' },

  /* ── Customer Service ── */
  { category: 'Customer Service', term: 'Interaction Log', definition: 'A recorded note of a conversation or contact with a customer, including the channel, summary, action taken, and outcome.' },
  { category: 'Customer Service', term: 'Escalation', definition: 'Referring a complaint or issue to a senior team member or department when it cannot be resolved at the first point of contact.' },
  { category: 'Customer Service', term: 'Resolution', definition: 'The final outcome of a customer complaint or delivery issue — e.g. re-delivery, refund, or apology.' },
];

const CATEGORIES = Array.from(new Set(TERMS.map(t => t.category)));

export function GlossarySettings() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = TERMS.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q);
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Glossary</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Definitions of terms used across the City Riders platform.</p>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <SearchLg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search terms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms grouped by category */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No terms match your search.</p>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter(cat => activeCategory === 'All' || cat === activeCategory).map(cat => {
            const items = filtered.filter(t => t.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat}</h3>
                <dl className="rounded-xl border divide-y overflow-hidden">
                  {items.map(t => (
                    <div key={t.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] hover:bg-muted/30 transition-colors">
                      <dt className="text-sm font-semibold text-foreground">{t.term}</dt>
                      <dd className="text-sm text-muted-foreground leading-relaxed">{t.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{TERMS.length} terms defined · {filtered.length} shown</p>
    </div>
  );
}
