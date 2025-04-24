// import 'react-native-get-random-values';
import { User } from '../classes/User';
// import { Folder } from '../classes/Folder';
import { List } from '../classes/List';
import { Item } from '../classes/Item';
import { supabase } from './supabase';
// import { useNetwork } from '../contexts/NetworkContext';
// import { v4 as uuidv4 } from 'uuid';



// TODO: file currently disregards isInternetReachable



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
      data.notifsenabled
    );
    
    return user;
  } catch (error) {
    console.error('Unexpected error in retrieveUser:', error);
    return null;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw error;
  }
}


// ======= SEARCH FUNCTIONS =======

export async function getUsersBySubstring(substring: string, isInternetReachable: boolean): Promise<User[]> {
  // if (!isInternetReachable) return [];

  const { data, error } = await supabase.from('users').select('*').ilike('username', `%${substring}%`);
  if (error) {
    throw error;
  }

  console.log('found ', data.length, ' matching users in supabase');

  return data.map((user) => new User(
    user.id, 
    user.username, 
    user.email, 
    user.avatarurl, 
    user.notifsenabled
  ));
}

/**
 * Search for public lists by substring in title
 */
export async function getPublicListsBySubstring(substring: string, isInternetReachable: boolean): Promise<List[]> {
  console.log('getting public lists by substring', substring);
  // if (!isInternetReachable) return [];
  console.log('isInternetReachable', isInternetReachable);

  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('ispublic', true)
    .ilike('title', `%${substring}%`);
  if (error) {
    throw error;
  }

  console.log('found ', data.length, ' matching public lists in supabase');

  return data.map((list) => new List(
    list.id, 
    list.ownerid, 
    list.title, 
    list.description, 
    list.coverimageurl, 
    list.ispublic,
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
export async function getPublicListsByUser(userId: string, isInternetReachable: boolean, viewerUserId?: string): Promise<List[]> {
  // if (!isInternetReachable) return [];

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

    console.log('found ', data.length, ' matching lists for user in supabase');

    return data.map((list) => new List(
      list.id, 
      list.ownerid, 
      list.title, 
      list.description, 
      list.coverimageurl, 
      list.ispublic, 
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

export async function getItemsInList(listID: string): Promise<Item[]> {
  const { data, error } = await supabase.from('items').select('*').eq('listid', listID);
  if (error) {
    throw error;
  }
  return data.map((item) => new Item(
    item.id,
    item.listid,
    item.title || '',
    item.content || '',
    item.imageurls || [],
    item.orderindex || 0,
    item.createdat || new Date(),
    item.updatedat || new Date()
  ));
}


// LIBRARY FUNCTIONS

// export async function setListToOwnersLibraryConfig(list: List, userID: string) {
//   const { data, error } = await supabase.from('librarylists').upsert({
//     owner_id: userID,
//     list_id: list.id,
//   });
//   if (!data || error) {
//     throw error;
//   }
//   list.sortOrder = data.sort_order;
//   list.today = data.today;
//   list.currentItem = data.current_item;
//   list.notifyOnNew = data.notify_on_new;
//   list.notifyTime = data.notify_time;
//   list.notifyDays = data.notify_days;
//   list.orderIndex = data.order_index;
// }
