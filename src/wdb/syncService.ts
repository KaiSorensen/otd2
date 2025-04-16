import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '.';
import { User } from '../classes';
import { supabase } from '../supabase/supabase';

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

export async function syncUserData() {
  const logger = {};
  
  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        console.log("Pulling changes");
        const changes: any = {};
        const timestamp = Date.now();

        // For each table, fetch changes from Supabase
        for (const [watermelonTable, supabaseTable] of Object.entries(tableNameMap)) {
          const { data, error } = await supabase
            .from(supabaseTable.toLowerCase())
            .select('*')
            .gt('updatedat', new Date(lastPulledAt || 0).toISOString());

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
            Object.entries(fieldNameMap[watermelonTable]).forEach(([watermelonField, supabaseField]) => {
              let value = record[supabaseField.toLowerCase()];
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
          const recordsToUpsert = [
            ...tableChanges.created,
            ...tableChanges.updated
          ].map(record => {
            const transformedRecord: any = {};
            Object.entries(fieldNameMap[watermelonTable]).forEach(([watermelonField, supabaseField]) => {
              let value = record[watermelonField];
              // Convert date fields to ISO strings using Date's toISOString
              if (["created_at", "updated_at", "notify_time"].includes(watermelonField)) {
                value = value ? new Date(value).toISOString() : null;
              }
              transformedRecord[supabaseField] = value;
            });
            console.log(`[syncService] Prepared record to upsert for ${supabaseTable}:`, transformedRecord);
            return transformedRecord;
          });

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
    // Debounce sync calls to avoid too frequent syncing
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    
    syncTimeout = setTimeout(() => {
      syncUserData();
    }, 5000); // Wait 5 seconds after last change before syncing
  });
}

// Initialize sync when app starts
export async function initializeSync() {
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
      () => {
        // When remote changes are detected, trigger sync
        syncUserData();
      }
    )
    .subscribe();
    
  return subscription;
} 