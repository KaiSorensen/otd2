import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useColors } from '../../contexts/ColorContext';
import { List } from '../../classes/List';
import { Folder } from '../../classes/Folder';
import { v4 as uuidv4 } from 'uuid';
import { storeNewList } from '../../wdb/wdbService';
import { useAuth } from '../../contexts/UserContext';

interface CreateListModalProps {
  visible: boolean;
  onClose: () => void;
  onListCreated: (list: List) => void;
  folders: Folder[];
}

const CreateListModal: React.FC<CreateListModalProps> = ({
  visible,
  onClose,
  onListCreated,
  folders,
}) => {
  const { colors } = useColors();
  const { currentUser } = useAuth();
  const [listName, setListName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  const handleCreate = async () => {
    if (!listName.trim() || !currentUser || !selectedFolderId) return;

    const newList = new List(
      uuidv4(),
      currentUser.id,
      listName.trim(),
      '', // description
      null, // coverImageURL
      false, // isPublic
      currentUser.id,
      selectedFolderId,
      'date-first', // default sortOrder
      false, // today
      null, // currentItem
      false, // notifyOnNew
      null, // notifyTime
      null, // notifyDays
      0 // orderIndex
    );

    try {
      await storeNewList(newList, currentUser.id, selectedFolderId);
      onListCreated(newList);
      onClose();
      // Reset form
      setListName('');
      setSelectedFolderId('');
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

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
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create New List</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.iconPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={[styles.inputContainer, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>List Name</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.divider
                }]}
                value={listName}
                onChangeText={setListName}
                placeholder="Enter list name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.inputContainer, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Parent Folder</Text>
              <TouchableOpacity
                style={[styles.dropdownButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
              >
                <Text style={[styles.dropdownButtonText, { color: colors.textPrimary }]}>
                  {selectedFolderId ?
                    folders.find(f => f.id === selectedFolderId)?.name || 'Unknown' :
                    'None (Root Folder)'}
                </Text>
                <Icon
                  name={isFolderDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.iconSecondary}
                />
              </TouchableOpacity>

              {isFolderDropdownOpen && (
                <View style={[styles.dropdownContent, { backgroundColor: colors.backgroundSecondary }]}>
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                    onPress={() => {
                      setSelectedFolderId('');
                      setIsFolderDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>
                      None (Root Folder)
                    </Text>
                  </TouchableOpacity>
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
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: colors.primary }
              ]}
              onPress={handleCreate}
              disabled={!listName.trim()}
            >
              <Text style={styles.createButtonText}>Create List</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
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
  createButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateListModal; 