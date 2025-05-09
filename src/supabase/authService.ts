import { User } from '../classes/User';
import { supabase } from './supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { storeNewUser, retrievePopulatedUser, deleteUser } from '../wdb/wdbService';
import { deleteUser as deleteUserFromSupabase } from './databaseService';
import { deleteAllData } from '../wdb/wdbService';

// Create a new user with email and password
export const registerWithEmail = async (email: string, password: string, username: string): Promise<User> => {
  try {
    // // console.log('Registering user with email:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      console.error('Supabase auth error:', error);
      throw error;
    }

    if (!data.user) {
      console.error('No user returned from signUp');
      throw new Error('Failed to create user account');
    }
    
    // // console.log('User registered successfully with ID:', data.user.id);
    
    // Create a User object from the Supabase user
    const newUser = createUserFromSupabaseUser(data.user);
    
    try {
      // Store the new user in the database (this will create default data)
      await storeNewUser(newUser);
      // // console.log('User data stored in wdb successfully');
      
      // After storing the user and creating default data, retrieve the complete user data
      const completeUser = await retrievePopulatedUser(data.user.id);
      if (completeUser === null) {
        console.warn('Could not retrieve complete user data after registration, using basic user object');
        return newUser;
      }
      
      return completeUser;
    } catch (dbError) {
      console.error('Error storing user in database:', dbError);
      // Still return the user even if database storage fails
      // The auth listener will try to create the user again later
      return newUser;
    }
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// Sign in with email and password
export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Retrieve the full user data from the database
    const user = await retrievePopulatedUser(data.user.id);
    if (user === null) {
      throw new Error('User not found');
    }
    return user;
  }
  catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

// Sign in with Google
export const loginWithGoogle = async (): Promise<User> => {
  try {
    // // console.log('Starting Google Sign-In process');

    const googleConfig = {
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    };
    // // console.log('GoogleSignin configuration:', googleConfig);

    GoogleSignin.configure(googleConfig);

    // Check Play Services (for Android, but good to check)
    try {
      const hasPlayServices = await GoogleSignin.hasPlayServices();
      // // console.log('Has Play Services:', hasPlayServices);
    } catch (playServicesError) {
      console.error('Play Services check error:', playServicesError);
    }

    // Check if user is already signed in with Google
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        // // console.log('User is already signed in with Google, signing out first');
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      // Continue with sign-in process even if this check fails
    }

    // // console.log('Requesting Google Sign-In');
    try {
      const userInfo = (await GoogleSignin.signIn());
      // // console.log('Google Sign-In successful, user info:', userInfo);

      // Access the ID token from the correct property
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token returned from Google Sign In');
      }

      // Sign in to Supabase with Google token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      // // console.log('Supabase sign-in successful with Google credential');

      // Try to retrieve the user first
      try {
        const existingUser = await retrievePopulatedUser(data.user.id);
        
        // If user doesn't exist in database, create a new one
        if (existingUser === null) {
          // // console.log('Creating new user document for:', data.user.id);
          const newUser = createUserFromSupabaseUser(data.user);
          try {
            await storeNewUser(newUser);
            // // console.log('User data stored in wdb successfully');
            
            // After storing the user and creating default data, retrieve the complete user data
            const completeUser = await retrievePopulatedUser(data.user.id);
            if (completeUser === null) {
              console.warn('Could not retrieve complete user data after Google registration, using basic user object');
              return newUser;
            }
            
            return completeUser;
          } catch (storeError) {
            console.error('Error storing user in database:', storeError);
            // Still return the user even if database storage fails
            return newUser;
          }
        } else {
          // User exists, return their data
          // // console.log('User found in database:', data.user.id);
          return existingUser;
        }
      } catch (retrieveError) {
        console.error('Error retrieving user:', retrieveError);
        // If there's an error retrieving the user, create a new one
        const newUser = createUserFromSupabaseUser(data.user);
        try {
          await storeNewUser(newUser);
          // // console.log('User data stored in wdb successfully after retrieval error');
          
          // After storing the user and creating default data, retrieve the complete user data
          const completeUser = await retrievePopulatedUser(data.user.id);
          if (completeUser === null) {
            console.warn('Could not retrieve complete user data after Google registration (retrieval error path), using basic user object');
            return newUser;
          }
          
          return completeUser;
        } catch (storeError) {
          console.error('Error storing user in database after retrieval error:', storeError);
          return newUser;
        }
      }
    } catch (signInError) {
      console.error('Error during Google Sign-In process:', signInError);
      throw signInError;
    }
  } catch (error) {
    console.error('Detailed error in Google Sign-In:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Sign out
export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // // console.log('User signed out successfully');
    // The auth state change listener will automatically set the user to null
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Check if user document exists in Supabase
export const checkUserExists = async (userId: string): Promise<boolean> => {
  // // console.log(`Checking if user exists in Supabase: ${userId}`);
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const exists = !!data;
    // // console.log(`User document exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

// Get user data from Supabase with offline handling
export const getUserData = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (data) {
      return new User(
        data.id,
        data.username,
        data.email,
        data.avatarURL,
        data.notifsEnabled,
        data.selectedTodayListIndex,
        data.dateLastRotatedTodayLists
      );
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    // Return null when offline or error
    return null;
  }
};

// Helper function to convert Supabase auth user to our User class
export const createUserFromSupabaseUser = (supabaseUser: any): User => {
  return new User(
    supabaseUser.id,
    supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    supabaseUser.email || 'unknown@example.com',
    supabaseUser.user_metadata?.avatar_url || null,
    true,
    0,
    new Date()
  );
};

// Subscribe to auth changes and return User objects
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (session?.user) {
        // // console.log('Supabase user authenticated:', session.user.id);

        try {
          // Try to retrieve user first
          const existingUser = await retrievePopulatedUser(session.user.id);
          
          if (existingUser === null) {
            // // console.log('User not found in database, creating new user document');
            // User doesn't exist, create a new one
            const newUser = createUserFromSupabaseUser(session.user);
            try {
              await storeNewUser(newUser);
              // // console.log('New user document created successfully');
              
              // After storing the user and creating default data, retrieve the complete user data
              const completeUser = await retrievePopulatedUser(session.user.id);
              if (completeUser === null) {
                console.warn('Could not retrieve complete user data after auth state change, using basic user object');
                callback(newUser);
              } else {
                callback(completeUser);
              }
            } catch (storeError) {
              console.error('Error storing new user:', storeError);
              // Still provide the basic user object
              callback(newUser);
            }
          } else {
            // User exists, return their data
            // // console.log('User found in database');
            callback(existingUser);
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
          // Fallback to basic user if retrieval fails
          const fallbackUser = createUserFromSupabaseUser(session.user);
          callback(fallbackUser);
        }
      } else {
        // // console.log('No Supabase user, setting auth state to null');
        callback(null);
      }
    } catch (error) {
      console.error('Critical error in auth state listener:', error);
      callback(null);
    }
  });
};

// Delete user account
export const deleteUserAccount = async (): Promise<void> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No user is currently logged in');
    }
    
    try {
      // Delete all data from WatermelonDB
      await deleteAllData();
    } catch (error) {
      console.warn('Error deleting WatermelonDB data:', error);
    }
    
    // Delete the user from Supabase
    try {
      await deleteUserFromSupabase(user.id);
    } catch (error) {
      console.error('Error deleting user from Supabase:', error);
    }

    // Erase watermelon db
    await deleteAllData();

    // Sign out after deletion
    await supabase.auth.signOut();
    
    // // console.log('User account deleted successfully');
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};
