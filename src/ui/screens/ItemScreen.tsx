import React, { useEffect, useRef, useState } from 'react';
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
import { updateItem, storeNewItem } from '../../wdb/wdbService';
import { v4 as uuidv4 } from 'uuid';

interface ItemScreenProps {
  item?: Item | null; // null or undefined means create mode
  canEdit: boolean;
  onBack?: () => void;
  onSave?: (item: Item) => void;
  listId?: string; // required for create mode
}

const ItemScreen: React.FC<ItemScreenProps> = (props) => {
  const { item, canEdit, onBack, onSave, listId } = props;
  const navigation = useNavigation();
  const isCreate = !item;
  const initialContent = item?.content || '';
  const [dirty, setDirty] = useState(false);
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: initialContent || '<p>Start typing your notes here...</p>',
  });

  // Track dirty state
  useEffect(() => {
    setCurrentContent(initialContent);
    setDirty(false);
  }, [item?.id, initialContent]);

  // Listen for content changes (polling workaround for tentap editor)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let lastContent = initialContent;
    if (editor) {
      interval = setInterval(async () => {
        const html = await editor.getHTML();
        if (html !== lastContent) {
          setCurrentContent(html);
          setDirty(html !== initialContent && html !== '<p>Start typing your notes here...</p>');
          lastContent = html;
        }
      }, 300);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [editor, initialContent]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const htmlContent = await editor.getHTML();
      let savedItem: Item;
      if (isCreate) {
        if (!listId) {
          Alert.alert('Error', 'No list ID provided for new item.');
          setSaving(false);
          return;
        }
        if (!htmlContent || htmlContent === '<p>Start typing your notes here...</p>' || htmlContent === '<p></p>') {
          Alert.alert('Cannot save empty item.');
          setSaving(false);
          return;
        }
        savedItem = new Item(
          uuidv4(),
          listId,
          htmlContent,
          [],
          0,
          new Date(),
          new Date()
        );
        await storeNewItem(savedItem);
      } else if (item) {
        savedItem = new Item(
          item.id,
          item.listID,
          htmlContent,
          item.imageURLs,
          item.orderIndex,
          item.createdAt,
          new Date()
        );
        await updateItem(item.id, { content: htmlContent });
      } else {
        setSaving(false);
        return;
      }
      setDirty(false);
      if (onSave) onSave(savedItem);
    } catch (error) {
      Alert.alert('Error', 'Failed to save item.');
    } finally {
      setSaving(false);
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
          {canEdit && dirty && !saving && (
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
