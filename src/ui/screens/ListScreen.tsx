import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  Alert,
  Modal
} from 'react-native';
import { List } from '../../classes/List';
import { Item } from '../../classes/Item';
import { User } from '../../classes/User';
import { Folder } from '../../classes/Folder';
import { addItems, storeNewItem, deleteItem, storeNewList, deleteList, getItemsInList as local_getItemsInList } from '../../wdb/wdbService';
import { getItemsInList as remote_getItemsInList, retrieveUser } from '../../supabase/databaseService';
// import ListImage from '../components/ListImage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/UserContext';
import { useColors } from '../../contexts/ColorContext';
import ItemScreen from './ItemScreen';
import UserScreen from './UserScreen';
import ListSettingsModal from '../components/ListSettingsModal';
import { v4 as uuidv4 } from 'uuid';
import ParserView from '../components/Parser';
import { useRoute, useNavigation } from '@react-navigation/native';


// Helper function to strip HTML tags for plain text display
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};

// Define type for sort order
type SortOrderType = "date-first" | "date-last" | "alphabetical" | "manual";

// Define props interface for the dropdown component
interface SortOrderDropdownProps {
  value: SortOrderType;
  onChange: (value: SortOrderType) => void;
  isOpen: boolean;
  toggleOpen: () => void;
  colors: any;
}

// Dropdown component for sort order
const SortOrderDropdown: React.FC<SortOrderDropdownProps> = ({ value, onChange, isOpen, toggleOpen, colors }) => {
  const options: SortOrderType[] = ["date-first", "date-last", "alphabetical", "manual"];
  
  return (
    <View style={[styles.dropdownContainer, { borderColor: colors.divider }]}>
      <TouchableOpacity 
        style={[styles.dropdownHeader, { backgroundColor: colors.backgroundSecondary }]} 
        onPress={toggleOpen}
      >
        <Text style={[styles.dropdownHeaderText, { color: colors.textPrimary }]}>Sort: {value}</Text>
        <Icon 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={colors.iconSecondary}
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownOption,
                { borderBottomColor: colors.divider },
                value === option && [styles.dropdownOptionSelected, { backgroundColor: colors.backgroundTertiary }]
              ]}
              onPress={() => {
                onChange(option);
                toggleOpen();
              }}
            >
              <Text 
                style={[
                  styles.dropdownOptionText,
                  { color: colors.textSecondary },
                  value === option && [styles.dropdownOptionTextSelected, { color: colors.primary }]
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface ListScreenProps {
  list: List;
  onBack?: () => void;
  initialItemId?: string | null;
}

// Add new AddToLibraryModal component
interface AddToLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (folderId: string) => void;
  folders: Folder[];
}

const AddToLibraryModal: React.FC<AddToLibraryModalProps> = ({
  visible,
  onClose,
  onAdd,
  folders,
}) => {
  const { colors } = useColors();
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add to Library</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.iconPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={[styles.inputContainer, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Select Folder</Text>
              {loadingFolders ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.folderLoader} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.dropdownButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                  >
                    <Text style={[styles.dropdownButtonText, { color: colors.textPrimary }]}>
                      {selectedFolderId ? 
                        folders.find(f => f.id === selectedFolderId)?.name || 'Unknown' : 
                        'Select a folder'}
                    </Text>
                    <Icon
                      name={isFolderDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={colors.iconSecondary}
                    />
                  </TouchableOpacity>
                  
                  {isFolderDropdownOpen && (
                    <View style={[styles.dropdownContent, { backgroundColor: colors.backgroundSecondary }]}>
                      {folders.map(folder => (
                        <TouchableOpacity
                          key={folder.id}
                          style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                          onPress={() => {
                            setSelectedFolderId(folder.id);
                            setIsFolderDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>
                            {folder.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: colors.primary, opacity: !selectedFolderId || loadingFolders ? 0.5 : 1 }
              ]}
              onPress={() => {
                if (selectedFolderId && !loadingFolders) {
                  onAdd(selectedFolderId);
                  onClose();
                }
              }}
              disabled={!selectedFolderId || loadingFolders}
            >
              <Text style={styles.addButtonText}>Add to Library</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ListScreen: React.FC<ListScreenProps> = ({ list: initialList, onBack, initialItemId }) => {
  const { currentUser, forceUserUpdate } = useAuth();
  const { colors, isDarkMode } = useColors();
  const [list, setList] = useState<List>(initialList);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddToLibraryModalVisible, setIsAddToLibraryModalVisible] = useState(false);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [listOwner, setListOwner] = useState<User | null>(null);
  const [isParserModalVisible, setIsParserModalVisible] = useState(false);
  const route = useRoute();
  const navigation = useNavigation();
  const [hasHandledNotification, setHasHandledNotification] = useState(false);

  
  // Add useEffect to check if list is in library and use that version if it exists
  useEffect(() => {
    if (currentUser) {
      const libraryList = currentUser.listMap.get(initialList.id);
      if (libraryList) {
        setList(libraryList);
      }
    }
  }, [currentUser, initialList.id]);

  // Add useEffect to update list state when list properties change
  useEffect(() => {
    if (currentUser) {
      const libraryList = currentUser.listMap.get(list.id);
      if (libraryList) {
        setList(libraryList);
      }
    }
  }, [currentUser, list.id]);

  // Local state for list properties that can be modified
  const [isToday, setIsToday] = useState(list.today || false);
  const [isPublic, setIsPublic] = useState(list.isPublic || false);
  const [notifyOnNew, setNotifyOnNew] = useState(list.notifyOnNew || false);
  const [sortOrder, setSortOrder] = useState<SortOrderType>(list.sortOrder as SortOrderType || 'date-first');
  const [isSortOrderOpen, setIsSortOrderOpen] = useState(false);

  // Add useEffect to fetch items and owner when component mounts or list changes
  useEffect(() => {
    fetchItems();
    fetchOwner();
  }, [list]);

  // Add useEffect to fetch folders when modal is opened
  useEffect(() => {
    if (isAddToLibraryModalVisible && currentUser) {
      fetchUserFolders();
    }
  }, [isAddToLibraryModalVisible, currentUser]);

  // Open item if initialItemId is provided (e.g. from notification)
  useEffect(() => {
    if (
      initialItemId &&
      items.length > 0 &&
      !hasHandledNotification
    ) {
      const found = items.find(i => i.id === initialItemId);
      if (found) {
        (navigation as any).navigate('Item', { item: found, canEdit: false });
      }
      setHasHandledNotification(true);
    }
  }, [initialItemId, items, navigation, hasHandledNotification]);

  // When the list changes (e.g. navigating to a new list), reset the notification flag
  useEffect(() => {
    setHasHandledNotification(false);
  }, [initialList.id]);

  // Function to fetch items
  const fetchItems = async () => {
    setLoading(true);
    try {
      // if the list is in our library, then we need to fetch the items from the library
      if (list.folderID) {
        // // console.log("fetching items from library")
        const listItems = await local_getItemsInList(list);
        setItems(listItems);
      } else {
        // // console.log("fetching items from remote")
        // if the list is not in our library, then we need to fetch the items from the remote database
        const listItems = await remote_getItemsInList(list.id);
        setItems(listItems);
      }
      
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch user's folders
  const fetchUserFolders = async () => {
    if (!currentUser) return;
    
    setLoadingFolders(true);
    try {
      // First get the populated user to ensure we have the latest folder data
      setUserFolders(currentUser.getAllFolders());
    } catch (error) {
      console.error('Error fetching user folders:', error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchOwner = async () => {
    const owner = await retrieveUser(list.ownerID);
    setListOwner(owner);
  };

  // Handle settings save
  const handleSettingsSave = async (updates: Partial<List>) => {
    try {
      // Update local state immediately for UI feedback
      if ('isPublic' in updates && updates.isPublic !== undefined) setIsPublic(updates.isPublic);
      if ('today' in updates && updates.today !== undefined) setIsToday(updates.today);
      if ('notifyOnNew' in updates && updates.notifyOnNew !== undefined) setNotifyOnNew(updates.notifyOnNew);
      if ('sortOrder' in updates && updates.sortOrder !== undefined) setSortOrder(updates.sortOrder as SortOrderType);

      // Update the list object
      Object.assign(list, updates);
      
      // Save to database
      if (currentUser) {
        await list.save(currentUser.id);
      }
      // Refresh the User to update the library UI
      await currentUser?.refresh();
      //force UI update
      await forceUserUpdate();
    } catch (error) {
      console.error('Error saving list settings:', error);
      // Revert local state if save fails
      if ('isPublic' in updates && updates.isPublic !== undefined) setIsPublic(list.isPublic);
      if ('today' in updates && updates.today !== undefined) setIsToday(list.today);
      if ('notifyOnNew' in updates && updates.notifyOnNew !== undefined) setNotifyOnNew(list.notifyOnNew);
      if ('sortOrder' in updates && updates.sortOrder !== undefined) setSortOrder(list.sortOrder as SortOrderType);
    }
  };

  // Function to handle adding a new item
  const handleAddItem = async () => {
    if (!currentUser || currentUser.id !== list.ownerID) return;

    const newItem = new Item(
      uuidv4(),
      list.id,
      '',
      [],
      items.length,
      new Date(),
      new Date()
    );
    await storeNewItem(newItem);
    setItems([...items, newItem]);
    (navigation as any).navigate('Item', {
      item: newItem,
      canEdit: true,
      onItemDone: (result: { item: Item, deleted: boolean }) => {
        if (result.deleted) {
          setItems((prev) => prev.filter(i => i.id !== newItem.id));
        } else {
          setItems((prev) => prev.map(i => i.id === newItem.id ? result.item : i));
        }
      }
    });
  };

  // Function to handle deleting an item
  const handleDeleteItem = async (item: Item) => {
    if (!currentUser || currentUser.id !== list.ownerID) return;

    try {
      await deleteItem(currentUser.id, item.id);
      setItems(items.filter(i => i.id !== item.id));
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    }
  };

  // Function to handle adding list to library
  const handleAddToLibrary = async (folderId: string) => {
    if (!currentUser) return;
    
    try {
      await storeNewList(list, currentUser.id, folderId);
      if (currentUser.id !== list.ownerID) {
        await addItems(items); // if it's not in our library AND the user is not the owner, then we need to download the items
        // // console.log("added remote items to library")
      }
      // Refresh the User to update the library UI
      await currentUser.refresh();
      //force UI update
      await forceUserUpdate();
      // Update the local list state to reflect it's now in the library
      const updatedList = currentUser.listMap.get(list.id);
      if (updatedList) {
        setList(updatedList);
      }
    } catch (error) {
      console.error('Error adding list to library:', error);
      Alert.alert('Error', 'Failed to add list to library. Please try again.');
    }
  };

  // Function to handle removing list from library
  const handleRemoveFromLibrary = async () => {
    if (!currentUser || !list.folderID) return;

    Alert.alert(
      'Remove from Library',
      'Are you sure you want to remove this list from your library?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // First remove from memory
              currentUser.removeList(list);
              // Then delete from database
              await deleteList(list.id);
              // Update the local list state to reflect it's no longer in the library
              setList(initialList);
              // Finally refresh user state
              // await currentUser.refresh(); //this is now handled in the UserContext
              await forceUserUpdate();
            } catch (error) {
              console.error('Error removing list from library:', error);
              Alert.alert('Error', 'Failed to remove list from library. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Function to handle deleting list
  const handleDeleteList = async () => {
    if (!currentUser || currentUser.id !== list.ownerID) return;

    Alert.alert(
      'Delete List',
      'Are you sure you want to delete this list? This action cannot be undone.',
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
              await deleteList(list.id);
              if (onBack) onBack();
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Failed to delete list. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Render an item row
  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity 
      style={[styles.resultItem, { 
        backgroundColor: colors.card,
        shadowColor: colors.shadow
      }]}
      onPress={() => {
        if (!isEditMode) {
          (navigation as any).navigate('Item', {
            item,
            canEdit: !!(currentUser && currentUser.id === list.ownerID),
            onItemDone: (result: { item: Item, deleted: boolean }) => {
              if (result.deleted) {
                setItems((prev) => prev.filter(i => i.id !== item.id));
              } else {
                setItems((prev) => prev.map(i => i.id === item.id ? result.item : i));
              }
            }
          });
        }
      }}
    >
      <View style={styles.resultContent}>
        <Text style={[styles.resultDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {stripHtml(item.content)}
        </Text>
      </View>
      {isEditMode ? (
        <TouchableOpacity 
          onPress={() => handleDeleteItem(item)}
          style={styles.deleteButton}
        >
          <Icon name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      ) : (
        <Icon name="chevron-forward" size={24} color={colors.iconSecondary} />
      )}
    </TouchableOpacity>
  );

  // Calculate header height based on screen dimensions
  const { width, height } = Dimensions.get('window');
  const headerHeight = Math.min(height * 0.4, 300);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header with back button and list title */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.iconPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
          {list.title}
        </Text>
        <View style={styles.headerRight}>
          {currentUser && currentUser.id === list.ownerID && (
            <>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={handleAddItem}
              >
                <Icon name="add" size={24} color={colors.iconPrimary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <Icon 
                  name={isEditMode ? "checkmark" : "pencil"} 
                  size={24} 
                  color={colors.iconPrimary} 
                />
              </TouchableOpacity>
            </>
          )}
          {currentUser && (
            currentUser.id === list.ownerID || list.folderID ? (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setIsSettingsModalVisible(true)}
              >
                <Icon name="settings-outline" size={24} color={colors.iconPrimary} />
              </TouchableOpacity>
            ) : !list.folderID && (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setIsAddToLibraryModalVisible(true)}
              >
                <Icon name="add-circle-outline" size={24} color={colors.iconPrimary} />
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
      
      {/* Scrollable content */}
      <ScrollView style={styles.scrollContent}>
        {/* List details section */}
        <View style={[styles.detailsSection, { borderBottomColor: colors.divider }]}>
          {/* <View style={styles.coverImageContainer}>
            {list.coverImageURL ? (
              <Image source={{ uri: list.coverImageURL }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]} />
            )}
          </View> */}
          
          <View style={styles.listInfo}>
            <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{list.title}</Text>
            
            {/* Owner info with profile link */}
            {listOwner && (
              <TouchableOpacity 
                style={[styles.ownerContainer, { backgroundColor: colors.backgroundSecondary }]} 
                onPress={() => (navigation as any).navigate('User', { userID: listOwner.id })}
              >
                <View style={[styles.ownerAvatarContainer, { backgroundColor: colors.backgroundTertiary }]}>
                  {listOwner.avatarURL ? (
                    <Image source={{ uri: listOwner.avatarURL }} style={styles.ownerAvatar} />
                  ) : (
                    <Text style={[styles.ownerAvatarText, { color: colors.textTertiary }]}>
                      {listOwner.username.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.ownerName, { color: colors.textSecondary }]}>
                  {listOwner.username}
                </Text>
                <Icon name="chevron-forward" size={16} color={colors.iconSecondary} />
              </TouchableOpacity>
            )}
            
            {list.description && (
              <Text style={[styles.listDescription, { color: colors.textSecondary }]}>
                {stripHtml(list.description)}
              </Text>
            )}
          </View>
        </View>
        
        {/* Items list */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.itemsContainer}>
            {items.map((item) => (
              <View key={item.id}>
                {renderItem({ item })}
              </View>
            ))}
            {items.length === 0 && (
              <Text style={[styles.emptyMessage, { color: colors.textTertiary }]}>No items in this list yet</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Settings Modal */}
      <ListSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        list={list}
        onSave={handleSettingsSave}
        isOwner={list.isOwner(currentUser?.id || '')}
        onRemoveFromLibrary={handleRemoveFromLibrary}
        onDeleteList={handleDeleteList}
      />

      {/* Add to Library Modal */}
      <AddToLibraryModal
        visible={isAddToLibraryModalVisible}
        onClose={() => setIsAddToLibraryModalVisible(false)}
        onAdd={handleAddToLibrary}
        folders={userFolders}
      />

      {/* Parser View */}
      {isParserModalVisible && (
        <ParserView
          visible={isParserModalVisible}
          onDismiss={() => {
            setIsParserModalVisible(false);
            fetchItems(); // Refresh items after parser is closed
          }}
          list={list}
        />
      )}
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
    flex: 1,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  detailsSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  listInfo: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    padding: 6,
    borderRadius: 20,
  },
  ownerAvatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  ownerAvatar: {
    width: '100%',
    height: '100%',
  },
  ownerAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ownerName: {
    fontSize: 14,
    flex: 1,
  },
  controlsSection: {
    marginTop: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  controlLabel: {
    fontSize: 16,
  },
  dropdownContainer: {
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  dropdownHeaderText: {
    fontSize: 16,
  },
  dropdownOptions: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
  },
  dropdownOptionSelected: {
    // Background color is set dynamically
  },
  dropdownOptionText: {
    fontSize: 16,
  },
  dropdownOptionTextSelected: {
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  itemsContainer: {
    padding: 16,
  },
  loader: {
    marginTop: 24,
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  resultItem: {
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultContent: {
    flex: 1,
    marginRight: 12,
  },
  resultDescription: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
  },
  dropdownContent: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  addButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  folderLoader: {
    marginVertical: 16,
  },
});

export default ListScreen; 