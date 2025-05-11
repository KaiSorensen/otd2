import React, { useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Item } from '../../classes/Item';
import { updateItem } from '../../wdb/wdbService';

interface ItemScreenProps {
  item: Item | null;
  canEdit: boolean;
  onBack?: () => void;
}

const ItemScreen: React.FC<ItemScreenProps> = (props) => {
  const { item, canEdit, onBack } = props;
  const navigation = useNavigation();

  const editor = useEditorBridge({
    autofocus: !canEdit,
    avoidIosKeyboard: true,
    initialContent: item?.content || '<p>Start typing your notes here...</p>',
  });

  useEffect(() => {
    const newContent = item?.content || '<p>Start typing your notes here...</p>';
    const updateContentIfNeeded = async () => {
      if (editor) {
        const currentEditorHTML = await editor.getHTML();
        if (currentEditorHTML !== newContent) {
          editor.setContent(newContent);
        }
      }
    };
    updateContentIfNeeded();
  }, [item?.id, item?.content, editor]);

  const handleSave = async () => {
    if (!item || !canEdit) {
      Alert.alert('Error', 'Cannot save item. No item loaded or not in edit mode.');
      return;
    }
    try {
      const htmlContent = await editor.getHTML();
      await updateItem(item.id, { content: htmlContent });
      Alert.alert('Success', 'Item saved!');
      if (onBack) {
        onBack();
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item.');
    }
  };

  const handleAdd = () => {
    Alert.alert('Add', 'Add functionality to be implemented.');
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share functionality to be implemented.');
  };

  const effectiveOnBack = onBack || (navigation.canGoBack() ? navigation.goBack : undefined);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeftContainer}>
          {effectiveOnBack && (
            <TouchableOpacity onPress={effectiveOnBack} style={styles.headerButton}>
              <Icon name="arrow-back" size={24} color={styles.headerButtonText.color} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={handleAdd} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Share</Text>
          </TouchableOpacity>
          {item && canEdit && (
            <TouchableOpacity onPress={handleSave} style={[styles.headerButton, styles.saveButton]}>
              <Text style={styles.headerButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.editorContainer}>
        <RichText editor={editor} style={styles.richTextEditor} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  saveButton: {
    marginLeft: 10,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  richTextEditor: {
    flex: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
});

export default ItemScreen;
