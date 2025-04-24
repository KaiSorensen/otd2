import { database } from '.';
import { Q } from '@nozbe/watermelondb';
import { User as wUser, Folder as wFolder, List as wList, Item as wItem, LibraryList as wLibraryList } from './models';

import { User, Folder, List, Item } from '../classes';

import { v4 as uuidv4 } from 'uuid';
import { syncUserData } from './syncService';

// Fallback UUID generator in case the standard one fails
function generateFallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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

export async function storeNewList(list: List, adderID: string, folderID: string) {
  console.log('[storeNewList] Incoming list:', list.id);

  await database.write(async () => {
    await database.get<wList>('lists').create(raw => {
      raw.id2 = list.id;
      raw.owner_id = list.ownerID;
      raw.title = list.title;
      raw.description = list.description;
      raw.cover_image_url = list.coverImageURL;
      raw.is_public = list.isPublic;
      raw.created_at = new Date();
      raw.updated_at = new Date();
    });
  });

  console.log("[storeNewList] inserting library list", list.id);

  await database.write(async () => {
    await database.get<wLibraryList>('librarylists').create(raw => {
      const uuid = safeUUID();
      if (!uuid) {
        throw new Error('Failed to generate UUID for library list');
      }
      raw.id2 = uuid;
      raw.owner_id = adderID;
      raw.list_id = list.id;
      raw.folder_id = folderID;
      raw.sort_order = list.sortOrder || 'date-first';
      raw.today = list.today;
      raw.current_item = list.currentItem;
      raw.notify_on_new = list.notifyOnNew;
      raw.notify_time = list.notifyTime;
      raw.notify_days = list.notifyDays;
      raw.created_at = new Date();
      raw.updated_at = new Date();

      if (!list.currentItem) {
        initializeTodayItem(list);
      }
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

export async function retrieveList(listId: string): Promise<List | null> {
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
        Q.where('list_id', listId)
      )
      .fetch();

    if (libraryList.length === 0) {
      console.error('Library list not found');
      return null;
    }

    const liblist = new List(
      list[0].id2,
      list[0].owner_id,
      list[0].title,
      list[0].description,
      list[0].cover_image_url,
      list[0].is_public,
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
      data[0].order_index,
      data[0].created_at,
      data[0].updated_at
    );

    return item;
  } catch (error) {
    console.error('Error retrieving item:', error);
    return null;
  }
}

// ======= POPULATION FUNCTIONS =======

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
  console.log('getting library items by substring:', substring);
  console.log('user listMap size:', user.listMap.size);

  const libraryListIDs = Array.from(user.listMap.keys());
  console.log('library list IDs:', libraryListIDs);

  if (!libraryListIDs.length) {
    console.log('no library lists found');
    return [];
  }

  let items: Item[] = [];
  for (const listID of libraryListIDs) {
    console.log('searching items in list:', listID);
    const listItems = await database.get<wItem>('items')
      .query(
        Q.and(
          Q.where('list_id', listID),
          Q.or(
            Q.where('title', Q.like(`%${substring}%`)),
            Q.where('content', Q.like(`%${substring}%`))
          )
        )
      )
      .fetch();

    console.log('found items in list:', listItems.length);

    items = items.concat(listItems.map((item) => {
      console.log('mapping item:', item.id2, item.title);
      return new Item(
        item.id2,
        item.list_id,
        item.title,
        item.content,
        item.image_urls,
        item.order_index,
        item.created_at,
        item.updated_at
      );
    }));
  }

  console.log('total items found:', items.length);
  return items;
}

// ======= TODAY FUNCTIONS =======


// This is handled by Population functions and give it to the runtime objects
// export async function getTodayListsForUser(userId: string): Promise<List[]> {
//   const libraryLists = await database.get<wLibraryList>('librarylists')
//     .query(
//       Q.where('owner_id', userId),
//       Q.where('today', true)
//     )
//     .fetch();

//   if (!libraryLists.length) {
//     return [];
//   }

//   const lists: List[] = [];
//   for (const libraryEntry of libraryLists) {
//     const list = await database.get<wList>('lists')
//       .query(Q.where('id2', libraryEntry.list_id))
//       .fetch();

//     lists.push(new List(
//       list[0].id2,
//       list[0].owner_id,
//       list[0].title,
//       list[0].description,
//       list[0].cover_image_url,
//       list[0].is_public,
//       libraryEntry.folder_id,
//       libraryEntry.sort_order,
//       libraryEntry.today,
//       libraryEntry.current_item,
//       libraryEntry.notify_on_new,
//       libraryEntry.notify_time,
//       libraryEntry.notify_days,
//       libraryEntry.order_index
//     ));
//   }

//   return lists;
// }


// export async function getTodayItemsForUser(userId: string): Promise<Item[]> {
//   const todayLists = await getTodayListsForUser(userId);
//   if (!todayLists.length) {
//     return [];
//   }

//   const listIds = todayLists.map(list => list.id);
//   const items = await database.get<wItem>('items')
//     .query(
//       Q.where('list_id', Q.oneOf(listIds))
//     )
//     .fetch();

//   return items.map((item) => new Item(
//     item.id2,
//     item.list_id,
//     item.title,
//     item.content,
//     item.image_urls,
//     item.order_index,
//     item.created_at,
//     item.updated_at
//   ));
// }

export async function initializeTodayItem(list: List) {
  if (list.currentItem) {
    return;
  }

  const items = await getItemsInList(list);
  if (!items.length) {
    return;
  }
  list.currentItem = items[0].id;
  await updateList(list.id, { currentItem: list.currentItem });
}

export async function rotateTodayItemsAllLists(user: User) {
  const todayLists = user.getTodayLists();
  if (!todayLists.length) {
    console.log('no today lists found');
    return;
  }

  for (const list of todayLists) {
    rotateTodayItemForList(list, "next"); //this function call handles the database update
  }
}

export async function rotateTodayItemForList(list: List, direction: "next" | "prev") {
  if (direction !== "next" && direction !== "prev") {
    throw new Error("Invalid direction");
  }

  const items = await getItemsInList(list); // already sorted by sortOrder

  if (!items.length) {
    console.log('[rotateTodayItemForList] no items found');
    list.currentItem = null;
    await updateList(list.id, { currentItem: null });
    return;
  }
  if (items.length === 1) {
    console.log('[rotateTodayItemForList] only one item, no rotation needed');
    return;
  }

  const currentItemId = list.currentItem;
  if (!currentItemId) {
    console.log('[rotateTodayItemForList] no current item, THIS LOGICALLY SHOULD NOT HAPPEN, initializing item');
    await initializeTodayItem(list);
    return;
  }
  console.log('[rotateTodayItemForList] current item id:', currentItemId);
  // get index of current item
  const currentItemIndex = items.findIndex(item => item.id === currentItemId);
  // get next item id (wrapping around if at end)
  if (direction === "next") {
    const nextItemId = items[(currentItemIndex + 1) % items.length].id;
    // update list with next item
    list.currentItem = nextItemId;
    await updateList(list.id, { currentItem: nextItemId });
  } else if (direction === "prev") {
    const prevItemId = items[(currentItemIndex - 1 + items.length) % items.length].id;
    // update list with previous item
    list.currentItem = prevItemId;
    await updateList(list.id, { currentItem: prevItemId });
  }
}

export async function setTodayItemForList(listId: string, itemId: string) {
  await updateList(listId, { currentItem: itemId });
}

// ======= UPDATE FUNCTIONS =======

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  await database.write(async () => {
    const user = await database.get<wUser>('users').query(Q.where('id2', userId)).fetch();
    if (!user || user.length === 0) {
      throw new Error('User not found');
    }
    await user[0].update((raw: wUser) => {
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
    const folder = await database.get<wFolder>('folders').query(Q.where('id2', folderId)).fetch();
    if (!folder || folder.length === 0) {
      throw new Error('Folder not found');
    }
    await folder[0].update((raw: wFolder) => {
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
    const list = await database.get<wList>('lists').query(Q.where('id2', listId)).fetch();
    if (!list || list.length === 0) {
      throw new Error('List not found');
    }
    await list[0].update((raw: wList) => {
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
      if (updates.orderIndex) raw.order_index = updates.orderIndex;
      raw.updated_at = new Date();
    });
  });
  // Sync after item update
  await syncUserData();
}

type SortOrder = "date-first" | "date-last" | "alphabetical" | "manual";
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export async function updateLibraryList(ownerID: string, folderID: string, listID: string, config: {
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
        Q.where('owner_id', ownerID),
        Q.where('folder_id', folderID),
        Q.where('list_id', listID)
      )
      .fetch();



    if (libraryList.length === 0) {
      console.log('FAILED TO FIND LIBRARY LIST:');
      console.log('ownerID:', ownerID);
      console.log('folderID:', folderID);
      console.log('listID:', listID);
      throw new Error('LibraryList is not in user library');
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

// ======= DELETION FUNCTIONS =======

export async function deleteUser(userId: string): Promise<void> {
  await database.write(async () => {
    const user = await database.get<wUser>('users').query(Q.where('id2', userId)).fetch();
    if (!user || user.length === 0) {
      throw new Error('User not found');
    }
    await user[0].markAsDeleted();
  });
  // Sync after user deletion
  await syncUserData();
}

export async function deleteFolder(folderId: string): Promise<void> {
  await database.write(async () => {
    const folder = await database.get<wFolder>('folders').query(Q.where('id2', folderId)).fetch();
    if (!folder || folder.length === 0) {
      throw new Error('Folder not found');
    }
    // Store the id2 value before marking as deleted
    const id2 = folder[0].id2;
    await folder[0].markAsDeleted();
    // Add the id2 to the deleted array in the changes object
    (database as any).adapter.deletedRecords = (database as any).adapter.deletedRecords || {};
    (database as any).adapter.deletedRecords.folders = (database as any).adapter.deletedRecords.folders || [];
    (database as any).adapter.deletedRecords.folders.push(id2);
  });
  // Sync after folder deletion
  await syncUserData();
}

export async function deleteList(listId: string): Promise<void> {
  console.log('[deleteList] Starting to delete list:', listId);

  // First delete from librarylists
  console.log('[deleteList] Removing list config from library');
  await database.write(async () => {
    const libraryList = await database.get<wLibraryList>('librarylists').query(Q.where('list_id', listId)).fetch();
    if (libraryList.length) {
      const id2 = libraryList[0].id2;
      await libraryList[0].markAsDeleted();
      // Add the id2 to the deleted array in the changes object
      (database as any).adapter.deletedRecords = (database as any).adapter.deletedRecords || {};
      (database as any).adapter.deletedRecords.librarylists = (database as any).adapter.deletedRecords.librarylists || [];
      (database as any).adapter.deletedRecords.librarylists.push(id2);
    }
  });

  try {
    // Then delete from lists table
    console.log('[deleteList] Removing list from lists table');
    await database.write(async () => {
      const list = await database.get<wList>('lists').query(Q.where('id2', listId)).fetch();
      if (!list || list.length === 0) {
        throw new Error('List not found in lists table');
      }
      const id2 = list[0].id2;
      await list[0].markAsDeleted();
      // Add the id2 to the deleted array in the changes object
      (database as any).adapter.deletedRecords = (database as any).adapter.deletedRecords || {};
      (database as any).adapter.deletedRecords.lists = (database as any).adapter.deletedRecords.lists || [];
      (database as any).adapter.deletedRecords.lists.push(id2);
    });
  } catch (error) {
    console.log('[deleteList] list was ALREADY GONE. WHERE DID IT GO..??:');
  }

  // Finally remove items belonging to list from library
  console.log('[deleteList] Removing items from library');
  await database.write(async () => {
    const items = await database.get<wItem>('items').query(Q.where('list_id', listId)).fetch();
    if (items.length) {
      for (const item of items) {
        const id2 = item.id2;
        await item.markAsDeleted();
        // Add the id2 to the deleted array in the changes object
        (database as any).adapter.deletedRecords = (database as any).adapter.deletedRecords || {};
        (database as any).adapter.deletedRecords.items = (database as any).adapter.deletedRecords.items || [];
        (database as any).adapter.deletedRecords.items.push(id2);
      }
    }
  });

  // Sync after list deletion
  await syncUserData();
}
// TODO: what if a user deletes an item from a list than another user has in library? What happens to currentItem? 
// TODO: if last item, currentItem should be set to null, notifyOnNew should be set to false, today
// TODO: if first item, currentItem should be set to that item
export async function deleteItem(itemId: string): Promise<void> {
  await database.write(async () => {
    const item = await database.get<wItem>('items').query(Q.where('id2', itemId)).fetch();
    if (!item || item.length === 0) {
      throw new Error('Item not found');
    }
    const list = await retrieveList(item[0].list_id);
    if (list?.currentItem === itemId) {
      await rotateTodayItemForList(list, "next");
      
    }
    const id2 = item[0].id2;
    await item[0].markAsDeleted();
    // Add the id2 to the deleted array in the changes object
    (database as any).adapter.deletedRecords = (database as any).adapter.deletedRecords || {};
    (database as any).adapter.deletedRecords.items = (database as any).adapter.deletedRecords.items || [];
    (database as any).adapter.deletedRecords.items.push(id2);

  });

  // Sync after item deletion
  await syncUserData();
}


// ======= LIBRARY FUNCTIONS =======


export async function addItems(items: Item[]) {
  await database.write(async () => {
    for (const item of items) {
      await database.get<wItem>('items').create(raw => {
        raw.id2 = item.id;
        raw.list_id = item.listID;
        raw.title = item.title ?? '';
        raw.content = item.content ?? '';
        raw.image_urls = item.imageURLs ?? [];
        raw.order_index = item.orderIndex;
      });
    }
  });
  // Sync after adding items
  await syncUserData();
}

export async function getItemsInList(list: List): Promise<Item[]> {
  console.log('[getItemsInList] Starting to fetch items for list:', list.id);
  let itemsData = await database.get<wItem>('items')
    .query(Q.where('list_id', list.id))
    .fetch();

  console.log('[getItemsInList] Retrieved items:', itemsData.length);

  let itemsObjects = itemsData.map((item) => {
    console.log('[getItemsInList] Mapping item:', item.id2, item.title);
    return new Item(
      item.id2,
      item.list_id,
      item.title,
      item.content,
      item.image_urls,
      item.order_index,
      item.created_at,
      item.updated_at
    );
  });

  switch (list.sortOrder) {
    case "date-first":
      itemsObjects.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    break;
    case "date-last":
      itemsObjects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    break;
    case "alphabetical":
      itemsObjects.sort((a, b) => a.content.localeCompare(b.content));
    break;
    case "manual":
      itemsObjects.sort((a, b) => a.orderIndex - b.orderIndex);
    break;
  }

  return itemsObjects;
}

export async function switchFolderOfList(ownerID: string, oldFolderID: string, newFolderID: string, listID: string) {
  await database.write(async () => {
    const libraryList = await database.get<wLibraryList>('librarylists')
      .query(
        Q.where('owner_id', ownerID),
        Q.where('folder_id', oldFolderID),
        Q.where('list_id', listID)
      )
      .fetch();

      if (libraryList.length === 0) {
        console.log('[switchFolderOfList] FAILED TO FIND LIBRARY LIST:');
        console.log('ownerID:', ownerID);
        console.log('old folderID:', oldFolderID);
        console.log('new folderID:', newFolderID);
        console.log('listID:', listID);
        throw new Error('LibraryList is not in user library');
      }
      if (libraryList.length) {
        const oldConfig = libraryList[0];
        await oldConfig.update(raw => {
          raw.folder_id = newFolderID;
          raw.updated_at = new Date();
        });
      }
  });
  // Sync after moving list to folder
  await syncUserData();
}

// Used when user drags an item to a new position in the list
export async function changeItemOrder(itemId: string, newOrderIndex: number) {
  await database.write(async () => {
    const item = await database.get<wItem>('items').query(Q.where('id2', itemId)).fetch();
    if (!item || item.length === 0) {
      throw new Error('Item not found');
    }
    const oldOrderIndex = item[0].order_index;
    item[0].order_index = newOrderIndex;
    if (oldOrderIndex < newOrderIndex) {
      // Move items with order_index greater than oldOrderIndex and less than or equal to newOrderIndex up
      await database.get<wItem>('items').query(
        Q.where('list_id', item[0].list_id),
        Q.where('order_index', Q.gt(oldOrderIndex)),
        Q.where('order_index', Q.lte(newOrderIndex))
      ).fetch().then(items => {
        for (const item of items) {
          item.order_index = item.order_index - 1;
          updateItem(item.id2, { orderIndex: item.order_index });
        }
      });
    } else {
      // Move items with order_index less than oldOrderIndex and greater than or equal to newOrderIndex down
      await database.get<wItem>('items').query(
        Q.where('list_id', item[0].list_id),
        Q.where('order_index', Q.lt(oldOrderIndex)),
        Q.where('order_index', Q.gte(newOrderIndex))
      ).fetch().then(items => {
        for (const item of items) {
          item.order_index = item.order_index + 1;
          updateItem(item.id2, { orderIndex: item.order_index });
        }
      });
    }

  });
  // Sync after changing item order
  await syncUserData();
}


// ======= DATABASE CLEANUP =======

export async function deleteAllData(): Promise<void> {
  await database.write(async () => {
    // Use unsafeResetDatabase to truly drop all data without emitting delete events
    await database.adapter.unsafeResetDatabase();
    console.log('All wdb data deleted.');
  });
  // No need to sync after deleting all data
  // When this is called, a different function will be called to delete all data from supabase
}