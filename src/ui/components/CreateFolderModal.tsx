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
import { Folder } from '../../classes/Folder';
import { v4 as uuidv4 } from 'uuid';
import { storeNewFolder } from '../../wdb/wdbService';
import { useAuth } from '../../contexts/UserContext';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onFolderCreated: (folder: Folder) => void;
  parentFolders: Folder[];
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onFolderCreated,
  parentFolders,
}) => {
  const { colors } = useColors();
  const { currentUser } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim() || !currentUser) return;

    const newFolder = new Folder(
      uuidv4(),
      currentUser.id,
      selectedParentId || null,
      folderName.trim(),
    );

    try {
      await storeNewFolder(newFolder);
      onFolderCreated(newFolder);
      onClose();
      // Reset form
      setFolderName('');
      setSelectedParentId(null);
    } catch (error) {
      console.error('Error creating folder:', error);
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
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create New Folder</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.iconPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={[styles.inputContainer, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Folder Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.divider
                }]}
                value={folderName}
                onChangeText={setFolderName}
                placeholder="Enter folder name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.inputContainer, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Parent Folder</Text>
              <TouchableOpacity
                style={[styles.dropdownButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
              >
                <Text style={[styles.dropdownButtonText, { color: colors.textPrimary }]}>
                  {selectedParentId ? 
                    parentFolders.find(f => f.id === selectedParentId)?.name || 'Unknown' : 
                    'None (Root Folder)'}
                </Text>
                <Icon
                  name={isParentDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.iconSecondary}
                />
              </TouchableOpacity>
              
              {isParentDropdownOpen && (
                <View style={[styles.dropdownContent, { backgroundColor: colors.backgroundSecondary }]}>
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                    onPress={() => {
                      setSelectedParentId(null);
                      setIsParentDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>
                      None (Root Folder)
                    </Text>
                  </TouchableOpacity>
                  {parentFolders.map(folder => (
                    <TouchableOpacity
                      key={folder.id}
                      style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                      onPress={() => {
                        setSelectedParentId(folder.id);
                        setIsParentDropdownOpen(false);
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
              disabled={!folderName.trim()}
            >
              <Text style={styles.createButtonText}>Create Folder</Text>
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

export default CreateFolderModal; 