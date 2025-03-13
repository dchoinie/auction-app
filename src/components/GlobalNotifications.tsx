"use client";

import { useNotifications } from "~/contexts/NotificationContext";
import UserNotification from "~/app/(auth)/dashboard/draft/components/UserNotification";

export default function GlobalNotifications() {
  const { notifications, dismissNotification } = useNotifications();

  return (
    <UserNotification
      notifications={notifications}
      onDismiss={dismissNotification}
    />
  );
}
