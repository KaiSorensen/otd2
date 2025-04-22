import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '.';
import { supabase } from '../supabase/supabase';
import { User as wUser } from './models';

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
    title: 'title',
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

// Utility function to convert ISO string to Date or null
function isoToDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  return new Date(val);
}

// Module-level sync lock
let isSyncing = false;

export async function syncUserData() {
  // If already syncing, skip this sync
  if (isSyncing) {
    console.log('Sync already in progress, skipping...');
    return false;
  }

  const logger = {};
  
  try {
    isSyncing = true;
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        console.log("Pulling changes");
        const changes: any = {};
        const timestamp = Date.now();

        // For each table, fetch changes from Supabase
        for (const [watermelonTable, supabaseTable] of Object.entries(tableNameMap)) {
          let query = supabase
            .from(supabaseTable.toLowerCase())
            .select('*')
            .gt('updatedat', new Date(lastPulledAt || 0).toISOString());

          // Only pull the current user's data for users table
          if (watermelonTable === 'users') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              console.log("user sessoin id: ", session.user.id)
              query = query.eq('id', session.user.id);
            } else {
              // If no session, skip users table entirely
              continue;
            }
          }

          const { data, error } = await query;

          if (error) throw error;

          console.log(`[syncService] Pulled data for table ${supabaseTable}:`, data);

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
            // Add the id field that WatermelonDB requires
            transformedRecord.id = record.id;
            Object.entries(fieldNameMap[watermelonTable]).forEach(([watermelonField, supabaseField]) => {
              let value = record[supabaseField];
              // Convert date fields to Date objects
              if (["created_at", "updated_at", "notify_time"].includes(watermelonField)) {
                value = value ? new Date(value) : null;
              }
              transformedRecord[watermelonField] = value;
            });
            console.log(`[syncService] Transformed record for ${watermelonTable}:`, transformedRecord);
            // If the record was created after lastPulledAt, it's a new record
            if (new Date(record.createdat) > new Date(lastPulledAt || 0)) {
              changes[watermelonTable].created.push(transformedRecord);
            } else {
              changes[watermelonTable].updated.push(transformedRecord);
            }
          });
        }

        console.log('[syncService] All pulled and transformed changes:', changes);

        return {
          changes,
          timestamp
        };
      },
      pushChanges: async ({ changes, lastPulledAt }: PushChanges) => {
        console.log("Pushing changes");
        // For each table with changes, push to Supabase
        for (const [watermelonTable, tableChanges] of Object.entries(changes)) {
          const supabaseTable = tableNameMap[watermelonTable];
          
          // Handle created and updated records
          let recordsToUpsert = [
            ...tableChanges.created,
            ...tableChanges.updated
          ].map(record => {
            const transformedRecord: any = {};
            Object.entries(fieldNameMap[watermelonTable]).forEach(([watermelonField, supabaseField]) => {
              let value = record[watermelonField];
              // Fix for image_urls/imageurls: always send an array
              if (watermelonTable === 'items' && (watermelonField === 'image_urls' || watermelonField === 'imageurls')) {
                if (!Array.isArray(value)) value = [];
              }
              // Convert date fields to ISO strings
              if (["created_at", "updated_at", "notify_time"].includes(watermelonField)) {
                value = value ? new Date(value).toISOString() : null;
              }
              transformedRecord[supabaseField] = value;
            });
            console.log(`[syncService] Prepared record to upsert for ${supabaseTable}:`, transformedRecord);
            return transformedRecord;
          });

          // Filter out lists that don't belong to the current user
          if (watermelonTable === 'lists') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              recordsToUpsert = recordsToUpsert.filter(record => record.ownerid === session.user.id);
            }
          }

          // Filter out items that don't belong to lists owned by the current user
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
                recordsToUpsert = recordsToUpsert.filter(record => userListIds.includes(record.listid));
              }
            }
          }

          console.log(`[syncService] All records to upsert for ${supabaseTable}:`, recordsToUpsert);

          if (recordsToUpsert.length > 0) {
            const { error } = await supabase
              .from(supabaseTable)
              .upsert(recordsToUpsert);

            if (error) throw error;
          }

          // Handle deleted records
          if (tableChanges.deleted.length > 0) {
            console.log(`[syncService] Deleting records from ${supabaseTable}:`, tableChanges.deleted);
            const { error } = await supabase
              .from(supabaseTable)
              .delete()
              .in('id', tableChanges.deleted);

            if (error) throw error;
          }
        }
      },
      migrationsEnabledAtVersion: 1,
      log: logger,
    });

    console.log('Sync completed successfully');
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    return false;
  } finally {
    isSyncing = false;
  }
}

// Helper function to check for unsynced changes
export async function hasUnsyncedChanges() {
  const { hasUnsyncedChanges } = await import('@nozbe/watermelondb/sync');
  return hasUnsyncedChanges({ database });
}

// Helper function to set up sync on changes
export function setupSyncOnChanges() {
  let syncTimeout: NodeJS.Timeout | null = null;
  
  const tables = ['users', 'folders', 'lists', 'items', 'librarylists'];
  const changes = database.withChangesForTables(tables);
  
  changes.subscribe(() => {
    // Don't schedule a new sync if one is already in progress
    if (isSyncing) return;
    
    // Debounce sync calls to avoid too frequent syncing
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    
    syncTimeout = setTimeout(() => {
      syncUserData();
    }, 10000); // Increased debounce time to 10 seconds
  });
}

// Initialize sync when app starts
export async function initializeSync() {
  let syncTimeout: NodeJS.Timeout | null = null;
  
  // Set up change listeners
  setupSyncOnChanges();
  
  // Perform initial sync
  await syncUserData();
  
  // Set up Supabase realtime subscription for remote changes
  const subscription = supabase
    .channel('sync-changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public'
      }, 
      async () => {
        // Debounce remote changes to avoid rapid resyncs
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        syncTimeout = setTimeout(() => {
          syncUserData();
        }, 5000);
      }
    )
    .subscribe();
    
  return subscription;
} 