import 'react-native-get-random-values';
import { User } from '../classes/User';
import { Folder } from '../classes/Folder';
import { List } from '../classes/List';
import { Item } from '../classes/Item';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Fallback UUID generator in case the standard one fails
function generateFallbackUUID() {
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Where y is 8, 9, a, or b
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
  await supabase.from('users').insert({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarurl: user.avatarURL
  });
  
  // !! SHOULD BE DONE IN WDB OR BACKEND
  // populate default data for new user
  console.log("storing folder 1");
  const folder1 = new Folder(safeUUID(), user.id, null, "Wisdom", new Date(), new Date());
  await storeNewFolder(folder1).then(async () => {
    // For lists, personal configuration (sortOrder, today, etc.) will be stored in librarylists
    await addListToFolder(user.id, folder1.id, "321cc9d4-1d55-48fa-8dd6-01361276f47e", {
      sortOrder: 'date-first'
    }); // quotes
    // internal education folder
    const folder2 = new Folder(safeUUID(), user.id, folder1.id, "Education", new Date(), new Date());
    await storeNewFolder(folder2).then(async () => {
      await addListToFolder(user.id, folder2.id, "d9ba6ec8-e5d0-489f-80e9-886e7a14792e", {
        sortOrder: 'date-first'
      }); // vocab
    });
  });
  console.log("folder 1 stored");

  console.log("storing folder 2");
  const folder2 = new Folder(safeUUID(), user.id, null, "Notes", new Date(), new Date());
  await storeNewFolder(folder2).then(async () => {
    await addListToFolder(user.id, folder2.id, "f555d820-cc97-4ae7-9852-d1121de723c6", {
      sortOrder: 'date-first'
    }); // poems
    await addListToFolder(user.id, folder2.id, "ebdc306b-5bed-4dd7-bd46-aedbba42974a", {
      sortOrder: 'date-first'
    }); // insights
  });
  console.log("folder 2 stored");
}

export async function storeNewFolder(folder: Folder) {
  await supabase.from('folders').insert({
    id: folder.id,
    name: folder.name,
    ownerid: folder.ownerID,
    parentfolderid: folder.parentFolderID
  });
}

export async function storeNewList(list: List) {
  try {
    // Insert only the fields in the lists table
    await supabase.from('lists').insert({
      id: list.id,
      title: list.title,
      ownerid: list.ownerID,
      description: list.description,
      coverimageurl: list.coverImageURL,
      ispublic: list.isPublic
    });
    
    // If the list has a folderID and currentUserID, add it to the user's library
    if (list.folderID && list.currentUserID) {
      await supabase.from('librarylists').insert({
        ownerid: list.currentUserID,
        folderid: list.folderID,
        listid: list.id,
        sortorder: list.sortOrder,
        today: list.today,
        currentitem: list.currentItem,
        notifyonnew: list.notifyOnNew,
        notifytime: list.notifyTime ? list.notifyTime.toISOString() : null,
        notifydays: list.notifyDays,
        orderindex: list.orderIndex
      });
    }
  } catch (error) {
    console.error('Error storing new list:', error);
    throw error;
  }
}

export async function storeNewItem(userID: string, item: Item) {
  // Note: Items table no longer includes an ownerID column
  await supabase.from('items').insert({
    id: item.id,
    listid: item.listID,
    title: item.title,
    content: item.content,
    imageurls: item.imageURLs,
    orderindex: item.orderIndex
  });

  // First check if the currentitem is null before updating it
  const { data: libraryData } = await supabase
    .from('librarylists')
    .select('currentitem')
    .eq('ownerid', userID)
    .eq('listid', item.listID)
    .maybeSingle();
  
  console.log('new item id', item.id);

  // Only update if currentitem is null
  if (libraryData && libraryData.currentitem === null) {
    console.log('updating currentitem for list', item.listID, item.id);
    await supabase.from('librarylists').update({
      currentitem: item.id
    }).eq('ownerid', userID).eq('listid', item.listID);
  }
}

// ======= SINGLE RETRIEVE FUNCTIONS =======

export async function retrieveUser(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) {
      console.error('Error retrieving user from database:', error);
      return null;
    }
    if (data === null) {
      console.log('User not found in database:', userId);
      return null;
    }
    const user = new User(
      data.id, 
      data.username, 
      data.email, 
      data.avatarurl, 
      data.createdat, 
      data.updatedat, 
      data.notifsenabled
    );
    
    try {
      await populateLibrary(user);
    } catch (libraryError) {
      console.error('Error populating user library:', libraryError);
    }
    
    return user;
  } catch (error) {
    console.error('Unexpected error in retrieveUser:', error);
    return null;
  }
}

export async function retrieveFolder(folderId: string, ownerID: string): Promise<Folder> {
  let query = supabase.from('folders').select('*');
  if (folderId) {
    query = query.eq('id', folderId);
  }
  if (ownerID) {
    query = query.eq('ownerid', ownerID);
  }
  const { data, error } = await query.single();
  if (error) {
    throw error;
  }
  return new Folder(
    data.id, 
    data.ownerid, 
    data.parentfolderid, 
    data.name, 
    data.createdat, 
    data.updatedat
  );
}

export async function retrieveList(userID: string, listId: string): Promise<List> {
  try {
    // First, get the basic list information
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .single();
    
    if (listError) {
      throw listError;
    }
    
    // Check if this list is in the user's library
    const { data: libraryData, error: libraryError } = await supabase
      .from('librarylists')
      .select('*')
      .eq('ownerid', userID)
      .eq('listid', listId)
      .maybeSingle();
    
    if (libraryError) {
      console.error('Error checking library configuration:', libraryError);
    }
    
    // Create a List object with combined data
    return new List(
      listData.id,
      listData.ownerid,
      listData.title,
      listData.description,
      listData.coverimageurl,
      listData.ispublic,
      new Date(listData.createdat),
      new Date(listData.updatedat),
      userID,
      libraryData?.folderid || null,
      libraryData?.sortorder || "date-first",
      libraryData?.today || false,
      libraryData?.currentitem || null,
      libraryData?.notifyonnew || false,
      libraryData?.notifytime ? new Date(libraryData.notifytime) : null,
      libraryData?.notifydays || null,
      libraryData?.orderindex || 0
    );
  } catch (error) {
    console.error('Error retrieving list:', error);
    throw error;
  }
}

export async function retrieveItem(itemId: string): Promise<Item> {
  console.log('Retrieving item:', itemId);
  const { data, error } = await supabase.from('items').select('*').eq('id', itemId).single();
  if (error) {
    console.error('Error retrieving item:', error);
    throw error;
  }
  console.log('Retrieved item data:', data.id, data.title);
  console.log('Content length:', data.content?.length || 0);
  console.log('Content preview:', data.content?.substring(0, 100));
  return new Item(
    data.id,
    data.listid,
    data.title,
    data.content || '',
    data.imageurls,
    data.orderindex,
    new Date(data.createdat),
    new Date(data.updatedat)
  );
}

// ======= SINGLE UPDATE FUNCTIONS =======

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      username: updates.username,
      email: updates.email,
      avatarurl: updates.avatarURL,
      notifsenabled: updates.notifsEnabled,
      updatedat: new Date().toISOString()
    })
    .eq('id', userId);
  if (error) {
    throw error;
  }
}

export async function updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .update({
      name: updates.name,
      parentfolderid: updates.parentFolderID,
      updatedat: new Date().toISOString()
    })
    .eq('id', folderId);
  if (error) {
    throw error;
  }
}

export async function updateList(listId: string, updates: Partial<List>): Promise<void> {
  // Update only the fields in the lists table
  const { error } = await supabase
    .from('lists')
    .update({
      title: updates.title,
      description: updates.description,
      coverimageurl: updates.coverImageURL,
      ispublic: updates.isPublic,
      updatedat: new Date().toISOString()
    })
    .eq('id', listId);
  if (error) {
    throw error;
  }
}

export async function updateItem(itemId: string, updates: Partial<Item>): Promise<void> {
  console.log('Updating item:', itemId);
  console.log('Content length:', updates.content?.length || 0);
  console.log('Content preview:', updates.content?.substring(0, 100));
  const { error } = await supabase
    .from('items')
    .update({
      title: updates.title,
      content: updates.content || '',
      imageurls: updates.imageURLs,
      orderindex: updates.orderIndex,
      updatedat: new Date().toISOString()
    })
    .eq('id', itemId);
  if (error) {
    console.error('Error updating item:', error);
    throw error;
  }
}

export async function updateLibraryListConfig(userID: string, folderID: string, listID: string, config: {
  sortOrder?: string;
  today?: boolean;
  currentItem?: string | null;
  notifyOnNew?: boolean;
  notifyTime?: Date | null;
  notifyDays?: string | null;
  orderIndex?: number;
}): Promise<void> {
  try {
    // Check if the library entry exists
    const { data, error: checkError } = await supabase
      .from('librarylists')
      .select('id')
      .eq('ownerid', userID)
      .eq('folderid', folderID)
      .eq('listid', listID)
      .maybeSingle();
    
    if (checkError) {
      throw checkError;
    }
    
    if (!data) {
      console.error('Cannot update library configuration: List is not in user library');
      throw new Error('List is not in user library');
    }
    
    // Update the library configuration
    const { error: updateError } = await supabase
      .from('librarylists')
      .update({
        sortorder: config.sortOrder,
        today: config.today,
        currentitem: config.currentItem,
        notifyonnew: config.notifyOnNew,
        notifytime: config.notifyTime ? config.notifyTime.toISOString() : null,
        notifydays: config.notifyDays,
        orderindex: config.orderIndex,
        updatedat: new Date().toISOString()
      })
      .eq('ownerid', userID)
      .eq('folderid', folderID)
      .eq('listid', listID);
    
    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error('Error updating library list configuration:', error);
    throw error;
  }
}

// ======= SINGLE DELETE FUNCTIONS =======

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw error;
  }
}

export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', folderId);
  if (error) {
    throw error;
  }
}

export async function deleteList(listId: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) {
    throw error;
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);

  // Check if the item is the current item for any lists
  const { data: libraryData, error: libraryError } = await supabase
    .from('librarylists')
    .select('*')
    .eq('currentitem', itemId);

  if (libraryData && libraryData.length > 0) {
    console.log('item is the current item for lists', libraryData.map((entry) => entry.listid));
  }


  //TO DO: update the currentitem for the lists that are using this item as the current item




  if (error) {
    throw error;
  }
}

// ======= FOLDER-LISTS (LIBRARYLISTS) FUNCTIONS =======

interface LibraryConfig {
  sortOrder?: string;
  today?: boolean;
  currentItem?: string | null;
  notifyOnNew?: boolean;
  notifyTime?: Date | null;
  notifyDays?: string;
  orderIndex?: number;
}

export async function addListToFolder(ownerID: string, folderID: string, listID: string, config?: LibraryConfig) {
  try {
    // Check if the list exists
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listID)
      .single();
    
    if (listError || !listData) {
      console.error('Error adding list to folder:', listError);
      throw new Error('List not found');
    }
    
    // Now add the list to the folder with additional personal configuration in librarylists
    const { error } = await supabase.from('librarylists').insert({
      ownerid: ownerID,
      folderid: folderID,
      listid: listID,
      sortorder: config?.sortOrder || 'date-first',
      today: config?.today || false,
      currentitem: config?.currentItem || null,
      notifyonnew: config?.notifyOnNew || false,
      notifytime: config?.notifyTime ? config.notifyTime.toISOString() : null,
      notifydays: config?.notifyDays || null,
      orderindex: config?.orderIndex || 0
    });
    
    if (error) {
      console.error('Error adding list to folder:', error);
    }
  } catch (error) {
    console.error('Unexpected error in addListToFolder:', error);
  }
}

export async function removeListFromFolder(ownerID: string, folderID: string, listID: string) {
  const { error } = await supabase.from('librarylists').delete()
    .eq('ownerid', ownerID)
    .eq('folderid', folderID)
    .eq('listid', listID);
  if (error) {
    throw error;
  }
}

export async function moveListToFolder(ownerID: string, oldFolderID: string, newFolderID: string, listID: string) {
    // First remove the list from the old folder
    await removeListFromFolder(ownerID, oldFolderID, listID);
    
    // Then add it to the new folder with the same configuration
    const { data: oldConfig } = await supabase
        .from('librarylists')
        .select('*')
        .eq('ownerid', ownerID)
        .eq('folderid', oldFolderID)
        .eq('listid', listID)
        .single();

    if (oldConfig) {
        await addListToFolder(ownerID, newFolderID, listID, {
            sortOrder: oldConfig.sortorder,
            today: oldConfig.today,
            currentItem: oldConfig.currentitem,
            notifyOnNew: oldConfig.notifyonnew,
            notifyTime: oldConfig.notifytime ? new Date(oldConfig.notifytime) : null,
            notifyDays: oldConfig.notifydays,
            orderIndex: oldConfig.orderindex
        });
    } else {
        // If no old config found, add with default settings
        await addListToFolder(ownerID, newFolderID, listID);
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
    // Use librarylists to get list IDs for the user
    const { data, error } = await supabase.from('librarylists').select('*').eq('ownerid', user.id);
    if (error) {
      console.error('Error fetching user lists:', error);
      user.listMap = new Map();
      return;
    }
    
    const lists: List[] = [];
    for (const libraryEntry of data) {
      const { data: listData, error: listError } = await supabase.from('lists').select('*').eq('id', libraryEntry.listid).single();
      if (listError) {
        console.error('Error fetching user lists:', listError);
        continue;
      }
      console.log('current item for list', listData.title, libraryEntry.currentitem);
      
      lists.push(new List(
        listData.id, 
        listData.ownerid, 
        listData.title, 
        listData.description, 
        listData.coverimageurl, 
        listData.ispublic, 
        new Date(listData.createdat), 
        new Date(listData.updatedat),
        user.id,
        libraryEntry.folderid,
        libraryEntry.sortorder,
        libraryEntry.today,
        libraryEntry.currentitem,
        libraryEntry.notifyonnew,
        libraryEntry.notifytime ? new Date(libraryEntry.notifytime) : null,
        libraryEntry.notifydays,
        libraryEntry.orderindex
      ));
    }
    user.listMap = new Map(lists.map((list) => [list.id, list]));
  } catch (error) {
    console.error('Unexpected error in populateUserLists:', error);
    user.listMap = new Map();
  }
}

export async function populateFoldersListIDs(folder: Folder) {
  const { data, error } = await supabase.from('librarylists').select('listid').eq('folderid', folder.id);
  if (error) {
    throw error;
  }
  folder.listsIDs = data.map((entry) => entry.listid);
}

export async function populateFolders(user: User) {
  try {
    const { data, error } = await supabase.from('folders').select('*').eq('ownerid', user.id).is('parentfolderid', null);
    if (error) {
      console.error('Error fetching root folders:', error);
      user.rootFolders = [];
      return;
    }
    const folders = data.map((folder) => new Folder(
      folder.id, 
      folder.ownerid, 
      folder.parentfolderid, 
      folder.name, 
      folder.createdat, 
      folder.updatedat
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

// Recursive function to populate all subfolders for a given folder
export async function populateSubFolders(folder: Folder) {
  const { data, error } = await supabase.from('folders').select('*')
    .eq('ownerid', folder.ownerID)
    .eq('parentfolderid', folder.id);
  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    folder.subFolders = [];
    return;
  }
  folder.subFolders = data.map((folderData) =>
    new Folder(
      folderData.id, 
      folderData.ownerid, 
      folderData.parentfolderid, 
      folderData.name, 
      new Date(folderData.createdat), 
      new Date(folderData.updatedat)
    )
  );
  for (const subFolder of folder.subFolders) {
    await populateFoldersListIDs(subFolder);
    await populateSubFolders(subFolder);
  }
}

// ======= SEARCH FUNCTIONS =======

export async function getUsersBySubstring(substring: string): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').ilike('username', `%${substring}%`);
  if (error) {
    throw error;
  }
  return data.map((user) => new User(
    user.id, 
    user.username, 
    user.email, 
    user.avatarurl, 
    user.createdat, 
    user.updatedat, 
    user.notifsenabled
  ));
}

/**
 * Search for public lists by substring in title
 */
export async function getPublicListsBySubstring(substring: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('ispublic', true)
    .ilike('title', `%${substring}%`);
  if (error) {
    throw error;
  }
  return data.map((list) => new List(
    list.id, 
    list.ownerid, 
    list.title, 
    list.description, 
    list.coverimageurl, 
    list.ispublic, 
    new Date(list.createdat), 
    new Date(list.updatedat),
    null, // currentUserID
    '', // folderID
    "date-first", // default sortOrder
    false, // today
    null, // currentItem
    false, // notifyOnNew
    null, // notifyTime
    null, // notifyDays
    0 // orderIndex
  ));
}

/**
 * Get all public lists for a specific user
 */
export async function getPublicListsByUser(userId: string, viewerUserId?: string): Promise<List[]> {
  try {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('ownerid', userId)
      .eq('ispublic', true);
    
    if (error) {
      console.error('Error fetching public lists:', error);
      throw error;
    }

    return data.map((list) => new List(
      list.id, 
      list.ownerid, 
      list.title, 
      list.description, 
      list.coverimageurl, 
      list.ispublic, 
      new Date(list.createdat), 
      new Date(list.updatedat),
      viewerUserId || null, // currentUserID (the user viewing the list)
      '', // folderID
      "date-first", // default sortOrder
      false, // today
      null, // currentItem
      false, // notifyOnNew
      null, // notifyTime
      null, // notifyDays
      0 // orderIndex
    ));
  } catch (error) {
    console.error('Error in getPublicListsByUser:', error);
    throw error;
  }
}

export async function getUserListsBySubstring(userID: string, substring: string): Promise<List[]> {
  const { data, error } = await supabase.from('lists').select('*').eq('ownerid', userID).ilike('title', `%${substring}%`);
  if (error) {
    throw error;
  }
  return data.map((list) => new List(
    list.id, 
    list.ownerid, 
    list.title, 
    list.description, 
    list.coverimageurl, 
    list.ispublic, 
    new Date(list.createdat), 
    new Date(list.updatedat),
    userID, // currentUserID
    '', // folderID
    "date-first", // default sortOrder
    false, // today
    null, // currentItem
    false, // notifyOnNew
    null, // notifyTime
    null, // notifyDays
    0 // orderIndex
  ));
}

/**
 * Search for items in a user's lists by substring in title or content
 */
export async function getLibraryItemsBySubstring(user: User, substring: string): Promise<Item[]> {
  console.log('Searching for items with substring:', substring);
  const libraryListIDs = Array.from(user.listMap.keys());
  if (!libraryListIDs.length) {
    console.log('No lists found for user');
    return [];
  }
  console.log('Searching in lists:', libraryListIDs);
  let items: Item[] = [];
  for (const listID of libraryListIDs) {
    const { data: listItems, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('listid', listID)
      .or(`title.ilike.%${substring}%,content.ilike.%${substring}%`);
    if (itemsError) {
      console.error('Error searching items in list:', listID, itemsError);
      throw itemsError;
    }
    console.log(`Found ${listItems.length} items in list ${listID}`);
    listItems.forEach((item) => {
      console.log('Search result item:', item.id, item.title);
      console.log('Content length:', item.content?.length || 0);
      items.push(new Item(
        item.id, 
        item.listid, 
        item.title, 
        item.content || '',
        item.imageurls, 
        item.orderindex, 
        new Date(item.createdat), 
        new Date(item.updatedat)
      ));
    });
  }
  console.log(`Total items found: ${items.length}`);
  return items;
}

// ======= TODAY FUNCTIONS =======

/**
 * Get all lists marked as "today" for a user.
 * Since the today flag is now stored in librarylists, we join that with lists.
 */
export async function getTodayListsForUser(userId: string): Promise<List[]> {
  try {
    // Get all library entries marked as "today" for this user
    const { data: libraryData, error: libraryError } = await supabase
      .from('librarylists')
      .select('*')
      .eq('ownerid', userId)
      .eq('today', true);
    
    if (libraryError) {
      throw libraryError;
    }
    
    if (!libraryData.length) {
      return [];
    }
    
    // Get the list details for each library entry
    const lists: List[] = [];
    for (const libraryEntry of libraryData) {
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', libraryEntry.listid)
        .single();
      
      if (listError) {
        console.error(`Error fetching list ${libraryEntry.listid}:`, listError);
        continue;
      }
      
      lists.push(new List(
        listData.id,
        listData.ownerid,
        listData.title,
        listData.description,
        listData.coverimageurl,
        listData.ispublic,
        new Date(listData.createdat),
        new Date(listData.updatedat),
        userId,
        libraryEntry.folderid,
        libraryEntry.sortorder,
        libraryEntry.today,
        libraryEntry.currentitem,
        libraryEntry.notifyonnew,
        libraryEntry.notifytime ? new Date(libraryEntry.notifytime) : null,
        libraryEntry.notifydays,
        libraryEntry.orderindex
      ));
    }
    
    return lists;
  } catch (error) {
    console.error('Error getting today lists:', error);
    throw error;
  }
}

/**
 * Get all items in lists marked as "today" for a user.
 */
export async function getTodayItemsForUser(userId: string): Promise<Item[]> {
  const todayLists = await getTodayListsForUser(userId);
  if (!todayLists.length) {
    return [];
  }
  const listIds = todayLists.map(list => list.id);
  // Order by orderindex instead of a non-existent "position"
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('listid', listIds)
    .order('orderindex', { ascending: true });
  if (error) {
    throw error;
  }
  return data.map((item) => new Item(
    item.id,
    item.listid,
    item.title,
    item.content,
    item.imageurls,
    item.orderindex,
    new Date(item.createdat),
    new Date(item.updatedat)
  ));
}

/**
 * Get all items in a specific list.
 */
export async function getItemsInList(listId: string): Promise<Item[]> {
  console.log('Getting items in list:', listId);
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('listid', listId)
    .order('orderindex', { ascending: true });
  if (error) {
    console.error('Error getting items in list:', error);
    throw error;
  }
  console.log(`Retrieved ${data.length} items from list ${listId}`);
  const items = data.map((item) => {
    console.log('Item:', item.id, item.title);
    console.log('Content length:', item.content?.length || 0);
    return new Item(
      item.id,
      item.listid,
      item.title,
      item.content || '',
      item.imageurls,
      item.orderindex,
      new Date(item.createdat),
      new Date(item.updatedat)
    );
  });
  return items;
}


