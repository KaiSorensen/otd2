import React, { useState, useEffect, useRef } from 'react';
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

const TodayScreen = () => {
  const { currentUser, loading, forceUserUpdate } = useAuth();
  const { colors } = useColors();
  const [todayInfo, setTodayInfo] = useState<TodayInfo | null>(null);
  const [selectedListIndex, setSelectedListIndex] = useState<number>(0);
  const [loadingLists, setLoadingLists] = useState<boolean>(true);
  const [selectedListForView, setSelectedListForView] = useState<List | null>(null);
  const [displayedItem, setDisplayedItem] = useState<Item | null>(null);
  const chipsScrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');

  // Fetch today info on component mount or when user changes
  useEffect(() => {
    const fetchTodayInfo = async () => {
      if (!currentUser) {
        setTodayInfo(null);
        setLoadingLists(false);
        return;
      }

      setLoadingLists(true);
      try {
        const lists = currentUser.getTodayLists();
        const info = new TodayInfo(lists);
        await info.refreshTodayItems();
        setTodayInfo(info);
        
        // Use the selected list index from the user
        setSelectedListIndex(currentUser.selectedTodayListIndex);
      } catch (error) {
        console.error('Error fetching today info:', error);
      } finally {
        setLoadingLists(false);
      }
    };

    if (!loading) {
      fetchTodayInfo();
    }
  }, [currentUser, loading, forceUserUpdate]);

  // Update displayed item when todayInfo changes or items load
  useEffect(() => {
    const updateDisplayedItem = async () => {
      if (todayInfo && todayInfo.todayLists.length > 0) {
        const selectedList = todayInfo.todayLists[selectedListIndex];
        if (selectedList) {
          const item = todayInfo.getItemForList(selectedList.id);
          setDisplayedItem(item);
        }
      }
    };

    updateDisplayedItem();
  }, [todayInfo, selectedListIndex]);

  // Handle chip selection
  const handleChipPress = (index: number) => {
    if (!todayInfo || !currentUser) return;
    
    // If the chip is already selected, open the list view
    if (selectedListIndex === index) {
      setSelectedListForView(todayInfo.todayLists[index]);
      return;
    }
    
    setSelectedListIndex(index);
    currentUser.selectedTodayListIndex = index;
    scrollToSelectedChip(index);
    
    // Update displayed item for the selected list
    const selectedList = todayInfo.todayLists[index];
    const selectedItem = todayInfo.getItemForList(selectedList.id);
    setDisplayedItem(selectedItem);
  };

  // Handle rotating all items
  const handleRotateAllItems = async () => {
    if (!todayInfo || !currentUser) return;

    for (const list of todayInfo.todayLists) {
      await list.rotateTodayItem(currentUser.id, "next");
    }

    // Refresh the today info
    const lists = currentUser.getTodayLists();
    const info = new TodayInfo(lists);
    await info.refreshTodayItems();
    setTodayInfo(info);

    // Update the displayed item for the current list
    const selectedList = info.todayLists[selectedListIndex];
    if (selectedList) {
      const item = info.getItemForList(selectedList.id);
      setDisplayedItem(item);
    }

    // Force UI update
    await forceUserUpdate();
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

  const handleBackFromListScreen = () => {
    setSelectedListForView(null);
  };

  // Conditionally render ListScreen if a list is selected for viewing
  if (selectedListForView) {
    return <ListScreen list={selectedListForView} onBack={handleBackFromListScreen} />;
  }

  // Show loading state while fetching user or lists
  if (loading || loadingLists) {
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

      {todayInfo.todayLists.length > 0 ? (
        <>
          {/* Horizontal scrollable chips */}
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

          {/* Item Screen */}
          <View style={styles.itemContainer}>
            {displayedItem ? (
              <ItemScreen 
                item={displayedItem}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No Item Selected</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                  This list doesn't have a current item
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>No Today Lists</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            Mark lists as "Today" in your list settings to see them here
          </Text>
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