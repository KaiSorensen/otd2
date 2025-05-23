import 'react-native-gesture-handler'; // 👈 must come first
import 'react-native-reanimated'; // 👈 recommended second
import '../shim';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/UserContext';
import { ColorsProvider } from './contexts/ColorContext';
import { NetworkProvider } from './contexts/NetworkContext';
import MainNavigator from './ui/tabs/MainNavigator';
import LoginScreen from './ui/login/LoginScreen';
import RegisterScreen from './ui/login/RegisterScreen';
import { createNavigationContainerRef } from '@react-navigation/native';
import { registerNotificationListeners } from './notifications/notifService';

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

const AppContent = () => {
  const { currentUser, loading } = useAuth();

  // Initialize sync when the user is logged in
  useEffect(() => {
    if (currentUser) {
      // initializeSync();
    }
  }, [currentUser]);

  // Register notification listeners and handle navigation
  useEffect(() => {
    const unsubscribe = registerNotificationListeners((listId, itemId) => {
      if (!navigationRef.isReady() || !currentUser) return;
      const isToday = currentUser.getTodayLists().some((l: any) => l.id === listId);
      if (isToday) {
        navigationRef.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [
                  {
                    name: 'Tabs',
                    state: {
                      routes: [
                        { name: 'Today', params: { listId, itemId, fromNotification: true } },
                        { name: 'Library' },
                        { name: 'Search' }
                      ],
                      index: 0
                    }
                  }
                ],
                index: 0
              }
            }
          ]
        });
      } else {
        navigationRef.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [
                  {
                    name: 'Tabs',
                    state: {
                      routes: [
                        { name: 'Today' },
                        {
                          name: 'Library',
                          params: { fromNotification: true, listId, itemId },
                          state: {
                            routes: [
                              { name: 'List', params: { list: currentUser.getList(listId), fromNotification: true, initialItemId: itemId } },
                              { name: 'Item', params: { item: { id: itemId }, canEdit: false } }
                            ],
                            index: 1
                          }
                        },
                        { name: 'Search' }
                      ],
                      index: 1
                    }
                  }
                ],
                index: 0
              }
            }
          ]
        });
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  if (loading) {
    return <Text>waiting...</Text>;
  }

  return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {currentUser ? ( // if user is logged in: show the main navigator; if not: show the login and register screens
            <Stack.Screen name="Main" component={MainNavigator} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <ColorsProvider>
          <AuthProvider>
              <AppContent />
          </AuthProvider>
        </ColorsProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
};

export default App;
