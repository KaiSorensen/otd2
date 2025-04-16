import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import schema from '../schema'
import { User, Folder, List, LibraryList, Item } from '../models'

// Create a test adapter
const adapter = new SQLiteAdapter({
  schema,
  // Use in-memory database for tests
  dbName: 'test',
})

// Create a test database
export const testDatabase = new Database({
  adapter,
  modelClasses: [User, Folder, List, LibraryList, Item],
})

// Helper function to reset the database between tests
export const resetDatabase = async () => {
  await testDatabase.write(async () => {
    // Delete all records from all tables
    await Promise.all([
      testDatabase.get('users').query().destroyAllPermanently(),
      testDatabase.get('folders').query().destroyAllPermanently(),
      testDatabase.get('lists').query().destroyAllPermanently(),
      testDatabase.get('librarylists').query().destroyAllPermanently(),
      testDatabase.get('items').query().destroyAllPermanently(),
    ])
  })
} 