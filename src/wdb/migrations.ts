import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'users',
          columns: [
            { name: 'id2', type: 'string' },
            { name: 'username', type: 'string' },
            { name: 'email', type: 'string' },
            { name: 'avatar_url', type: 'string', isOptional: true },
            { name: 'notifs_enabled', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'folders',
          columns: [
            { name: 'id2', type: 'string' },
            { name: 'owner_id', type: 'string', isIndexed: true },
            { name: 'parent_folder_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'lists',
          columns: [
            { name: 'id2', type: 'string' },
            { name: 'owner_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'cover_image_url', type: 'string', isOptional: true },
            { name: 'is_public', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'librarylists',
          columns: [
            { name: 'id2', type: 'string' },
            { name: 'owner_id', type: 'string', isIndexed: true },
            { name: 'folder_id', type: 'string', isIndexed: true },
            { name: 'list_id', type: 'string', isIndexed: true },
            { name: 'order_index', type: 'number' },
            { name: 'sort_order', type: 'string' },
            { name: 'today', type: 'boolean' },
            { name: 'current_item', type: 'string', isOptional: true },
            { name: 'notify_on_new', type: 'boolean' },
            { name: 'notify_time', type: 'number', isOptional: true },
            { name: 'notify_days', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'items',
          columns: [
            { name: 'id2', type: 'string' },
            { name: 'list_id', type: 'string', isIndexed: true },
            { name: 'content', type: 'string' },
            { name: 'image_urls', type: 'string' },
            { name: 'order_index', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
})
