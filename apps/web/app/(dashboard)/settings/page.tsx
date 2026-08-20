import { ComingSoon } from '@/components/domain/coming-soon';

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      phaseNote="Includes the workshop's home state (PATCH /tenants/me/settings) — required for accurate CGST/SGST/IGST splits on invoices. Set it via the API directly until this screen lands; see apps/api/README.md."
    />
  );
}
