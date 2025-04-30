import { syncUserData } from './syncService';


// Module-level sync lock
let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;

// Function to process the sync with debounce and prevent concurrent writes
async function processSync() {
  // // console.log(`Sync call triggered at: ${new Date().toISOString()}`);
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (isSyncing) {
      // // console.log('Sync already in progress, skipping this execution.');
      return;
    }
    // // console.log(`Executing sync at: ${new Date().toISOString()}`);
    isSyncing = true;
    try {
      // // console.log('Starting sync operation');
      await syncUserData();
      // // console.log('Sync operation completed successfully');
    } catch (error) {
      console.error('Sync operation failed:', error);
    } finally {
      isSyncing = false;
    }
  }, 1000); // Wait 1 second to collect all sync calls
}

// Function to trigger a sync operation
export function iWantToSync() {
  processSync();
} 