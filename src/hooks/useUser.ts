import { useAuth } from '../contexts/UserContext';
import { User } from '../classes/User';
import { List } from '../classes/List';
import { Folder } from '../classes/Folder';

/**
 * Custom hook to access the current user and related data
 * This hook provides convenient access to the global User object and its methods
 */
export function useUser() {
  const { currentUser, loading, refreshUserData } = useAuth();

  // Helper functions to work with user data
  const getTodayLists = (): List[] => {
    if (!currentUser) return [];
    return currentUser.getTodayLists();
  };

  const getRootFolders = (): Folder[] => {
    if (!currentUser) return [];
    return currentUser.rootFolders;
  };

  const getList = (listId: string): List | undefined => {
    if (!currentUser) return undefined;
    return currentUser.getList(listId);
  };

  const getRootFolder = (folderId: string): Folder | undefined => {
    if (!currentUser) return undefined;
    return currentUser.getRootFolder(folderId);
  };

  const saveUser = async (): Promise<void> => {
    if (!currentUser) return;
    await currentUser.save();
  };

  return {
    user: currentUser,
    isLoading: loading,
    isLoggedIn: !!currentUser,
    refreshUserData,
    getTodayLists,
    getRootFolders,
    getList,
    getRootFolder,
    saveUser,
  };
} 