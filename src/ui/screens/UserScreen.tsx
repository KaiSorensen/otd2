import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { User } from '../../classes/User';
import { List } from '../../classes/List';
import { supabase } from '../../supabase/supabase';
import ListScreen from './ListScreen';
import ListPreview from '../components/ListPreview';
import { useColors } from '../../contexts/ColorContext';
import { getPublicListsByUser } from '../../wdb/wdbService';

interface UserScreenProps {
  user: User;
  onBack?: () => void;
}

const UserScreen: React.FC<UserScreenProps> = ({ user, onBack }) => {
  const { colors } = useColors();
  const [publicLists, setPublicLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<List | null>(null);

  useEffect(() => {
    fetchPublicLists();
  }, []);

  const fetchPublicLists = async () => {
    setLoading(true);
    try {
      const lists = await getPublicListsByUser(user.id, user.id);
      setPublicLists(lists);
    } catch (error) {
      console.error('Error fetching public lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleListSelect = (list: List) => {
    setSelectedList(list);
  };

  const handleBackFromListScreen = () => {
    setSelectedList(null);
  };

  // If a list is selected, show the ListScreen
  if (selectedList) {
    return <ListScreen list={selectedList} onBack={handleBackFromListScreen} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.iconPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      {/* User Profile Section */}
      <View style={[styles.profileSection, { borderBottomColor: colors.divider }]}>
        <View style={styles.avatarContainer}>
          {user.avatarURL ? (
            <Image source={{ uri: user.avatarURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.username, { color: colors.textPrimary }]}>{user.username}</Text>
      </View>

      {/* Public Lists Section */}
      <View style={styles.listsSection}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Public Lists</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : publicLists.length === 0 ? (
          <Text style={[styles.emptyMessage, { color: colors.textTertiary }]}>No public lists found</Text>
        ) : (
          <FlatList
            data={publicLists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListPreview list={item} onPress={() => handleListSelect(item)} />
            )}
            horizontal={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  loader: {
    marginTop: 24,
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
});

export default UserScreen; 