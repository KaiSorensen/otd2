import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Database } from '@nozbe/watermelondb';
import schema from './schema';
import migrations from './migrations';
import { Folder, List, Item, LibraryList, User } from './models';

const adapter = new SQLiteAdapter({
  dbName: 'wdb',
  schema,
  migrations,
});

// Create a single database instance
const database = new Database({
  adapter,
  modelClasses: [User, Folder, List, Item, LibraryList],
});

// Export the database instance
export { database };
export default database;
