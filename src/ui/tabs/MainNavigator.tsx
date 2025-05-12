import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import LibraryScreen from './LibraryTab';
import TodayScreen from './TodayTab';
import SearchScreen from './SearchTab';
import ListScreen from '../screens/ListScreen';
import ItemScreen from '../screens/ItemScreen';
import UserScreen from '../screens/UserScreen';
import { useColors } from '../../contexts/ColorContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const { colors } = useColors();
  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Today') {
            iconName = 'today-outline';
            if (focused) iconName = 'today';
          } else if (route.name === 'Library') {
            iconName = 'library-outline';
            if (focused) iconName = 'library';
          } else if (route.name === 'Search') {
            iconName = 'search-outline';
            if (focused) iconName = 'search';
          }
          return <Icon name={iconName || 'ellipse'} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

// List Screen Component
const ListScreenWrapper = ({ route, navigation }: { route: any; navigation: any }) => {
  const { list, initialItemId } = route.params || {};
  return <ListScreen list={list} initialItemId={initialItemId} onBack={() => navigation.goBack()} />;
};

// Item Screen Component
const ItemScreenWrapper = ({ route, navigation }: { route: any; navigation: any }) => {
  const { item, canEdit, onItemUpdate } = route.params || {};
  return <ItemScreen item={item} canEdit={canEdit} onBack={() => navigation.goBack()} onItemUpdate={onItemUpdate} />;
};

// User Screen Component
const UserScreenWrapper = ({ route, navigation }: { route: any; navigation: any }) => {
  const { userID } = route.params || {};
  return <UserScreen userID={userID} onBack={() => navigation.goBack()} />;
};

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="List" component={ListScreenWrapper} />
      <Stack.Screen name="Item" component={ItemScreenWrapper} />
      <Stack.Screen name="User" component={UserScreenWrapper} />
    </Stack.Navigator>
  );
};

export default MainNavigator; 