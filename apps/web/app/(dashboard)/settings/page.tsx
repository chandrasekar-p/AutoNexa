import Link from 'next/link';
import { LoginBackgroundSetting } from '@/components/domain/login-background-setting';
import { WorkshopSettingsCard } from '@/components/domain/workshop-settings-card';
import { ReminderSettingsCard } from '@/components/domain/reminder-settings-card';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex max-w-[1600px] flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <LoginBackgroundSetting />

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

          <Card>
            <CardHeader>
              <CardTitle>Message Deliveries</CardTitle>
            </CardHeader>
            <CardBody className="flex items-center justify-between py-4">
              <p className="text-sm text-ink-secondary">
                See what was sent (or skipped) across Email, SMS, WhatsApp, and Slack.
              </p>
              <Link href="/deliveries" className="text-sm font-medium text-accent-600 hover:underline">
                View Deliveries →
              </Link>
            </CardBody>
          </Card>

          <ReminderSettingsCard />
        </div>

        <div className="flex flex-col gap-6">
          <WorkshopSettingsCard />
        </div>
      </div>
    </div>
  );
}
