import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  BackHandler,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Item } from '../../classes/Item';
import { useColors } from '../../contexts/ColorContext';

interface ItemScreenProps {
  item: Item;
  onBack?: () => void;
  canEdit?: boolean;
}

// Helper function to strip HTML tags for plain text display
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};

const ItemScreen: React.FC<ItemScreenProps> = ({ item, onBack, canEdit = false }) => {
  const { colors, isDarkMode } = useColors();
  const [title, setTitle] = useState<string>(item.title || '');
  const [content, setContent] = useState<string>(stripHtml(item.content || ''));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Log item content for debugging
  useEffect(() => {
    // // console.log('Item content:', item.id, item.title);
    // // console.log('Content length:', item.content?.length || 0);
    // // console.log('Content preview:', item.content?.substring(0, 100));
  }, []);

  // Update state when item prop changes
  useEffect(() => {
    setTitle(item.title || '');
    setContent(stripHtml(item.content || ''));
    setHasChanges(false);
  }, [item]);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [hasChanges]);

  // Save changes to the item
  const saveChanges = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      // Update item properties using proper setters
      item.title = title;
      
      // Format content as simple HTML
      const htmlContent = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
      item.content = htmlContent;
      
      // Save to database
      await item.save();
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back button press
  const handleBack = async () => {
    if (hasChanges) {
      // Save changes before going back
      await saveChanges();
    }
    
    if (onBack) {
      onBack();
    }
  };

  // Handle content change
  const handleContentChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  // Handle title change
  const handleTitleChange = (text: string) => {
    // Remove newlines from title
    const cleanText = text.replace(/\n/g, '');
    setTitle(cleanText);
    setHasChanges(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.iconPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            hasChanges && canEdit && (
              <TouchableOpacity 
                onPress={saveChanges} 
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Title Input */}
        <TextInput
          style={[
            styles.titleInput, 
            { 
              color: colors.textPrimary,
              opacity: canEdit ? 1 : 0.7
            }
          ]}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Title"
          placeholderTextColor={colors.inputPlaceholder}
          multiline={false}
          maxLength={100}
          returnKeyType="next"
          editable={canEdit}
        />
        
        {/* Separator Line */}
        <View style={[styles.separator, { backgroundColor: colors.divider }]} />
        
        {/* Content Input */}
        <TextInput
          style={[
            styles.contentInput, 
            { 
              color: colors.textPrimary,
              opacity: canEdit ? 1 : 0.7
            }
          ]}
          value={content}
          onChangeText={handleContentChange}
          placeholder="Start typing..."
          placeholderTextColor={colors.inputPlaceholder}
          multiline={true}
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect={true}
          editable={canEdit}
        />
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 300,
  },
});

export default ItemScreen; 