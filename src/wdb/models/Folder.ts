import { Model } from '@nozbe/watermelondb'
import { field, text, date, immutableRelation, children, lazy, readonly } from '@nozbe/watermelondb/decorators'

export default class Folder extends Model {
  static table = 'folders'

  static associations = {
    users: { type: 'belongs_to' as const, key: 'owner_id' },
    folders: { type: 'belongs_to' as const, key: 'parent_folder_id' },
    librarylists: { type: 'has_many' as const, foreignKey: 'folder_id' },
  }

  @field('id2') id2!: string // id2 is the id from the supabase database
  @field('owner_id') owner_id!: string
  @field('parent_folder_id') parent_folder_id!: string | null
  @text('name') name!: string
  @date('created_at') created_at!: Date
  @date('updated_at') updated_at!: Date

  @immutableRelation('users', 'owner_id') owner!: any
  @immutableRelation('folders', 'parent_folder_id') parentFolder!: any
  @children('librarylists') libraryLists!: any
} 