import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { List, DayOfWeek } from '../../classes/List';
import { useColors } from '../../contexts/ColorContext';
import { useAuth } from '../../contexts/UserContext';
import { deleteList } from '../../wdb/wdbService';
import { Folder } from '../../classes/Folder';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleBatchNotificationsForList, cancelNotificationsForList } from '../../notifications/notifService';

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

// Define props interface for the folder dropdown component
interface FolderDropdownProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  toggleOpen: () => void;
  colors: any;
  folders: Folder[];
}

// Dropdown component for folder selection
const FolderDropdown: React.FC<FolderDropdownProps> = ({ value, onChange, isOpen, toggleOpen, colors, folders }) => {
  const getFolderName = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : 'Unknown Folder';
  };
  
  return (
    <View style={[styles.dropdownContainer, { borderColor: colors.divider }]}>
      <TouchableOpacity 
        style={[styles.dropdownHeader, { backgroundColor: colors.backgroundSecondary }]} 
        onPress={toggleOpen}
      >
        <Text style={[styles.dropdownHeaderText, { color: colors.textPrimary }]}>Folder: {getFolderName(value)}</Text>
        <Icon 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={colors.iconSecondary}
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownOptions}>
          {folders.map((folder) => (
            <TouchableOpacity
              key={folder.id}
              style={[
                styles.dropdownOption,
                { borderBottomColor: colors.divider },
                value === folder.id && [styles.dropdownOptionSelected, { backgroundColor: colors.backgroundTertiary }]
              ]}
              onPress={() => {
                onChange(folder.id);
                toggleOpen();
              }}
            >
              <Text 
                style={[
                  styles.dropdownOptionText,
                  { color: colors.textSecondary },
                  value === folder.id && [styles.dropdownOptionTextSelected, { color: colors.primary }]
                ]}
              >
                {folder.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface ListSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  list: List;
  onSave: (updates: Partial<List>) => void;
  isOwner: boolean;
  onRemoveFromLibrary: () => void;
  onDeleteList: () => void;
}

const ListSettingsModal: React.FC<ListSettingsModalProps> = ({
  visible,
  onClose,
  list,
  onSave,
  isOwner,
  onRemoveFromLibrary,
  onDeleteList,
}) => {
  const { colors } = useColors();
  const { currentUser } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  const [notifyOnNew, setNotifyOnNew] = useState(false);
  const [notifyTime, setNotifyTime] = useState<string>('09:00');
  const [notifyDays, setNotifyDays] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<'date-first' | 'date-last'>('date-first');
  const [isSortOrderOpen, setIsSortOrderOpen] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  
  // Local state for immediate feedback
  const [localSettings, setLocalSettings] = useState({
    isPublic: list.isPublic,
    today: list.today,
    notifyOnNew: list.notifyOnNew,
    sortOrder: list.sortOrder as SortOrderType,
    notifyTime: list.notifyTime,
    notifyDays: list.notifyDays,
  });
  const [editingNotification, setEditingNotification] = useState(false);

  // Update local state when modal opens or list changes
  useEffect(() => {
    setLocalSettings({
      isPublic: list.isPublic,
      today: list.today,
      notifyOnNew: list.notifyOnNew,
      sortOrder: list.sortOrder as SortOrderType,
      notifyTime: list.notifyTime,
      notifyDays: list.notifyDays,
    });
    setEditingNotification(false);
  }, [visible, list]);

  // Batch settings changes
  const handleSettingChange = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // Save all changes when modal is closed
  const handleClose = async () => {
    onSave(localSettings);
    // Schedule or cancel notifications based on settings
    if (localSettings.notifyTime && localSettings.notifyDays && localSettings.notifyDays.length > 0) {
      try {
        const batchCount = Math.min(Math.floor(64 / (currentUser?.getNotificationLists().length || 1)), 32);
        // Default batchCount to 7, intervalDays to 1
        scheduleBatchNotificationsForList(
          list,
          batchCount
        );
      } catch (e) {
        // Optionally log error
      }
    } else {
      try {
        await cancelNotificationsForList(list);
      } catch (e) {
        // Optionally log error
      }
    }
    onClose();
  };

  const handleFolderChange = async (newFolderId: string) => {
    if (!currentUser) return;
    
    try {
      await currentUser.switchFolderOfList(currentUser.id, list, newFolderId);
      onSave({ folderID: newFolderId });
    } catch (error) {
      console.error('Error moving list to new folder:', error);
      Alert.alert('Error', 'Failed to move list to new folder. Please try again.');
    }
  };

  const handleRemoveFromLibrary = async () => {
    if (!list || !currentUser) return;

    try {
      await deleteList(list.id);
      currentUser.removeList(list);
      onRemoveFromLibrary();
      onClose();
    } catch (error) {
      console.error('Error removing list from library:', error);
      Alert.alert('Error', 'Failed to remove list from library. Please try again.');
    }
  };

  const handleDeleteList = async () => {
    if (!list || !currentUser) return;

    try {
      await deleteList(list.id);
      currentUser.removeList(list);
      onDeleteList();
      onClose();
    } catch (error) {
      console.error('Error deleting list:', error);
      Alert.alert('Error', 'Failed to delete list. Please try again.');
    }
  };

  const handleNotificationButtonPress = () => {
    if (localSettings.notifyTime && localSettings.notifyDays && localSettings.notifyDays.length > 0) {
      setLocalSettings(prev => ({ ...prev, notifyTime: null, notifyDays: null }));
      setEditingNotification(false);
    } else {
      // If no days are selected, default to all days checked
      // If no time is set, default to now
      setLocalSettings(prev => ({
        ...prev,
        notifyDays: prev.notifyDays && prev.notifyDays.length > 0 ? prev.notifyDays : ['mon','tue','wed','thu','fri','sat','sun'],
        notifyTime: prev.notifyTime || new Date(),
      }));
      setEditingNotification(true);
    }
  };

  const handleConfirmNotification = () => {
    setEditingNotification(false);
  };

  const handleCancelNotificationEdit = () => {
    setLocalSettings(prev => ({
      ...prev,
      notifyTime: list.notifyTime,
      notifyDays: list.notifyDays,
    }));
    setEditingNotification(false);
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setLocalSettings(prev => {
      const days = prev.notifyDays || [];
      return {
        ...prev,
        notifyDays: days.includes(day)
          ? days.filter(d => d !== day)
          : [...days, day],
      };
    });
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (date) {
      setLocalSettings(prev => ({ ...prev, notifyTime: date }));
    }
  };

  const getNotificationSummary = () => {
    if (!localSettings.notifyTime || !localSettings.notifyDays || localSettings.notifyDays.length === 0) return 'Disabled';
    const daysArr = localSettings.notifyDays;
    const allDays: DayOfWeek[] = ['mon','tue','wed','thu','fri','sat','sun'];
    const weekdays: DayOfWeek[] = ['mon','tue','wed','thu','fri'];
    const weekends: DayOfWeek[] = ['sat','sun'];
    let daysLabel = daysArr.map(d => daysOfWeek.find(day => day.key === d)?.label).join(', ');
    if (daysArr.length === 7 && allDays.every(d => daysArr.includes(d))) {
      daysLabel = 'Daily';
    } else if (daysArr.length === 5 && weekdays.every(d => daysArr.includes(d))) {
      daysLabel = 'Weekdays';
    } else if (daysArr.length === 2 && weekends.every(d => daysArr.includes(d))) {
      daysLabel = 'Weekends';
    }
    const time = localSettings.notifyTime ? localSettings.notifyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return `${daysLabel}${time ? ' at ' + time : ''}`;
  };

  const daysOfWeek: { key: DayOfWeek; label: string }[] = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>List Settings</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color={colors.iconSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Folder Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Location</Text>
              <FolderDropdown
                value={list.folderID}
                onChange={handleFolderChange}
                isOpen={isFolderDropdownOpen}
                toggleOpen={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                colors={colors}
                folders={currentUser?.getAllFolders() || []}
              />
            </View>

            {/* Owner Settings */}
            {isOwner && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Owner Settings</Text>
                <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Public</Text>
                  <Switch
                    value={localSettings.isPublic}
                    onValueChange={(value) => handleSettingChange('isPublic', value)}
                    trackColor={{ false: colors.backgroundSecondary, true: `${colors.primary}80` }}
                    thumbColor={localSettings.isPublic ? colors.primary : colors.backgroundTertiary}
                  />
                </View>
                <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Description</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]} numberOfLines={2}>
                    {list.description || 'No description'}
                  </Text>
                </View>
                <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Cover Image</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {list.coverImageURL ? 'Has cover image' : 'No cover image'}
                  </Text>
                </View>
              </View>
            )}

            {/* Library Settings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Library Settings</Text>
              <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Today</Text>
                <Switch
                  value={localSettings.today}
                  onValueChange={(value) => handleSettingChange('today', value)}
                  trackColor={{ false: colors.backgroundSecondary, true: `${colors.primary}80` }}
                  thumbColor={localSettings.today ? colors.primary : colors.backgroundTertiary}
                />
              </View>
              <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Notify on new</Text>
                <Switch
                  value={localSettings.notifyOnNew}
                  onValueChange={(value) => handleSettingChange('notifyOnNew', value)}
                  trackColor={{ false: colors.backgroundSecondary, true: `${colors.primary}80` }}
                  thumbColor={localSettings.notifyOnNew ? colors.primary : colors.backgroundTertiary}
                />
              </View>
              <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Sort Order</Text>
                <SortOrderDropdown
                  value={localSettings.sortOrder}
                  onChange={(value) => handleSettingChange('sortOrder', value)}
                  isOpen={isSortOrderOpen}
                  toggleOpen={() => setIsSortOrderOpen(!isSortOrderOpen)}
                  colors={colors}
                />
              </View>
              {localSettings.notifyOnNew && (
                <>
                  <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Notify Time</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                      {list.notifyTime ? new Date(list.notifyTime).toLocaleTimeString() : 'Not set'}
                    </Text>
                  </View>
                  <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Notify Days</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                      {list.notifyDays || 'Not set'}
                    </Text>
                  </View>
                </>
              )}
            </View>
            
            {/* Notifications */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notifications</Text>
              <TouchableOpacity
                style={[
                  styles.settingRow,
                  { borderBottomColor: colors.divider, justifyContent: 'space-between' },
                ]}
                onPress={handleNotificationButtonPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Notifications</Text>
                <View style={{
                  backgroundColor: (localSettings.notifyTime && localSettings.notifyDays && localSettings.notifyDays.length > 0 && !editingNotification) ? colors.primary : colors.backgroundSecondary,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                }}>
                  <Text style={{
                    color: editingNotification
                      ? colors.textSecondary
                      : (localSettings.notifyTime && localSettings.notifyDays && localSettings.notifyDays.length > 0 ? 'white' : colors.textSecondary),
                  }}>
                    {getNotificationSummary()}
                  </Text>
                </View>
              </TouchableOpacity>
              {editingNotification && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Days</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                    {daysOfWeek.map(day => (
                      <TouchableOpacity
                        key={day.key}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginRight: 16,
                          marginBottom: 8,
                        }}
                        onPress={() => handleDayToggle(day.key)}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: colors.primary,
                          backgroundColor: localSettings.notifyDays && localSettings.notifyDays.includes(day.key) ? colors.primary : 'transparent',
                          marginRight: 6,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          {localSettings.notifyDays && localSettings.notifyDays.includes(day.key) && (
                            <Icon name="checkmark" size={16} color="white" />
                          )}
                        </View>
                        <Text style={{ color: colors.textPrimary }}>{day.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                    <Icon name="time-outline" size={20} color={colors.iconSecondary} style={{ marginRight: 8 }} />
                    <DateTimePicker
                      value={localSettings.notifyTime || new Date()}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 16 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.primary,
                        borderRadius: 8,
                        paddingVertical: 10,
                        alignItems: 'center',
                        marginRight: 8,
                      }}
                      onPress={handleConfirmNotification}
                      disabled={!(localSettings.notifyDays && localSettings.notifyDays.length > 0)}
                    >
                      <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                        Confirm
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.backgroundSecondary,
                        borderRadius: 8,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.divider,
                      }}
                      onPress={handleCancelNotificationEdit}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 16 }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {(localSettings.notifyTime === null || localSettings.notifyDays === null || localSettings.notifyDays.length === 0) && (
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Notifications are disabled.</Text>
              )}
            </View>
            
            {/* Remove/Delete Button */}
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: colors.error }]}
              onPress={isOwner ? handleDeleteList : handleRemoveFromLibrary}
            >
              <Text style={styles.dangerButtonText}>
                {isOwner ? 'Delete List' : 'Remove From Library'}
              </Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    marginLeft: 16,
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
  dangerButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ListSettingsModal; 