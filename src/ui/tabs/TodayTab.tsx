import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { List } from '../../classes/List';
import { Item } from '../../classes/Item';
import { TodayInfo } from '../../classes/TodayInfo';
import { useAuth } from '../../contexts/UserContext';
import { useColors } from '../../contexts/ColorContext';
import ListScreen from '../screens/ListScreen';
import ItemScreen from '../screens/ItemScreen';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { rotateTodayItemForList, retrieveItem, getItemsInList } from '../../wdb/wdbService';

const TodayScreen = () => {
  const { currentUser, loading, forceUserUpdate } = useAuth();
  const { colors } = useColors();
  const [todayInfo, setTodayInfo] = useState<TodayInfo | null>(null);
  const [selectedListIndex, setSelectedListIndex] = useState<number>(0);
  const [loadingLists, setLoadingLists] = useState<boolean>(true);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const chipsScrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');
  const route = useRoute();
  const navigation = useNavigation();
  const [displayedItem, setDisplayedItem] = useState<Item | null>(null);

  // Define fetchTodayInfo for initial load and refresh
  const fetchTodayInfo = useCallback(async () => {
    if (!currentUser) {
      setTodayInfo(null);
      setLoadingLists(false);
      setInitialLoaded(true);
      return;
    }
    setLoadingLists(true);
    try {
      const lists = currentUser.getTodayLists();
      const info = new TodayInfo(lists);
      await info.refreshTodayItems();
      setTodayInfo(info);
      let idx = 0;
      if (
        typeof currentUser.selectedTodayListIndex === 'number' &&
        currentUser.selectedTodayListIndex >= 0 &&
        currentUser.selectedTodayListIndex < lists.length
      ) {
        idx = currentUser.selectedTodayListIndex;
      }
      setSelectedListIndex(idx);
    } catch (error) {
      console.error('Error fetching today info:', error);
    } finally {
      setLoadingLists(false);
      setInitialLoaded(true);
    }
  }, [currentUser]);

  // Fetch today info on component mount or when user changes
  useEffect(() => {
    if (!loading) {
      fetchTodayInfo();
    }
  }, [fetchTodayInfo, loading]);

  // Handle navigation from notification
  useEffect(() => {
    if (!todayInfo) return;
    // @ts-ignore
    const { listId, itemId, fromNotification } = route.params || {};
    if (fromNotification && listId && itemId) {
      const listIdx = todayInfo.todayLists.findIndex(l => l.id === listId);
      setSelectedListIndex(listIdx !== -1 ? listIdx : 0);
      // Clear notification params so user can switch lists
      (navigation as any).setParams({ fromNotification: undefined, listId: undefined, itemId: undefined });
    }
  }, [route, todayInfo, navigation]);

  // Update displayed item when todayInfo or selectedListIndex changes
  useEffect(() => {
    if (todayInfo && todayInfo.todayLists.length > 0) {
      const selectedList = todayInfo.todayLists[selectedListIndex];
      if (selectedList) {
        const item = todayInfo.getItemForList(selectedList.id);
        setDisplayedItem(item);
      }
    } else {
      setDisplayedItem(null);
    }
  }, [todayInfo, selectedListIndex]);

  // Refresh today info when this tab/screen regains focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const silentRefresh = async () => {
        if (!currentUser) return;
        const lists = currentUser.getTodayLists();
        const info = new TodayInfo(lists);
        await info.refreshTodayItems();
        // For each list, check if currentItem exists
        for (const list of lists) {
          if (!list.currentItem) continue;
          const items = await getItemsInList(list);
          const current = items.find(i => i.id === list.currentItem);
          if (!current) {
            // If currentItem was deleted, rotate
            await rotateTodayItemForList(currentUser.id, list, 'next');
            await info.refreshTodayItems();
          }
        }
        if (isActive) {
          setTodayInfo(info);
          let idx = 0;
          if (
            typeof currentUser.selectedTodayListIndex === 'number' &&
            currentUser.selectedTodayListIndex >= 0 &&
            currentUser.selectedTodayListIndex < lists.length
          ) {
            idx = currentUser.selectedTodayListIndex;
          }
          setSelectedListIndex(idx);
        }
      };
      silentRefresh();
      return () => { isActive = false; };
    }, [currentUser])
  );

  // Handle chip press to open ListScreen and update selected list
  const handleChipPress = async (index: number) => {
    if (!todayInfo || !currentUser) return;
    if (selectedListIndex !== index) {
      setSelectedListIndex(index);
      currentUser.selectedTodayListIndex = index;
      currentUser.save();
      // await forceUserUpdate(); // not needed because we already set the value two lines before
      scrollToSelectedChip(index);
      return;
    }
    // If already selected, open ListScreen
    (navigation as any).reset({
      index: 1,
      routes: [
        { name: 'Tabs', params: { screen: 'Today' } },
        { name: 'List', params: { list: todayInfo.todayLists[index] } }
      ]
    });
  };

  // Update handleRotateAllItems to just update the displayed item
  const handleRotateAllItems = async () => {
    if (!todayInfo || !currentUser || loadingLists) return;
    setLoadingLists(true);
    try {
      const prevSelectedListId = todayInfo.todayLists[selectedListIndex]?.id;
      for (const list of todayInfo.todayLists) {
        await list.rotateTodayItem(currentUser.id, "next");
      }
      const lists = currentUser.getTodayLists();
      const info = new TodayInfo(lists);
      await info.refreshTodayItems();
      setTodayInfo(info);
      let newIndex = 0;
      if (prevSelectedListId) {
        const idx = info.todayLists.findIndex(l => l.id === prevSelectedListId);
        if (idx !== -1) newIndex = idx;
      }
      setSelectedListIndex(newIndex);
      currentUser.selectedTodayListIndex = newIndex;
      await currentUser.save();
      await forceUserUpdate();
      // Update the displayed item for the current list
      const selectedList = info.todayLists[newIndex];
      if (selectedList) {
        const item = info.getItemForList(selectedList.id);
        setDisplayedItem(item);
      }
    } catch (error) {
      console.error('Error rotating items:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  // Scroll to center the selected chip
  const scrollToSelectedChip = (index: number) => {
    if (chipsScrollViewRef.current && todayInfo?.todayLists.length) {
      const chipWidth = 120;
      const scrollToX = index * chipWidth - (width / 2) + (chipWidth / 2);
      
      chipsScrollViewRef.current.scrollTo({ 
        x: Math.max(0, scrollToX), 
        animated: true 
      });
    }
  };

  // Show loading state until authentication loads and initial fetch completes
  if (loading || !initialLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Today</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your daily items</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your lists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show login prompt if no user
  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Today</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your daily items</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>Not Logged In</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            Please log in to see your today lists
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!todayInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Today</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your daily items</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No Today Info</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            Something went wrong loading your today info
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Today</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your daily items</Text>
        <TouchableOpacity 
          style={[styles.rotateButton, { backgroundColor: colors.primary }]}
          onPress={handleRotateAllItems}
        >
          <Icon name="refresh-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      {todayInfo && todayInfo.todayLists.length > 0 ? (
        <>
          <View style={styles.chipsWrapper}>
            <ScrollView
              ref={chipsScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {todayInfo.todayLists.map((list, index) => (
                <TouchableOpacity
                  key={list.id}
                  style={[
                    styles.chip,
                    { backgroundColor: selectedListIndex === index ? colors.primary : colors.backgroundSecondary },
                    selectedListIndex === index && styles.selectedChip
                  ]}
                  onPress={() => handleChipPress(index)}
                >
                  <Text 
                    style={[
                      styles.chipText,
                      { color: selectedListIndex === index ? 'white' : colors.textSecondary },
                      selectedListIndex === index && styles.selectedChipText
                    ]}
                  >
                    {list.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.itemContainer}>
            {displayedItem ? (
              <ItemScreen item={displayedItem} canEdit={false} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No Item Selected</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>This list doesn't have a current item</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No Today Lists</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Mark lists as "Today" in your list settings to see them here</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  chipsWrapper: {
    height: 50,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    minWidth: 100,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    // Color is set dynamically
  },
  chipText: {
    fontWeight: '500',
  },
  selectedChipText: {
    fontWeight: 'bold',
  },
  itemContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  rotateButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});

export default TodayScreen;