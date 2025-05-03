import BackgroundFetch from 'react-native-background-fetch';
import { scheduleBatchNotificationsForList, cancelNotificationsForList, initNotifications } from './notifService';
import { User } from '../classes/User';

/**
 * Initialize background fetch to refresh notifications for all 'today' lists every X days.
 * @param intervalDays How often to refresh notifications (default 3 days)
 * @param batchCount How many notifications to schedule per list (default 7)
 */
export async function initBackgroundService(user: User) {
    await initNotifications();

    const notificationLists = user.getNotificationLists();

    const notifsPerList = Math.min(64 / notificationLists.length, 32); // which means we'll have notifications ready for this many days
    const batchCount = Math.floor(notifsPerList);

    BackgroundFetch.configure(
        {
            minimumFetchInterval: notifsPerList * 24 * 60, // in minutes
            stopOnTerminate: false,
            enableHeadless: true,
            requiredNetworkType: BackgroundFetch.NETWORK_TYPE_NONE,
        },
        async (taskId) => {
            try {
                for (const list of notificationLists) {
                    if (list.notifyTime) {
                        await cancelNotificationsForList(list);
                        await scheduleBatchNotificationsForList(list, batchCount);
                    }
                }
            } catch (e) {
                // Optionally log error
            }
            BackgroundFetch.finish(taskId);
        },
        (error) => {
            // Optionally log error
        }
    );
}
