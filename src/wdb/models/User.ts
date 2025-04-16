import { Model } from '@nozbe/watermelondb'
import { field, text, date, children, lazy, readonly } from '@nozbe/watermelondb/decorators'

export default class User extends Model {
  static table = 'users'

  static associations = {
    folders: { type: 'has_many' as const, foreignKey: 'owner_id' },
    lists: { type: 'has_many' as const, foreignKey: 'owner_id' },
    librarylists: { type: 'has_many' as const, foreignKey: 'owner_id' },
  }

  @field('id2') id2!: string // id2 is the id from the supabase database
  @field('username') username!: string
  @field('email') email!: string
  @field('avatar_url') avatar_url!: string | null
  @field('notifs_enabled') notifs_enabled!: boolean

  @readonly @date('created_at') created_at!: Date
  @readonly @date('updated_at') updated_at!: Date

  @children('folders') folders!: any
  @children('lists') lists!: any
  @children('librarylists') libraryLists!: any
} 