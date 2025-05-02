// notificationManager.ts
import notifee, { AndroidImportance, TriggerType, TimestampTrigger } from '@notifee/react-native';
import { List } from '../classes/List';

export async function initNotifications() {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
}

// export async function scheduleTodayNotification(list: List, hour = 8, minute = 0) {
//   // Use the List class's getTodayItem method to get the current item
//   const item = await list.getTodayItem();
//   if (!item) return;
//   const content = item.content;

//   const fireDate = new Date();
//   fireDate.setHours(hour, minute, 0, 0);

//   if (Date.now() > fireDate.getTime()) return; // Don't schedule if it's already past

//   const trigger: TimestampTrigger = {
//     type: TriggerType.TIMESTAMP,
//     timestamp: fireDate.getTime(),
//   };

//   await notifee.createTriggerNotification(
//     {
//       title: 'Your Daily Insight',
//       body: content.slice(0, 200) + (content.length > 200 ? '…' : ''),
//       android: { channelId: 'default' },
//     },
//     trigger
//   );
// }

/**
 * Schedule notifications for the next N items in a list, starting at a given time.
 * @param list List instance
 * @param startHour Hour to start scheduling (0-23)
 * @param startMinute Minute to start scheduling (0-59)
 * @param count Number of items to schedule
 * @param intervalDays Days between notifications (default 1)
 */
export async function scheduleBatchNotificationsForList(list: List, startHour: number, startMinute: number, count: number, intervalDays: number = 1) {
  const items = await (await import('../wdb/wdbService')).getItemsInList(list);
  if (!items.length) return;

  // Find the current item index
  const currentItemId = list.currentItem;
  let startIdx = 0;
  if (currentItemId) {
    startIdx = items.findIndex(i => i.id === currentItemId);
    if (startIdx === -1) startIdx = 0;
  }

  // Schedule up to N notifications, wrapping if needed
  const now = new Date();
  let fireDate = new Date(now);
  fireDate.setHours(startHour, startMinute, 0, 0);
  if (fireDate < now) fireDate.setDate(fireDate.getDate() + 1);

  for (let i = 0; i < count; i++) {
    const item = items[(startIdx + i) % items.length];
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireDate.getTime(),
    };
    await notifee.createTriggerNotification(
      {
        title: list.title || 'Of The Day',
        body: item.content.slice(0, 200) + (item.content.length > 200 ? '…' : ''),
        android: { channelId: 'default' },
      },
      trigger
    );
    fireDate = new Date(fireDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }
}

/**
 * Cancel all scheduled notifications for a list (by matching notification title).
 * @param list List instance
 */
export async function cancelNotificationsForList(list: List) {
  const notifications = await notifee.getTriggerNotifications();
  for (const n of notifications) {
    if (
      n.notification &&
      (n.notification.title === list.title || n.notification.title === 'Of The Day') &&
      n.notification.id
    ) {
      await notifee.cancelNotification(n.notification.id);
    }
  }
}