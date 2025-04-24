import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../classes/User';
import { subscribeToAuthChanges } from '../supabase/authService';
import { retrievePopulatedUser } from '../wdb/wdbService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  forceUserUpdate: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  loading: true,
  refreshUserData: async () => {},
  forceUserUpdate: () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user data that can be called from components
  // Use case: to refresh the whole UI from top-down
  const refreshUserData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Retrieve the full user data from the database
      const refreshedUser = await retrievePopulatedUser(currentUser.id);
      setCurrentUser(refreshedUser);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to force a user update by creating a new user object
  const forceUserUpdate = async () => {
    if (!currentUser) return;
    
    // First refresh the current user data
    await currentUser.refresh();
    
    // Create a new user object with the refreshed data
    const updatedUser = new User(
      currentUser.id,
      currentUser.username,
      currentUser.email,
      currentUser.avatarURL,
      currentUser.notifsEnabled
    );
    
    // Copy all properties from the refreshed current user to the new user
    updatedUser.rootFolders = currentUser.rootFolders;
    updatedUser.listMap = currentUser.listMap;
    updatedUser.selectedTodayListIndex = currentUser.selectedTodayListIndex;
  
    setCurrentUser(updatedUser);
  };

  useEffect(() => {
    console.log('Setting up auth subscription');
    const subscription = subscribeToAuthChanges((user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      setCurrentUser(user);
      setLoading(false);
    });

    // Fix the unsubscribe call
    return () => {
      // Use type assertion to handle the subscription object
      const sub = subscription as any;
      if (typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      } else if (sub.data?.subscription?.unsubscribe) {
        sub.data.subscription.unsubscribe();
      }
    };
  }, []);

  console.log('Auth state:', { currentUser, loading });

  const value = {
    currentUser,
    loading,
    refreshUserData,
    forceUserUpdate
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 