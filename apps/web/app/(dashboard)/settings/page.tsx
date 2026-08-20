import { LoginBackgroundSetting } from '@/components/domain/login-background-setting';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>

      <LoginBackgroundSetting />

      <Card>
        <CardHeader>
          <CardTitle>Workshop</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-ink-secondary">
            Workshop-wide settings — including the home state required for accurate CGST/SGST/IGST invoice splits
            (<code className="num text-xs">PATCH /tenants/me/settings</code>) — aren&rsquo;t built into this screen
            yet. Set them via the API directly for now; see <code className="num text-xs">apps/api/README.md</code>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
