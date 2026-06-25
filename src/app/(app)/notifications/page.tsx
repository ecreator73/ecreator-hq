import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { notificationsService } from "@/server/services";
import { requireUser } from "@/lib/auth";
import type { Notification } from "@/types/entities";

export const metadata: Metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  await requireUser();
  let items: Notification[] = [];
  try {
    items = await notificationsService.listForUser(60);
  } catch {
    items = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Home"
        title="Benachrichtigungen"
        description="Hinweise zu Aufgaben, Zuweisungen, Kunden und Terminen."
      />
      <NotificationsList items={items} />
    </div>
  );
}
