import Link from 'next/link';
import { CalendarPlus, ClipboardPlus, FileText, IndianRupee, UserPlus, Car } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { usePermission } from '@/lib/hooks/use-permission';

type Tone = 'accent' | 'blue' | 'teal' | 'fuchsia' | 'warning';

const ICON_COLOR: Record<Tone, string> = {
  accent: 'text-accent-600 dark:text-accent-400',
  blue: 'text-blue-600 dark:text-blue-400',
  teal: 'text-teal-600 dark:text-teal-400',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400',
  warning: 'text-warning-600 dark:text-warning-400',
};

// Every href already exists as a real page — this is a shortcut grid, not
// a new surface. "Record Payment" has no standalone page of its own
// (payments are recorded inline on an invoice, see RecordPaymentForm), so
// it points at the invoice list — the natural next step from here.
// UX-only gating below (usePermission) hides an action a role can't use;
// the destination page's own guard is still the real boundary, same
// caveat as every other usePermission() call in this app.
export function QuickActionsCard() {
  const canCreateJobCard = usePermission('job-card:create');
  const canCreateCustomer = usePermission('customer:create');
  const canCreateVehicle = usePermission('vehicle:create');
  const canCreateAppointment = usePermission('appointment:create');
  const canCreateEstimate = usePermission('estimate:create');
  const canViewInvoices = usePermission('invoice:read');

  const actions: { label: string; href: string; icon: typeof ClipboardPlus; tone: Tone; visible: boolean }[] = [
    { label: '+ New Job Card', href: '/job-cards/new', icon: ClipboardPlus, tone: 'accent', visible: canCreateJobCard },
    { label: '+ Customer', href: '/customers/new', icon: UserPlus, tone: 'blue', visible: canCreateCustomer },
    { label: '+ Vehicle', href: '/vehicles/new', icon: Car, tone: 'teal', visible: canCreateVehicle },
    { label: '+ Appointment', href: '/appointments/new', icon: CalendarPlus, tone: 'fuchsia', visible: canCreateAppointment },
    { label: 'Create Estimate', href: '/estimates/new', icon: FileText, tone: 'warning', visible: canCreateEstimate },
    { label: 'Record Payment', href: '/invoices', icon: IndianRupee, tone: 'accent', visible: canViewInvoices },
  ];
  const visibleActions = actions.filter((a) => a.visible);

  if (visibleActions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-xs text-ink-secondary">Frequently used actions</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleActions.map(({ label, href, icon: Icon, tone }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2.5 rounded-lg border border-line px-3 py-5 text-center transition-colors hover:border-accent-400 hover:bg-surface-hover"
            >
              <Icon className={`h-6 w-6 ${ICON_COLOR[tone]}`} aria-hidden />
              <span className="text-xs font-medium text-ink">{label}</span>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
