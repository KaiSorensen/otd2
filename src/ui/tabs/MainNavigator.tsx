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

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen 
        name="List"
      >
        {({ route, navigation }) => {
          const { list, initialItemId } = route.params || {};
          return <ListScreen list={list} initialItemId={initialItemId} onBack={() => navigation.goBack()} />;
        }}
      </Stack.Screen>
      <Stack.Screen 
        name="Item"
      >
        {({ route, navigation }) => {
          const { item, canEdit, onSave } = route.params || {};
          return <ItemScreen item={item} canEdit={canEdit} onBack={() => navigation.goBack()} onSave={onSave} />;
        }}
      </Stack.Screen>
      <Stack.Screen 
        name="User"
      >
        {({ route, navigation }) => {
          const { userID } = route.params || {};
          return <UserScreen userID={userID} onBack={() => navigation.goBack()} />;
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default MainNavigator; 