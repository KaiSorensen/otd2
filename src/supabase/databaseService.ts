// import 'react-native-get-random-values';
import { User } from '../classes/User';
// import { Folder } from '../classes/Folder';
import { List } from '../classes/List';
import { Item } from '../classes/Item';
import { supabase } from './supabase';
// import { useNetwork } from '../contexts/NetworkContext';
// import { v4 as uuidv4 } from 'uuid';


// ======= SEARCH FUNCTIONS =======

export async function getUsersBySubstring(substring: string, isInternetReachable: boolean): Promise<User[]> {
  if (!isInternetReachable) return [];

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
  if (!isInternetReachable) return [];

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
export async function getPublicListsByUser(userId: string, isInternetReachable: boolean, viewerUserId?: string): Promise<List[]> {
  if (!isInternetReachable) return [];

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

