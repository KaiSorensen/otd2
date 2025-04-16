import { Model } from '@nozbe/watermelondb'
import { field, text, date, immutableRelation, readonly } from '@nozbe/watermelondb/decorators'

export default class LibraryList extends Model {
  static table = 'librarylists'

  static associations = {
    users: { type: 'belongs_to' as const, key: 'owner_id' },
    folders: { type: 'belongs_to' as const, key: 'folder_id' },
    lists: { type: 'belongs_to' as const, key: 'list_id' },
  }

  @field('id2') id2!: string // id2 is the id from the supabase database
  @field('owner_id') owner_id!: string
  @field('folder_id') folder_id!: string
  @field('list_id') list_id!: string
  @field('order_index') order_index!: number
  @text('sort_order') sort_order!: 'date-first' | 'date-last' | 'alphabetical' | 'manual'
  @field('today') today!: boolean
  @field('current_item') current_item!: string | null
  @field('notify_on_new') notify_on_new!: boolean
  @field('current_user_id') current_user_id!: string | null
  @date('notify_time') notify_time!: Date | null
  @text('notify_days') notify_days!: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null
  @date('created_at') created_at!: Date
  @date('updated_at') updated_at!: Date

  @immutableRelation('users', 'owner_id') owner!: any
  @immutableRelation('folders', 'folder_id') folder!: any
  @immutableRelation('lists', 'list_id') list!: any
} 