import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, immutableRelation } from '@nozbe/watermelondb/decorators'

export default class Item extends Model {
  static table = 'items'

  static associations = {
    lists: { type: 'belongs_to' as const, key: 'list_id' },
  }

  @field('id2') id2!: string // id2 is the id from the supabase database
  @field('list_id') list_id!: string
  @field('content') content!: string 
  @field('image_urls') image_urls!: string[]
  @field('order_index') order_index!: number
  @date('created_at') created_at!: Date
  @date('updated_at') updated_at!: Date

  @immutableRelation('lists', 'list_id') list!: any
} 