import { Model } from '@nozbe/watermelondb'
import { field, text, date, immutableRelation, children, lazy, readonly } from '@nozbe/watermelondb/decorators'

export default class List extends Model {
  static table = 'lists'

  static associations = {
    users: { type: 'belongs_to' as const, key: 'owner_id' },
    items: { type: 'has_many' as const, foreignKey: 'list_id' },
    librarylists: { type: 'has_many' as const, foreignKey: 'list_id' },
  }

  @field('id2') id2!: string // id2 is the id from the supabase database
  @field('owner_id') owner_id!: string
  @text('title') title!: string
  @text('description') description!: string | null
  @text('cover_image_url') cover_image_url!: string | null
  @field('is_public') is_public!: boolean
  @field('current_user_id') current_user_id!: string | null
  @field('folder_id') folder_id!: string | null
  @field('sort_order') sort_order!: string
  @field('today') today!: boolean
  @field('current_item') current_item!: string | null
  @field('notify_on_new') notify_on_new!: boolean
  @field('notify_time') notify_time!: Date | null
  @field('notify_days') notify_days!: string | null
  @field('order_index') order_index!: number
  @date('created_at') created_at!: Date
  @date('updated_at') updated_at!: Date

  @immutableRelation('users', 'owner_id') owner!: any
  @children('items') items!: any
  @children('librarylists') libraryLists!: any
} 