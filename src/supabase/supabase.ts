import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add debugging to see what's happening
// console.log('Config values:', Config);
// console.log('Supabase URL:', Config.SUPABASE_URL);
// console.log('Supabase Anon Key:', Config.SUPABASE_ANON_KEY);

// Remove quotes from the environment variables if they exist
const supabaseUrl = Config.SUPABASE_URL
const supabaseAnonKey = Config.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables');
  throw new Error('Supabase URL or Anon Key is missing from environment variables');
}

// console.log('Creating Supabase client...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})


// console.log('Supabase:', supabase);

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})