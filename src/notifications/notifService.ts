// notificationManager.ts
import notifee, { AndroidImportance, TriggerType, TimestampTrigger, EventType } from '@notifee/react-native';
import { List } from '../classes/List';

export async function initNotifications() {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Schedule notifications for the next N items in a list, starting at a given time.
 * @param list List instance
 * @param startHour Hour to start scheduling (0-23)
 * @param startMinute Minute to start scheduling (0-59)
 * @param count Number of items to schedule
 * @param intervalDays Days between notifications (default 1)
 */
export async function scheduleBatchNotificationsForList(list: List, count: number) {
  // console.log('Scheduling batch notifications for list', list.title, count);
  const items = await (await import('../wdb/wdbService')).getItemsInList(list);
  if (!items.length) return;

  // Find the current item index
  const currentItemId = list.currentItem;
  let startIdx = 0;
  if (currentItemId) {
    startIdx = items.findIndex(i => i.id === currentItemId);
    if (startIdx === -1) startIdx = 0;
  }

  // Use list.notifyDays and list.notifyTime
  const notifyDays = list.notifyDays || ['mon','tue','wed','thu','fri','sat','sun'];
  const notifyTime = list.notifyTime || new Date();
  const dayOrder = ['sun','mon','tue','wed','thu','fri','sat'];

  // Find the next valid notification date
  function getNextNotificationDate(from: Date, allowedDays: string[], hour: number, minute: number) {
    let date = new Date(from);
    for (let i = 0; i < 7; i++) {
      date.setDate(from.getDate() + i);
      if (allowedDays.includes(dayOrder[date.getDay()])) {
        date.setHours(hour, minute, 0, 0);
        if (date > from) return new Date(date);
      }
    }
    // fallback: next week
    date.setDate(from.getDate() + 7);
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  let scheduled = 0;
  let idx = startIdx;
  let now = new Date();
  let fireDate = getNextNotificationDate(now, notifyDays, notifyTime.getHours(), notifyTime.getMinutes());

  while (scheduled < count && idx < items.length) {
    const item = items[idx];
    const notificationId = `notif-${list.id}-${item.id}`;
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireDate.getTime(),
    };
    // console.log('Scheduling notification for', item.content, fireDate);
    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: list.title || 'Of The Day',
        body: item.content.slice(0, 200) + (item.content.length > 200 ? '…' : ''),
        android: { channelId: 'default' },
        data: { listId: list.id, itemId: item.id },
      },
      trigger
    );
    // Find the next valid notification date
    fireDate = getNextNotificationDate(fireDate, notifyDays, notifyTime.getHours(), notifyTime.getMinutes());
    idx++;
    scheduled++;
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
      n.notification.id &&
      n.notification.id.startsWith(`notif-${list.id}-`)
    ) {
      await notifee.cancelNotification(n.notification.id);
    }
  }
}

export function registerNotificationListeners(onNotificationPress: (listId: string, itemId: string) => void) {
  const checkItemExists = async (listId: string, itemId: string) => {
    try {
      const { retrieveList } = await import('../wdb/wdbService');
      const list = await retrieveList(listId);
      if (!list) return false;
      const items = await (await import('../wdb/wdbService')).getItemsInList(list);
      return items.some((i: any) => i.id === itemId);
    } catch {
      return false;
    }
  };
  const fgUnsub = notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      const { listId, itemId } = detail.notification.data;
      if (typeof listId === 'string' && typeof itemId === 'string' && await checkItemExists(listId, itemId)) {
        onNotificationPress(listId, itemId);
      }
    }
  }) as unknown as () => void;
  const bgUnsub = notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      const { listId, itemId } = detail.notification.data;
      if (typeof listId === 'string' && typeof itemId === 'string' && await checkItemExists(listId, itemId)) {
        onNotificationPress(listId, itemId);
      }
    }
  }) as unknown as () => void;
  return () => {
    if (typeof fgUnsub === 'function') fgUnsub();
    if (typeof bgUnsub === 'function') bgUnsub();
  };
}