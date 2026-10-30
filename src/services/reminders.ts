import { Alert } from 'react-native';

import type { TratamientoItem } from '@/data/mock';

type NotificationsModule = typeof import('expo-notifications');

async function getNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function ensurePermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Notificaciones desactivadas',
      'Activá las notificaciones en los ajustes del dispositivo para recibir recordatorios de tus medicamentos.',
    );
  }
  return status === 'granted';
}

export async function scheduleTreatmentReminders(treatmentId: string, items: TratamientoItem[]): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const granted = await ensurePermissions();
  if (!granted) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(`treatment-${treatmentId}-`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const times = ['08:00', '14:00', '20:00'];
  for (const item of items) {
    const doses = item.taken.length || 1;
    for (let i = 0; i < doses; i++) {
      const [h, m] = times[i % times.length].split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        identifier: `treatment-${treatmentId}-${item.id}-${i}`,
        content: {
          title: 'Recordatorio de medicamento',
          body: `${item.medicine} — ${item.dose}`,
        },
        trigger: {
          type: 'daily',
          hour: h,
          minute: m,
        } as any,
      });
    }
  }
}

export async function cancelTreatmentReminders(treatmentId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(`treatment-${treatmentId}-`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}
