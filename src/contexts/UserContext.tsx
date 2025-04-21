import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../classes/User';
import { subscribeToAuthChanges } from '../supabase/authService';
import { retrieveUser } from '../wdb/wdbService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  loading: true,
  refreshUserData: async () => {} 
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user data that can be called from components
  const refreshUserData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Retrieve the full user data from the database
      const refreshedUser = await retrieveUser(currentUser.id);
      setCurrentUser(refreshedUser);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
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
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 