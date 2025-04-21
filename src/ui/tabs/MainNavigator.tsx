import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import LibraryScreen from './LibraryTab';
import TodayScreen from './TodayTab';
import SearchScreen from './SearchTab';
import { useColors } from '../../contexts/ColorContext';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  const { colors } = useColors();
  
  return (
    <Tab.Navigator
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
};

export default MainNavigator; 