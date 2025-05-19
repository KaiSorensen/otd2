import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '.';
import { supabase } from '../supabase/supabase';
import { iWantToSync } from './pendingSyncService';
// Define the shape of the sync response
interface SyncResponse {
  changes: {
    [tableName: string]: {
      created: any[];
      updated: any[];
      deleted: string[];
    };
  };
  timestamp: number;
}

// Define the shape of the push changes
interface PushChanges {
  changes: {
    [tableName: string]: {
      created: any[];
      updated: any[];
      deleted: string[];
    };
  };
  lastPulledAt: number | null;
}

// Map WatermelonDB table names to Supabase table names
const tableNameMap: { [key: string]: string } = {
  users: 'users',
  folders: 'folders',
  lists: 'lists',
  items: 'items',
  librarylists: 'librarylists'
};

// Map WatermelonDB field names to Supabase field names
const fieldNameMap: { [key: string]: { [key: string]: string } } = {
  users: {
    id2: 'id',
    username: 'username',
    email: 'email',
    avatar_url: 'avatarurl',
    notifs_enabled: 'notifsenabled',
    selected_today_list_index: 'selectedtodaylistindex',
    date_last_rotated_today_lists: 'datelastrotatedtodaylists',
    created_at: 'createdat',
    updated_at: 'updatedat'
  },
  folders: {
    id2: 'id',
    owner_id: 'ownerid',
    parent_folder_id: 'parentfolderid',
    name: 'name',
    created_at: 'createdat',
    updated_at: 'updatedat'
  },
  lists: {
    id2: 'id',
    owner_id: 'ownerid',
    title: 'title',
    description: 'description',
    cover_image_url: 'coverimageurl',
    is_public: 'ispublic',
    created_at: 'createdat',
    updated_at: 'updatedat'
  },
  items: {
    id2: 'id',
    list_id: 'listid',
    content: 'content',
    image_urls: 'imageurls',
    order_index: 'orderindex',
    created_at: 'createdat',
    updated_at: 'updatedat'
  },
  librarylists: {
    id2: 'id',
    owner_id: 'ownerid',
    folder_id: 'folderid',
    list_id: 'listid',
    order_index: 'orderindex',
    sort_order: 'sortorder',
    today: 'today',
    current_item: 'currentitem',
    notify_on_new: 'notifyonnew',
    notify_time: 'notifytime',
    notify_days: 'notifydays',
    created_at: 'createdat',
    updated_at: 'updatedat'
  }
};


// Module-level d lock
let isSyncing = false;

async function waitForSession(): Promise<any> {
  let { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) return session;

  // Listen for session creation
  return new Promise((resolve) => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        listener.subscription.unsubscribe();
        resolve(session);
      }
    });
  });
}

// Utility to normalize date fields from Supabase
function normalizeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function syncUserData() {
  // Wait for session before proceeding
  await waitForSession();

  // If already syncing, skip this sync
  if (isSyncing) {
    // // console.log('Sync already in progress, skipping...');
    return false;
  }

  const logger = {};
  
  try {
    isSyncing = true;
    await synchronize({
      database,
      sendCreatedAsUpdated: true,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        console.log('[pullChanges] Start', { lastPulledAt, schemaVersion, migration });
        const changes: any = {};
        const timestamp = Date.now();

        // For each table, fetch changes from Supabase
        for (const [watermelonTable, supabaseTable] of Object.entries(tableNameMap)) {
          let query = supabase
            .from(supabaseTable.toLowerCase())
            .select('*')
          console.log(`[pullChanges][${watermelonTable}] Querying for records updated after`, new Date(lastPulledAt || 0).toISOString());

          // Only pull the current user's data for users table
          if (watermelonTable === 'users') {
            const { data: { session } } = await supabase.auth.getSession();
            console.log(`[pullChanges][users] session.user.id:`, session?.user?.id);
            if (session?.user?.id) {
              query = query.eq('id', session.user.id);
              console.log(`[pullChanges][users] Filtering for user id:`, session.user.id);
            } else {
              console.log('[pullChanges][users] No session, skipping users table');
              continue;
            }
          }

          // For folders table, only pull folders owned by the current user
          if (watermelonTable === 'folders') {
            const { data: { session } } = await supabase.auth.getSession();
            console.log(`[pullChanges][folders] session.user.id:`, session?.user?.id);
            if (session?.user?.id) {
              query = query.eq('ownerid', session.user.id);
              console.log(`[pullChanges][folders] Filtering for ownerid:`, session.user.id);
            } else {
              console.log('[pullChanges][folders] No session, skipping folders table');
              continue;
            }
          }

          // For lists table, only pull lists that are in the user's library
          if (watermelonTable === 'lists') {
            const { data: { session } } = await supabase.auth.getSession();
            console.log(`[pullChanges][lists] session.user.id:`, session?.user?.id);
            if (session?.user?.id) {
              const { data: libraryLists } = await supabase
                .from('librarylists')
                .select('list_id')
                .eq('ownerid', session.user.id);
              console.log(`[pullChanges][lists] libraryLists:`, libraryLists);
              if (libraryLists && libraryLists.length > 0) {
                const listIds = libraryLists.map(lib => lib.list_id);
                console.log(`[pullChanges][lists] Filtering for list ids:`, listIds);
                query = query.in('id', listIds);
              } else {
                console.log('[pullChanges][lists] No library lists, skipping lists table');
                continue;
              }
            } else {
              console.log('[pullChanges][lists] No session, skipping lists table');
              continue;
            }
          }

          // For librarylists table, pull entries stored under the user's id as the ownerid
          if (watermelonTable === 'librarylists') {
            const { data: { session } } = await supabase.auth.getSession();
            console.log(`[pullChanges][librarylists] session.user.id:`, session?.user?.id);
            if (session?.user?.id) {
              query = query.eq('ownerid', session.user.id);
              console.log(`[pullChanges][librarylists] Filtering for ownerid:`, session.user.id);
            } else {
              console.log('[pullChanges][librarylists] No session, skipping librarylists table');
              continue;
            }
          }

          // For items table, only pull items that belong to lists in the user's library
          if (watermelonTable === 'items') {
            const { data: { session } } = await supabase.auth.getSession();
            console.log(`[pullChanges][items] session.user.id:`, session?.user?.id);
            if (session?.user?.id) {
              const { data: libraryLists } = await supabase
                .from('librarylists')
                .select('list_id')
                .eq('ownerid', session.user.id);
              console.log(`[pullChanges][items] libraryLists:`, libraryLists);
              if (libraryLists && libraryLists.length > 0) {
                const listIds = libraryLists.map(lib => lib.list_id);
                console.log(`[pullChanges][items] Filtering for listids:`, listIds);
                query = query.in('listid', listIds);
              } else {
                console.log('[pullChanges][items] No library lists, skipping items table');
                continue;
              }
            } else {
              console.log('[pullChanges][items] No session, skipping items table');
              continue;
            }
          }
          

          const { data, error } = await query;
          console.log(`[pullChanges][${watermelonTable}] Query:`, query, 'Result:', data, 'Error:', error);

          if (error) throw error;

          // // // console.log(`[syncService] Pulled data for table ${supabaseTable}:`, data);

          if (!changes[watermelonTable]) {
            changes[watermelonTable] = {
              created: [],
              updated: [],
              deleted: []
            };
          }

          // Transform Supabase data to Watermelon format
          data?.forEach(record => {
            const transformedRecord: any = {};
            transformedRecord.id = record.id;
            Object.entries(fieldNameMap[watermelonTable]).forEach(([watermelonField, supabaseField]) => {
              let value = record[supabaseField];
              if (["created_at", "updated_at", "notify_time", "date_last_rotated_today_lists"].includes(watermelonField)) {
                value = normalizeDate(value);
              }
              transformedRecord[watermelonField] = value;
              if (watermelonField === 'id2' || watermelonField === 'id') {
                console.log(`[pullChanges][${watermelonTable}] Mapping id:`, record[supabaseField], '->', value);
              }
            });
            console.log(`[pullChanges][${watermelonTable}] Transformed record:`, transformedRecord);
            changes[watermelonTable].updated.push(transformedRecord);
          });
        }

        console.log('[pullChanges] All pulled and transformed changes:', changes);

        // Cleanup duplicates after pulling changes
        // await cleanupDuplicateLibraryLists();

        return {
          changes,
          timestamp
        };
      },
      pushChanges: async ({ changes, lastPulledAt }: PushChanges) => {
        console.log('[pushChanges] Start', { changes, lastPulledAt });
        for (const [watermelonTable, tableChanges] of Object.entries(changes)) {
          const supabaseTable = tableNameMap[watermelonTable];
          console.log(`[pushChanges][${watermelonTable}] Processing table. Created:`, tableChanges.created.length, 'Updated:', tableChanges.updated.length, 'Deleted:', tableChanges.deleted.length);
          
          // // Skip user deletions entirely
          // if (watermelonTable === 'users' && tableChanges.deleted.length > 0) {
          // // // console.log('[syncService] Skipping user deletions for security');
          //   continue;
          // }
          
          // Handle created and updated records
          let recordsToUpsert = [
            ...tableChanges.created,
            ...tableChanges.updated
          ].map(record => {
            const transformedRecord: any = {};
            Object.entries(fieldNameMap[watermelonTable]).forEach(([watermelonField, supabaseField]) => {
              let value = record[watermelonField];
              if (watermelonTable === 'items' && (watermelonField === 'image_urls' || watermelonField === 'imageurls')) {
                if (!Array.isArray(value)) value = [];
              }
              if (["created_at", "updated_at", "notify_time", "date_last_rotated_today_lists"].includes(watermelonField)) {
                if (!value && watermelonField === "created_at") {
                  value = new Date().toISOString(); // fallback to now if missing
                } else {
                  value = value ? new Date(value).toISOString() : null;
                }
              }
              transformedRecord[supabaseField] = value;
              if (watermelonField === 'id2' || watermelonField === 'id') {
                console.log(`[pushChanges][${watermelonTable}] Upserting id:`, value);
              }
            });
            console.log(`[pushChanges][${watermelonTable}] Prepared record to upsert:`, transformedRecord);
            return transformedRecord;
          });

          if (watermelonTable === 'folders' || watermelonTable === 'librarylists') {
            console.log(`[pushChanges][${watermelonTable}] recordsToUpsert:`, recordsToUpsert);
          }

          // Filter out lists that don't belong to the current user
          if (watermelonTable === 'lists') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              recordsToUpsert = recordsToUpsert.filter(record => {
                const isOwner = record.ownerid === session.user.id;
                console.log(`[pushChanges][lists] Filtering upsert for ownerid:`, record.ownerid, '==', session.user.id, '?', isOwner);
                return isOwner;
              });
            }
          }

          // Filter out items that don't belong to lists owned by the current user
          if (watermelonTable === 'items') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              const { data: userLists } = await supabase
                .from('lists')
                .select('id')
                .eq('ownerid', session.user.id);
              
              if (userLists) {
                const userListIds = userLists.map(list => list.id);
                recordsToUpsert = recordsToUpsert.filter(record => {
                  const belongsToUserList = userListIds.includes(record.listid);
                  console.log(`[pushChanges][items] Filtering upsert for listid:`, record.listid, 'in', userListIds, '?', belongsToUserList);
                  return belongsToUserList;
                });
              }
            }
          }

          // // // console.log(`[syncService] All records to upsert for ${supabaseTable}:`, recordsToUpsert);

          if (recordsToUpsert.length > 0) {
            console.log(`[pushChanges][${watermelonTable}] Upserting records:`, recordsToUpsert.map(r => r.id || r.id2));
            const { error } = await supabase
              .from(supabaseTable)
              .upsert(recordsToUpsert);

            if (error) {
              console.error(`[pushChanges][${watermelonTable}] upsert error:`, error);
              throw error;
            }
          }

          // Handle deleted records
          if (tableChanges.deleted.length > 0) {
            console.log(`[pushChanges][${watermelonTable}] Handling deletions:`, tableChanges.deleted);
            let storedDeletions: string[] = (database as any).adapter.deletedRecords?.[watermelonTable] || [];
            console.log(`[pushChanges][${watermelonTable}] Stored deletions:`, storedDeletions);
            
            if (storedDeletions.length > 0) {
              // Skip user deletions entirely
              if (watermelonTable === 'users') {
                console.log('[pushChanges][users] Skipping user deletions for security');
                return;
              }

              // For lists, only allow deletion of lists owned by the current user
              if (watermelonTable === 'lists') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                  const { data: userLists } = await supabase
                    .from('lists')
                    .select('id')
                    .eq('ownerid', session.user.id)
                    .in('id', storedDeletions);
                  
                  if (userLists) {
                    const userListIds = userLists.map(list => list.id);
                    storedDeletions = storedDeletions.filter(id => {
                      const isUserList = userListIds.includes(id);
                      console.log(`[pushChanges][lists] Deletion id:`, id, 'is user list?', isUserList);
                      return isUserList;
                    });
                  } else {
                    storedDeletions = [];
                  }
                } else {
                  storedDeletions = [];
                }
              }

              // For items, only allow deletion of items belonging to lists owned by the current user
              if (watermelonTable === 'items') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                  // Get all lists owned by the current user
                  const { data: userLists } = await supabase
                    .from('lists')
                    .select('id')
                    .eq('ownerid', session.user.id);
                  
                  if (userLists) {
                    const userListIds = userLists.map(list => list.id);
                    // Get items that belong to user's lists
                    const { data: userItems } = await supabase
                      .from('items')
                      .select('id')
                      .in('listid', userListIds)
                      .in('id', storedDeletions);
                    
                    if (userItems) {
                      const userItemIds = userItems.map(item => item.id);
                      storedDeletions = storedDeletions.filter(id => {
                        const isUserItem = userItemIds.includes(id);
                        console.log(`[pushChanges][items] Deletion id:`, id, 'is user item?', isUserItem);
                        return isUserItem;
                      });
                    } else {
                      storedDeletions = [];
                    }
                  } else {
                    storedDeletions = [];
                  }
                } else {
                  storedDeletions = [];
                }
              }

              if (storedDeletions.length > 0) {
                console.log(`[pushChanges][${watermelonTable}] Deleting records with ids:`, storedDeletions);
                const { error } = await supabase
                  .from(supabaseTable)
                  .delete()
                  .in('id', storedDeletions);

                if (error) {
                  console.error(`[pushChanges][${watermelonTable}] delete error:`, error);
                  throw error;
                }
                
                // Clear the stored deletions after successful sync
                (database as any).adapter.deletedRecords[watermelonTable] = [];
              } else {
                console.log(`[pushChanges][${watermelonTable}] No deletions to process after filtering.`);
              }
            }
          }
        }
        console.log('[pushChanges] Finished all tables.');
      },
      migrationsEnabledAtVersion: 1,
      log: logger,
    });

    // // console.log('Sync completed successfully');
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    return false;
  } finally {
    isSyncing = false;
  }
}

// // Helper function to check for unsynced changes
// export async function hasUnsyncedChanges() {
//   const { hasUnsyncedChanges } = await import('@nozbe/watermelondb/sync');
//   return hasUnsyncedChanges({ database });
// }

// // Helper function to set up sync on changes
// export function setupSyncOnChanges() {
//   let syncTimeout: NodeJS.Timeout | null = null;
  
//   const tables = ['users', 'folders', 'lists', 'items', 'librarylists'];
//   const changes = database.withChangesForTables(tables);
  
//   changes.subscribe(() => {
//     // Don't schedule a new sync if one is already in progress
//     if (isSyncing) return;
    
//     // Debounce sync calls to avoid too frequent syncing
//     if (syncTimeout) {
//       clearTimeout(syncTimeout);
//     }
    
//     iWantToSync();
//   });
// }

// Initialize sync when app starts
// export async function initializeSync() {
//   let syncTimeout: NodeJS.Timeout | null = null;
  
//   // Set up change listeners
//   // setupSyncOnChanges();
  
//   // Perform initial sync
//   iWantToSync();
  
//   // Set up Supabase realtime subscription for remote changes
//   const subscription = supabase
//     .channel('sync-changes')
//     .on('postgres_changes', 
//       { 
//         event: '*', 
//         schema: 'public'
//       }, 
//       async () => {
//         // Debounce remote changes to avoid rapid resyncs
//         if (syncTimeout) {
//           clearTimeout(syncTimeout);
//         }
//         iWantToSync();
//       }
//     )
//     .subscribe();
    
//   return subscription;
// }

// // Cleanup function to remove duplicate librarylists
// export async function cleanupDuplicateLibraryLists() {
//   // Fetch all librarylists
//   const { data: allLibraryLists, error } = await supabase
//     .from('librarylists')
//     .select('*');
//   if (error) {
//     console.error('[cleanupDuplicateLibraryLists] Error fetching librarylists:', error);
//     return;
//   }
//   if (!allLibraryLists) return;

//   // Group by (ownerid, folderid, listid)
//   const seen = new Map();
//   const duplicates = [];
//   for (const entry of allLibraryLists) {
//     const key = `${entry.ownerid}|${entry.folderid}|${entry.listid}`;
//     if (seen.has(key)) {
//       duplicates.push(entry.id);
//     } else {
//       seen.set(key, entry.id);
//     }
//   }

//   if (duplicates.length > 0) {
//     // Remove all duplicates
//     const { error: delError } = await supabase
//       .from('librarylists')
//       .delete()
//       .in('id', duplicates);
//     if (delError) {
//       console.error('[cleanupDuplicateLibraryLists] Error deleting duplicates:', delError);
//     } else {
//       // // console.log(`[cleanupDuplicateLibraryLists] Removed ${duplicates.length} duplicate librarylists entries.`);
//     }
//   } else {
//     // // console.log('[cleanupDuplicateLibraryLists] No duplicates found.');
//   }
// } 

// Call this once at app startup
export function setupAuthSyncTrigger() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      // Session created, trigger a pull
      iWantToSync();
    }
  });
} 