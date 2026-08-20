import Link from 'next/link';
import { LoginBackgroundSetting } from '@/components/domain/login-background-setting';
import { WorkshopSettingsCard } from '@/components/domain/workshop-settings-card';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>

      <LoginBackgroundSetting />
      <WorkshopSettingsCard />

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardBody className="flex items-center justify-between py-4">
          <p className="text-sm text-ink-secondary">Review every tracked change across the workshop.</p>
          <Link href="/audit-log" className="text-sm font-medium text-accent-600 hover:underline">
            View Audit Log →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
