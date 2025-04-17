import { database } from '.';
import { Q } from '@nozbe/watermelondb';
import { User as wUser, Folder as wFolder, List as wList, Item as wItem, LibraryList as wLibraryList } from './models';

import { User, Folder, List, Item } from '../classes';

import { v4 as uuidv4 } from 'uuid';
import { syncUserData } from './syncService';

// Fallback UUID generator in case the standard one fails
function generateFallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Safe UUID generator that tries the standard method first, then falls back
function safeUUID() {
  try {
    return uuidv4();
  } catch (error) {
    console.warn('Standard UUID generation failed, using fallback method:', error);
    return generateFallbackUUID();
  }
}

// ======= SINGLE STORE FUNCTIONS =======

export async function storeNewUser(user: User) {
  const idToUse = user.id || safeUUID();
  console.log('[storeNewUser] Incoming user.id:', user.id, 'id2 to use:', idToUse);
  // Check if user already exists
  const existing = await database.get<wUser>('users').query(Q.where('id2', idToUse)).fetch();
  if (existing.length > 0) {
    console.log('[storeNewUser] User with id2 already exists, skipping creation:', idToUse);
    return;
  }
  await database.write(async () => {
    await database.get<wUser>('users').create(raw => {
      raw.id2 = idToUse;
      raw.username = user.username;
      raw.email = user.email;
      raw.avatar_url = user.avatarURL;
      raw.notifs_enabled = user.notifsEnabled;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });
  console.log('User stored in k;ajsdhfi;asufhf');
  // Sync after user creation
  console.log("SYNCING NEW USER KJAHIUOFDHIUOHUIOWRHGWV");
  await syncUserData();
}

export async function storeNewFolder(folder: Folder) {
  console.log('[storeNewFolder] Incoming folder.id:', folder.id);

  await database.write(async () => {
    await database.get<wFolder>('folders').create(raw => {
      raw.id2 = folder.id || safeUUID();
      raw.owner_id = folder.ownerID;
      raw.parent_folder_id = folder.parentFolderID ?? null;
      raw.name = folder.name;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });
  // Sync after folder creation
  await syncUserData();
}

export async function storeNewList(list: List) {
  console.log('[storeNewList] Incoming list.id:', list.id);

  const idToUse = list.id || safeUUID();

  await database.write(async () => {
    await database.get<wList>('lists').create(raw => {
      raw.id2 = idToUse;
      raw.owner_id = list.ownerID;
      raw.title = list.title;
      raw.description = list.description;
      raw.cover_image_url = list.coverImageURL;
      raw.is_public = list.isPublic;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });

  await database.write(async () => {
    await database.get<wLibraryList>('librarylists').create(raw => {
      raw.id2 = safeUUID();
      raw.owner_id = list.ownerID;
      raw.list_id = idToUse;
      raw.folder_id = list.folderID;
      raw.sort_order = list.sortOrder;
      raw.today = list.today;
      raw.current_item = list.currentItem;
      raw.notify_on_new = list.notifyOnNew;
      raw.notify_time = list.notifyTime;
      raw.notify_days = list.notifyDays;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });
  // Sync after list creation
  await syncUserData();
}

export async function storeNewItem(item: Item) {
  console.log('[storeNewItem] Incoming item.id:', item.id);

  await database.write(async () => {
    await database.get<wItem>('items').create(raw => {
      raw.id2 = item.id || safeUUID();
      raw.list_id = item.listID;
      raw.title = item.title ?? '';
      raw.content = item.content;
      raw.image_urls = item.imageURLs ?? [];
      raw.order_index = item.orderIndex ?? 0;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });
  // Sync after item creation
  await syncUserData();
}

// ======= SINGLE RETRIEVE FUNCTIONS =======

export async function retrievePopulatedUser(userId: string): Promise<User | null> {
  try {
    const data = await database.get<wUser>('users')
      .query(Q.where('id2', userId))
      .fetch();
    
    if (!data || data.length === 0) {
      return null;
    }

    console.log('Retrieved user in watermelon with id:', data[0].id2);

    const user = new User(
      data[0].id2,
      data[0].username,
      data[0].email,
      data[0].avatar_url,
      data[0].notifs_enabled
    );

    try {
      await populateLibrary(user);
    } catch (libraryError) {
      console.error('Error populating user library:', libraryError);
    }

    return user;
  } catch (error) {
    console.error('Error retrieving user:', error);
    return null;
  }
}

export async function retrieveFolder(folderId: string, ownerID: string): Promise<Folder | null> {
  try {
    const data = await database.get<wFolder>('folders')
      .query(
        Q.where('id2', folderId),
        Q.where('owner_id', ownerID)
      )
      .fetch();

    if (!data || data.length === 0) {
      return null;
    }

    const folder = new Folder(
      data[0].id2,
      data[0].owner_id,
      data[0].parent_folder_id,
      data[0].name
    );

    return folder;
  } catch (error) {
    console.error('Error retrieving folder:', error);
    return null;
  }
}

export async function retrieveList(userID: string, listId: string): Promise<List | null> {
  try {
    const list = await database.get<wList>('lists')
      .query(Q.where('id2', listId))
      .fetch();

    if (!list || list.length === 0) {
      return null;
    }

    // Get library configuration if it exists
    const libraryList = await database.get<wLibraryList>('librarylists')
      .query(
        Q.where('owner_id', userID),
        Q.where('list_id', listId)
      )
      .fetch();

    if (libraryList.length != 0) {
      console.error('Library list not found');
    }

    const liblist = new List(
      list[0].id2,
      list[0].owner_id,
      list[0].title,
      list[0].description,
      list[0].cover_image_url,
      list[0].is_public,
      userID,
      libraryList[0].folder_id,
      libraryList[0].sort_order,
      libraryList[0].today,
      libraryList[0].current_item,
      libraryList[0].notify_on_new,
      libraryList[0].notify_time,
      libraryList[0].notify_days,
      libraryList[0].order_index
    );

    return liblist;
  } catch (error) {
    console.error('Error retrieving list:', error);
    return null;
  }
}

export async function retrieveItem(itemId: string): Promise<Item | null> {
  try {
    const data = await database.get<wItem>('items')
      .query(Q.where('id2', itemId))
      .fetch();

    if (!data || data.length === 0) {
      return null;
    }

    const item = new Item(
      data[0].id2,
      data[0].list_id,
      data[0].title,
      data[0].content,
      data[0].image_urls,
      data[0].order_index
    );

    return item;
  } catch (error) {
    console.error('Error retrieving item:', error);
    return null;
  }
}

// ======= LIBRARY FUNCTIONS =======

export async function populateLibrary(user: User) {
  try {
    await populateFolders(user);
  } catch (folderError) {
    console.error('Error populating folders:', folderError);
    user.rootFolders = [];
  }
  
  try {
    await populateUserLists(user);
  } catch (listsError) {
    console.error('Error populating user lists:', listsError);
    user.listMap = new Map();
  }
}

export async function populateUserLists(user: User) {
  try {
    const libraryLists = await database.get<wLibraryList>('librarylists')
      .query(Q.where('owner_id', user.id))
      .fetch();

    const lists: List[] = [];
    for (const libraryEntry of libraryLists) {
      const list = await database.get<wList>('lists')
        .query(Q.where('id2', libraryEntry.list_id))
        .fetch();

      if (!list || list.length === 0) {
        console.error('List not found');
        continue;
      }

      lists.push(new List(
        list[0].id2,
        list[0].owner_id,
        list[0].title,
        list[0].description,
        list[0].cover_image_url,
        list[0].is_public,
        user.id,
        libraryEntry.folder_id,
        libraryEntry.sort_order,
        libraryEntry.today,
        libraryEntry.current_item,
        libraryEntry.notify_on_new,
        libraryEntry.notify_time,
        libraryEntry.notify_days,
        libraryEntry.order_index
      ));
    }
    user.listMap = new Map(lists.map((list) => [list.id, list]));
  } catch (error) {
    console.error('Unexpected error in populateUserLists:', error);
    user.listMap = new Map();
  }
}

export async function populateFoldersListIDs(folder: Folder) {
  const libraryLists = await database.get<wLibraryList>('librarylists')
    .query(Q.where('folder_id', folder.id))
    .fetch();
  
  folder.listsIDs = libraryLists.map((entry) => entry.list_id);
}

export async function populateFolders(user: User) {
  try {
    const rootFolders = await database.get<wFolder>('folders')
      .query(
        Q.where('owner_id', user.id),
        Q.where('parent_folder_id', null)
      )
      .fetch();

    const folders = rootFolders.map((folder) => new Folder(
      folder.id2,
      folder.owner_id,
      folder.parent_folder_id,
      folder.name
    ));

    user.rootFolders = folders;
    
    for (const folder of user.rootFolders) {
      try {
        await populateFoldersListIDs(folder);
      } catch (error) {
        console.error(`Error populating folder lists for folder ${folder.id}:`, error);
        folder.listsIDs = [];
      }
      try {
        await populateSubFolders(folder);
      } catch (error) {
        console.error(`Error populating subfolders for folder ${folder.id}:`, error);
        folder.subFolders = [];
      }
    }
  } catch (error) {
    console.error('Unexpected error in populateFolders:', error);
    user.rootFolders = [];
  }
}

export async function populateSubFolders(folder: Folder) {
  const subFolders = await database.get<wFolder>('folders')
    .query(
      Q.where('owner_id', folder.ownerID),
      Q.where('parent_folder_id', folder.id)
    )
    .fetch();

  if (!subFolders.length) {
    folder.subFolders = [];
    return;
  }

  folder.subFolders = subFolders.map((folderData) =>
    new Folder(
      folderData.id2,
      folderData.owner_id,
      folderData.parent_folder_id,
      folderData.name
    )
  );

  for (const subFolder of folder.subFolders) {
    await populateFoldersListIDs(subFolder);
    await populateSubFolders(subFolder);
  }
}

// ======= SEARCH FUNCTIONS =======

export async function getUsersBySubstring(substring: string): Promise<User[]> {
  const users = await database.get<wUser>('users')
    .query(
      Q.where('username', Q.like(substring))
    )
    .fetch();

  return users.map((user) => new User(
    user.id2,
    user.username,
    user.email,
    user.avatar_url,
    user.notifs_enabled
  ));
}

export async function getPublicListsBySubstring(substring: string): Promise<List[]> {
  const lists = await database.get<wList>('lists')
    .query(
      Q.and(
        Q.where('is_public', true),
        Q.where('title', Q.like(substring))
      )
    )
    .fetch();

  return lists.map((list) => new List(
    list.id2,
    list.owner_id,
    list.title,
    list.description,
    list.cover_image_url,
    list.is_public,
    null,
    '',
    "date-first",
    false,
    null,
    false,
    null,
    null,
    0
  ));
}

export async function getPublicListsByUser(userId: string, viewerUserId?: string): Promise<List[]> {
  const lists = await database.get<wList>('lists')
    .query(
      Q.where('owner_id', userId),
      Q.where('is_public', true)
    )
    .fetch();

  return lists.map((list) => new List(
    list.id2,
    list.owner_id,
    list.title,
    list.description,
    list.cover_image_url,
    list.is_public,
    viewerUserId || null,
    '',
    "date-first",
    false,
    null,
    false,
    null,
    null,
    0
  ));
}

export async function getUserListsBySubstring(userID: string, substring: string): Promise<List[]> {
  const lists = await database.get<wList>('lists')
    .query(
      Q.and(
        Q.where('owner_id', userID),
        Q.where('title', Q.like(substring))
      )
    )
    .fetch();

  return lists.map((list) => new List(
    list.id2,
    list.owner_id,
    list.title,
    list.description,
    list.cover_image_url,
    list.is_public,
    userID,
    '',
    "date-first",
    false,
    null,
    false,
    null,
    null,
    0
  ));
}

export async function getLibraryItemsBySubstring(user: User, substring: string): Promise<Item[]> {
  const libraryListIDs = Array.from(user.listMap.keys());
  if (!libraryListIDs.length) {
    return [];
  }

  let items: Item[] = [];
  for (const listID of libraryListIDs) {
    const listItems = await database.get<wItem>('items')
      .query(
        Q.and(
          Q.where('list_id', listID),
          Q.or(
            Q.where('title', Q.like(substring)),
            Q.where('content', Q.like(substring))
          )
        )
      )
      .fetch();

    items = items.concat(listItems.map((item) => new Item(
      item.id2,
      item.list_id,
      item.title,
      item.content,
      item.image_urls,
      item.order_index
    )));
  }

  return items;
}

// ======= TODAY FUNCTIONS =======

export async function getTodayListsForUser(userId: string): Promise<List[]> {
  const libraryLists = await database.get<wLibraryList>('librarylists')
    .query(
      Q.where('owner_id', userId),
      Q.where('today', true)
    )
    .fetch();

  if (!libraryLists.length) {
    return [];
  }

  const lists: List[] = [];
  for (const libraryEntry of libraryLists) {
    const list = await database.get<wList>('lists')
      .find(libraryEntry.list_id);

    lists.push(new List(
      list.id2,
      list.owner_id,
      list.title,
      list.description,
      list.cover_image_url,
      list.is_public,
      userId,
      libraryEntry.folder_id,
      libraryEntry.sort_order,
      libraryEntry.today,
      libraryEntry.current_item,
      libraryEntry.notify_on_new,
      libraryEntry.notify_time,
      libraryEntry.notify_days,
      libraryEntry.order_index
    ));
  }

  return lists;
}

export async function getTodayItemsForUser(userId: string): Promise<Item[]> {
  const todayLists = await getTodayListsForUser(userId);
  if (!todayLists.length) {
    return [];
  }

  const listIds = todayLists.map(list => list.id);
  const items = await database.get<wItem>('items')
    .query(
      Q.where('list_id', Q.oneOf(listIds))
    )
    .fetch();

  return items.map((item) => new Item(
    item.id2,
    item.list_id,
    item.title,
    item.content,
    item.image_urls,
    item.order_index
  ));
}

export async function getItemsInList(listId: string): Promise<Item[]> {
  console.log('[getItemsInList] Starting to fetch items for list:', listId);
  const items = await database.get<wItem>('items')
    .query(Q.where('list_id', listId))
    .fetch();
  
  console.log('[getItemsInList] Retrieved items:', items.length);
  
  return items.map((item) => {
    console.log('[getItemsInList] Mapping item:', item.id2, item.title);
    return new Item(
      item.id2,
      item.list_id,
      item.title,
      item.content,
      item.image_urls,
      item.order_index
    );
  });
}

// ======= SINGLE UPDATE FUNCTIONS =======

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  await database.write(async () => {
    const user = await database.get<wUser>('users').find(userId);
    await user.update((raw: wUser) => {
      if (updates.username) raw.username = updates.username;
      if (updates.email) raw.email = updates.email;
      if (updates.avatarURL) raw.avatar_url = updates.avatarURL;
      if (updates.notifsEnabled !== undefined) raw.notifs_enabled = updates.notifsEnabled;
      raw.updated_at = new Date();
    });
  });
  // Sync after user update
  await syncUserData();
}

export async function updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
  await database.write(async () => {
    const folder = await database.get<wFolder>('folders').find(folderId);
    await folder.update((raw: wFolder) => {
      if (updates.name) raw.name = updates.name;
      if (updates.parentFolderID !== undefined) raw.parent_folder_id = updates.parentFolderID;
      raw.updated_at = new Date();
    });
  });
  // Sync after folder update
  await syncUserData();
}

export async function updateList(listId: string, updates: Partial<List>): Promise<void> {
  await database.write(async () => {
    const list = await database.get<wList>('lists').find(listId);
    await list.update((raw: wList) => {
      if (updates.title) raw.title = updates.title;
      if (updates.description) raw.description = updates.description;
      if (updates.coverImageURL) raw.cover_image_url = updates.coverImageURL;
      if (updates.isPublic !== undefined) raw.is_public = updates.isPublic;
      raw.updated_at = new Date();
    });
  });
  // Sync after list update
  await syncUserData();
}

export async function updateItem(itemId: string, updates: Partial<Item>): Promise<void> {
  await database.write(async () => {
    const item = await database.get<wItem>('items').query(Q.where('id2', itemId)).fetch();
    if (!item || item.length === 0) {
      throw new Error('Item not found');
    }
    await item[0].update((raw: wItem) => {
      if (updates.title) raw.title = updates.title;
      if (updates.content) raw.content = updates.content;
      if (updates.imageURLs) raw.image_urls = updates.imageURLs;
      if (updates.orderIndex !== undefined) raw.order_index = updates.orderIndex;
      raw.updated_at = new Date();
    });
  });
  // Sync after item update
  await syncUserData();
}

type SortOrder = "date-first" | "date-last" | "alphabetical" | "manual";
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export async function updateLibraryListConfig(userID: string, folderID: string, listID: string, config: {
  sortOrder?: SortOrder;
  today?: boolean;
  currentItem?: string | null;
  notifyOnNew?: boolean;
  notifyTime?: Date | null;
  notifyDays?: DayOfWeek | null;
  orderIndex?: number;
}): Promise<void> {
  await database.write(async () => {
    const libraryList = await database.get<wLibraryList>('librarylists')
      .query(
        Q.where('owner_id', userID),
        Q.where('folder_id', folderID),
        Q.where('list_id', listID)
      )
      .fetch();

    if (!libraryList.length) {
      throw new Error('List is not in user library');
    }

    await libraryList[0].update((raw: wLibraryList) => {
      if (config.sortOrder) raw.sort_order = config.sortOrder;
      if (config.today !== undefined) raw.today = config.today;
      if (config.currentItem !== undefined) raw.current_item = config.currentItem;
      if (config.notifyOnNew !== undefined) raw.notify_on_new = config.notifyOnNew;
      if (config.notifyTime) raw.notify_time = config.notifyTime;
      if (config.notifyDays) raw.notify_days = config.notifyDays;
      if (config.orderIndex !== undefined) raw.order_index = config.orderIndex;
      raw.updated_at = new Date();
    });
  });
}

// ======= SINGLE DELETE FUNCTIONS =======

export async function deleteUser(userId: string): Promise<void> {
  await database.write(async () => {
    const user = await database.get<wUser>('users').find(userId);
    await user.destroyPermanently();
  });
  // Sync after user deletion
  await syncUserData();
}

export async function deleteFolder(folderId: string): Promise<void> {
  await database.write(async () => {
    const folder = await database.get<wFolder>('folders').find(folderId);
    await folder.destroyPermanently();
  });
  // Sync after folder deletion
  await syncUserData();
}

export async function deleteList(listId: string): Promise<void> {
  await database.write(async () => {
    const list = await database.get<wList>('lists').find(listId);
    await list.destroyPermanently();
  });
  // Sync after list deletion
  await syncUserData();
}

export async function deleteItem(itemId: string): Promise<void> {
  await database.write(async () => {
    const item = await database.get<wItem>('items').find(itemId);
    await item.destroyPermanently();
  });
  // Sync after item deletion
  await syncUserData();
}

// ======= FOLDER-LISTS (LIBRARYLISTS) FUNCTIONS =======

interface LibraryConfig {
  sortOrder?: SortOrder;
  today?: boolean;
  currentItem?: string | null;
  notifyOnNew?: boolean;
  notifyTime?: Date | null;
  notifyDays?: DayOfWeek | null;
  orderIndex?: number;
}

export async function addListToFolder(ownerID: string, folderID: string, listID: string, config?: LibraryConfig) {
  await database.write(async () => {
    await database.get<wLibraryList>('librarylists').create((raw: wLibraryList) => {
      raw.owner_id = ownerID;
      raw.folder_id = folderID;
      raw.list_id = listID;
      raw.sort_order = config?.sortOrder || 'date-first';
      raw.today = config?.today || false;
      raw.current_item = config?.currentItem || null;
      raw.notify_on_new = config?.notifyOnNew || false;
      raw.notify_time = config?.notifyTime || null;
      raw.notify_days = config?.notifyDays || null;
      raw.order_index = config?.orderIndex || 0;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });
  // Sync after adding list to folder
  await syncUserData();
}

export async function removeListFromFolder(ownerID: string, folderID: string, listID: string) {
  await database.write(async () => {
    const libraryList = await database.get<wLibraryList>('librarylists')
      .query(
        Q.where('owner_id', ownerID),
        Q.where('folder_id', folderID),
        Q.where('list_id', listID)
      )
      .fetch();

    if (libraryList.length) {
      await libraryList[0].destroyPermanently();
    }
  });
  // Sync after removing list from folder
  await syncUserData();
}

export async function moveListToFolder(ownerID: string, oldFolderID: string, newFolderID: string, listID: string) {
  await database.write(async () => {
    const libraryList = await database.get<wLibraryList>('librarylists')
      .query(
        Q.where('owner_id', ownerID),
        Q.where('folder_id', oldFolderID),
        Q.where('list_id', listID)
      )
      .fetch();

    if (libraryList.length) {
      const oldConfig = libraryList[0];
      const oldCreatedAt = oldConfig.created_at || new Date();
      await oldConfig.destroyPermanently();

      await database.get<wLibraryList>('librarylists').create(raw => {
        raw.owner_id = ownerID;
        raw.folder_id = newFolderID;
        raw.list_id = listID;
        raw.sort_order = oldConfig.sort_order;
        raw.today = oldConfig.today;
        raw.current_item = oldConfig.current_item;
        raw.notify_on_new = oldConfig.notify_on_new;
        raw.notify_time = oldConfig.notify_time;
        raw.notify_days = oldConfig.notify_days;
        raw.order_index = oldConfig.order_index;
        raw.created_at = oldCreatedAt;
        raw.updated_at = new Date();
      });
    } else {
      // If no old config found, add with default settings
      await addListToFolder(ownerID, newFolderID, listID);
    }
  });
  // Sync after moving list to folder
  await syncUserData();
}

// ======= DATABASE CLEANUP =======

export async function deleteAllData(): Promise<void> {
  await database.write(async () => {
    // Delete all library lists first (due to foreign key constraints)
    const libraryLists = await database.get<wLibraryList>('librarylists').query().fetch();
    for (const libraryList of libraryLists) {
      await libraryList.destroyPermanently();
    }

    // Delete all items
    const items = await database.get<wItem>('items').query().fetch();
    for (const item of items) {
      await item.destroyPermanently();
    }

    // Delete all lists
    const lists = await database.get<wList>('lists').query().fetch();
    for (const list of lists) {
      await list.destroyPermanently();
    }

    // Delete all folders
    const folders = await database.get<wFolder>('folders').query().fetch();
    for (const folder of folders) {
      await folder.destroyPermanently();
    }

    // Delete all users
    const users = await database.get<wUser>('users').query().fetch();
    for (const user of users) {
      await user.destroyPermanently();
    }

    console.log('All wdb data deleted.');
  });
  // No need to sync after deleting all data
}