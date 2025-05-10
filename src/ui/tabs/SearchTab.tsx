import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Image,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  getLibraryItemsBySubstring,
  getLibraryListsBySubstring
} from '../../wdb/wdbService';
import {
  getPublicListsBySubstring,
  getUsersBySubstring
} from '../../supabase/databaseService';
import { List } from '../../classes/List';
import { Item } from '../../classes/Item';
import { User } from '../../classes/User';
import { useAuth } from '../../contexts/UserContext';
import { useColors } from '../../contexts/ColorContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';
import ListScreen from '../screens/ListScreen';
import ItemScreen from '../screens/ItemScreen';
import UserScreen from '../screens/UserScreen';

// Helper function to strip HTML tags for plain text display
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};

// Define filter types
type FilterType = 'library' | 'lists' | 'items' | 'users' | null;

// Define result types for the union type
type SearchResult = {
  type: 'list' | 'item' | 'user';
  data: List | Item | User;
};

const SearchScreen = () => {
  const { currentUser } = useAuth();
  const { colors } = useColors();
  const { isInternetReachable } = useNetwork();
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEasterEgg, setIsEasterEgg] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((term: string, filter: FilterType) => {
      if (term.trim().length > 0 && term.trim() !== 'msjem') {
        performSearch(term, filter);
      } else {
        setResults([]);
      }
    }, 300),
    [currentUser]
  );

  // Effect to trigger search when searchTerm or activeFilter changes
  useEffect(() => {
    // Check for easter egg
    if (searchTerm.trim() === 'msjem') {
      setIsEasterEgg(true);
      setResults([]);
      setLoading(false);

      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();

      return;
    } else {
      setIsEasterEgg(false);
    }

    debouncedSearch(searchTerm, activeFilter);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, activeFilter, debouncedSearch, pulseAnim]);

  // Main search function
  const performSearch = async (term: string, filter: FilterType) => {
    if (!term.trim() || !currentUser) return;

    setLoading(true);
    try {
      let searchResults: SearchResult[] = [];

      // Search based on the active filter
      switch (filter) {
        case 'library':
          // Search only in local database (watermelondb)
          const userLists = await getLibraryListsBySubstring(term);
          const userItems = await getLibraryItemsBySubstring(currentUser, term);

          searchResults = [
            ...userLists.map((list: List) => ({ type: 'list' as const, data: list })),
            ...userItems.map((item: Item) => ({ type: 'item' as const, data: item }))
          ];
          break;

        case 'lists':
          // Search in both local and remote databases
          const localLists = await getLibraryListsBySubstring(term);
          const publicLists = await getPublicListsBySubstring(term, isInternetReachable);

          // filter out duplicates
          searchResults = [
            ...localLists.map((list: List) => ({ type: 'list' as const, data: list })),
            ...publicLists
              .filter((list: List) => !localLists.some((ul: List) => ul.id === list.id))
              .map((list: List) => ({ type: 'list' as const, data: list }))
          ];
          break;

        case 'items':
          // Search only in local database (watermelondb)
          const items = await getLibraryItemsBySubstring(currentUser, term);
          searchResults = items.map(item => ({ type: 'item' as const, data: item }));
          break;

        case 'users':
          // Search in remote database (supabase)
          const users = await getUsersBySubstring(term, isInternetReachable);
          searchResults = users.map((user: User) => ({ type: 'user' as const, data: user }));
          break;

        case null:
          // Search in both local and remote databases
          const allLocalLists = await getLibraryListsBySubstring(term);
          const allLocalItems = await getLibraryItemsBySubstring(currentUser, term);
          const allPublicLists = await getPublicListsBySubstring(term, isInternetReachable);
          const allUsers = await getUsersBySubstring(term, isInternetReachable);

          // filter out duplicates
          searchResults = [
            ...allLocalLists.map((list: List) => ({ type: 'list' as const, data: list })),
            ...allLocalItems.map((item: Item) => ({ type: 'item' as const, data: item })),
            ...allPublicLists
              .filter((list: List) => !allLocalLists.some((ul: List) => ul.id === list.id))
              .map((list: List) => ({ type: 'list' as const, data: list })),
            ...allUsers.map((user: User) => ({ type: 'user' as const, data: user }))
          ];
          break;
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter chip selection
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  // Render different result types
  const renderListResult = (list: List) => (
    <TouchableOpacity
      style={[styles.resultItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={() => (navigation as any).navigate('List', { list })}
    >
      {list.coverImageURL && (
        <Image
          source={{ uri: list.coverImageURL }}
          style={styles.resultImage}
        />
      )}
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{list.title}</Text>
        {list.description && (
          <Text style={[styles.resultDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {list.description}
          </Text>
        )}
        <View style={styles.resultMeta}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {list.ownerID === currentUser?.id ? 'Your list' : 'Public list'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={(e) => {
          e.stopPropagation();
          (navigation as any).navigate('List', { list });
        }}
      >
        <Icon name="arrow-forward-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderItemResult = (item: Item) => {
    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
        onPress={() => (navigation as any).navigate('Item', { item })}
      >
        <View style={styles.resultContent}>
          <Text style={[styles.resultDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {stripHtml(item.content || '')}
          </Text>
          <View style={styles.resultMeta}>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>Item</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            (navigation as any).navigate('Item', { item });
          }}
        >
          <Icon name="arrow-forward-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderUserResult = (user: User) => (
    <View style={[styles.resultItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={[styles.avatarContainer, { backgroundColor: user.avatarURL ? 'transparent' : colors.backgroundSecondary }]}>
        {user.avatarURL ? (
          <Image source={{ uri: user.avatarURL }} style={styles.avatar} />
        ) : (
          <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{user.username.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{user.username}</Text>
        <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>User with public lists</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => (navigation as any).navigate('User', { userID: user.id })}
      >
        <Icon name="arrow-forward-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  // Render a search result based on its type
  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    switch (item.type) {
      case 'list':
        return renderListResult(item.data as List);
      case 'item':
        return renderItemResult(item.data as Item);
      case 'user':
        return renderUserResult(item.data as User);
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, {
        backgroundColor: colors.inputBackground,
        shadowColor: colors.shadow,
        borderColor: colors.inputBorder,
        borderWidth: 1
      }]}>
        <Icon name="search-outline" size={24} color={colors.iconSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.inputText }]}
          placeholder="Search..."
          placeholderTextColor={colors.inputPlaceholder}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchTerm('')}
            style={styles.clearButton}
          >
            <Icon name="close-circle-outline" size={20} color={colors.iconSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: activeFilter === 'library' ? colors.primary : colors.backgroundSecondary },
              activeFilter === 'library' && styles.selectedChip
            ]}
            onPress={() => handleFilterChange('library')}
          >
            <Text
              style={[
                styles.chipText,
                { color: activeFilter === 'library' ? 'white' : colors.textSecondary },
                activeFilter === 'library' && styles.selectedChipText
              ]}
            >
              Your Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: activeFilter === 'lists' ? colors.primary : colors.backgroundSecondary },
              activeFilter === 'lists' && styles.selectedChip
            ]}
            onPress={() => handleFilterChange('lists')}
          >
            <Text
              style={[
                styles.chipText,
                { color: activeFilter === 'lists' ? 'white' : colors.textSecondary },
                activeFilter === 'lists' && styles.selectedChipText
              ]}
            >
              Lists
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: activeFilter === 'items' ? colors.primary : colors.backgroundSecondary },
              activeFilter === 'items' && styles.selectedChip
            ]}
            onPress={() => handleFilterChange('items')}
          >
            <Text
              style={[
                styles.chipText,
                { color: activeFilter === 'items' ? 'white' : colors.textSecondary },
                activeFilter === 'items' && styles.selectedChipText
              ]}
            >
              Items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: activeFilter === 'users' ? colors.primary : colors.backgroundSecondary },
              activeFilter === 'users' && styles.selectedChip
            ]}
            onPress={() => handleFilterChange('users')}
          >
            <Text
              style={[
                styles.chipText,
                { color: activeFilter === 'users' ? 'white' : colors.textSecondary },
                activeFilter === 'users' && styles.selectedChipText
              ]}
            >
              Users
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results or Empty State */}
      {isEasterEgg ? (
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon name="rocket" size={80} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.easterEggTitle, { color: colors.textPrimary, fontSize: 30 }]}>
            Miss you boo bear &lt;3
          </Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderSearchResult}
          keyExtractor={(item, index) => `${item.type}-${(item.data as any).id || index}`}
          contentContainerStyle={styles.resultsList}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : null
          }
        />
      ) : (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : searchTerm ? (
            <>
              <Icon name="search-off-outline" size={64} color={colors.divider} />
              <Text style={[styles.message, { color: colors.textTertiary }]}>
                No results found for "{searchTerm}"
              </Text>
            </>
          ) : (
            <>
              <Icon name="search-outline" size={64} color={colors.divider} />
              <Text style={[styles.message, { color: colors.textTertiary }]}>
                Search your library, public lists, and users
              </Text>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 50,
    height: 50,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  easterEggTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  easterEggMessage: {
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  easterEggInfo: {
    marginTop: 24,
    alignItems: 'center',
  },
  easterEggSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SearchScreen; 