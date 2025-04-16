import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/UserContext';
import { useColors } from '../../contexts/ColorContext';
import { Folder } from '../../classes/Folder';
import { List } from '../../classes/List';
import { supabase } from '../../supabase/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import UserSettingsScreen from '../screens/UserSettingsScreen';
import ListScreen from '../screens/ListScreen';
import CreateFolderModal from '../components/CreateFolderModal';
import CreateListModal from '../components/CreateListModal';
import { deleteFolder } from '../../wdb/wdbService';

const LibraryScreen = () => {
  const { currentUser, loading } = useAuth();
  const { colors } = useColors();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);

  const toggleFolder = (folderId: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    if (newExpandedFolders.has(folderId)) {
      newExpandedFolders.delete(folderId);
    } else {
      newExpandedFolders.add(folderId);
    }
    setExpandedFolders(newExpandedFolders);
  };

  const toggleAllFolders = () => {
    if (allExpanded) {
      // Collapse all folders
      setExpandedFolders(new Set());
    } else {
      // Expand all folders
      const newExpandedFolders = new Set<string>();
      
      const addFolderIds = (folders: Folder[]) => {
        for (const folder of folders) {
          newExpandedFolders.add(folder.id);
          if (folder.subFolders.length > 0) {
            addFolderIds(folder.subFolders);
          }
        }
      };
      
      if (currentUser) {
        addFolderIds(currentUser.rootFolders);
      }
      
      setExpandedFolders(newExpandedFolders);
    }
    
    setAllExpanded(!allExpanded);
  };

  const renderListItem = (list: List, paddingLeft: number = 16) => (
    <TouchableOpacity
      key={list.id}
      style={[styles.listItem, { paddingLeft, borderBottomColor: colors.divider }]}
      onPress={() => setSelectedList(list)}
    >
      <View style={styles.listItemContent}>
        {list.coverImageURL ? (
          <Image source={{ uri: list.coverImageURL }} style={styles.listCover} />
        ) : (
          <View style={[styles.listCoverPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <Icon name="list-outline" size={20} color={colors.iconSecondary} />
          </View>
        )}
        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{list.title}</Text>
          {list.description && (
            <Text style={[styles.listDescription, { color: colors.textSecondary }]} numberOfLines={1}>
              {list.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleDeleteFolder = async (folder: Folder) => {
    if (!currentUser) return;

    Alert.alert(
      'Delete Folder',
      'Are you sure you want to delete this folder? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
              if (currentUser) {
                currentUser.removeFolder(folder);
                const newExpandedFolders = new Set(expandedFolders);
                newExpandedFolders.delete(folder.id);
                setExpandedFolders(newExpandedFolders);
              }
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Error', 'Failed to delete folder. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderFolderItem = (folder: Folder, level: number = 0) => {
    const paddingLeft = 16 + level * 20;
    const isExpanded = expandedFolders.has(folder.id);
    const isEmpty = folder.subFolders.length === 0 && folder.listsIDs.length === 0;

    return (
      <View key={folder.id}>
        <TouchableOpacity
          style={[styles.folderItem, { paddingLeft, borderBottomColor: colors.divider }]}
          onPress={() => !isEmpty && toggleFolder(folder.id)}
        >
          <Icon
            name={isExpanded ? 'folder-open-outline' : 'folder-outline'}
            size={24}
            color={colors.accent}
            style={styles.folderIcon}
          />
          <Text style={[styles.folderName, { color: colors.textPrimary }]}>{folder.name}</Text>
          {isEmpty ? (
            <TouchableOpacity 
              onPress={() => handleDeleteFolder(folder)}
              style={styles.deleteButton}
            >
              <Icon name="remove-circle-outline" size={24} color={colors.error} />
            </TouchableOpacity>
          ) : (
            <Icon
              name={isExpanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
              size={24}
              color={colors.iconSecondary}
            />
          )}
        </TouchableOpacity>

        {isExpanded && !isEmpty && (
          <View style={[styles.folderContent, { backgroundColor: colors.backgroundSecondary }]}>
            {folder.subFolders.map(subFolder =>
              renderFolderItem(subFolder, level + 1)
            )}

            {folder.listsIDs.map(listId => {
              const list = currentUser?.getList(listId);
              if (list) {
                return <React.Fragment key={listId}>{renderListItem(list, paddingLeft + 20)}</React.Fragment>;
              }
              return null;
            })}
          </View>
        )}
      </View>
    );
  };

  const handleBackFromListScreen = () => {
    setSelectedList(null);
  };

  const handleFolderCreated = (folder: Folder) => {
    if (currentUser) {
      currentUser.addFolder(folder);
    }
  };

  const handleListCreated = (list: List) => {
    if (currentUser) {
      currentUser.addList(list);
    }
  };

  if (selectedList) {
    return <ListScreen list={selectedList} onBack={handleBackFromListScreen} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <View style={styles.userProfile}>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            {currentUser?.avatarURL ? (
              <Image
                source={{ uri: currentUser.avatarURL }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                <Icon name="person-outline" size={24} color={colors.iconPrimary} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Text style={[styles.username, { color: colors.textPrimary }]}>
              {currentUser?.username || 'User'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={toggleAllFolders} style={styles.expandButton}>
          <Icon
            name={allExpanded ? 'contract-outline' : 'expand-outline'}
            size={24}
            color={colors.iconSecondary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your library...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {currentUser?.rootFolders && currentUser.rootFolders.length > 0 ? (
            currentUser.rootFolders.map(folder => renderFolderItem(folder))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="folder-outline" size={48} color={colors.divider} />
              <Text style={[styles.emptyStateText, { color: colors.textPrimary }]}>Your library is empty</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                Create folders and lists to organize your content
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Folder Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateFolder(true)}
      >
        <Icon name="folder-add-outline" size={24} color="white" />
        <Text style={styles.createButtonText}>New Folder</Text>
      </TouchableOpacity>

      {/* Create List Button */}
      <TouchableOpacity
        style={[styles.createButton, styles.createListButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateList(true)}
      >
        <Icon name="add-circle-outline" size={24} color="white" />
        <Text style={styles.createButtonText}>New List</Text>
      </TouchableOpacity>

      <Modal
        visible={showSettings}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Icon name="arrow-back" size={24} color={colors.iconPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>User Settings</Text>
            <View style={{ width: 24 }} />
          </View>
          <UserSettingsScreen />
        </SafeAreaView>
      </Modal>

      <CreateFolderModal
        visible={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onFolderCreated={handleFolderCreated}
        parentFolders={currentUser?.getAllFolders() || []}
      />

      <CreateListModal
        visible={showCreateList}
        onClose={() => setShowCreateList(false)}
        onListCreated={handleListCreated}
        folders={currentUser?.getAllFolders() || []}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  folderIcon: {
    marginRight: 12,
  },
  folderName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  folderContent: {
    // Background color is set dynamically
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCover: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  listCoverPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  listDescription: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
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
  createListButton: {
    left: undefined,
    right: 24,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
});

export default LibraryScreen; 