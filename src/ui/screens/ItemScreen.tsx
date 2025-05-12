import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { Item } from '../../classes/Item';
import { useColors } from '../../contexts/ColorContext';
import { storeNewItem } from '../../wdb/wdbService';
import { retrieveItem } from '../../wdb/wdbService';

interface ItemScreenProps {
  item: Item;
  onBack?: () => void;
  canEdit?: boolean;
  onItemUpdate?: (item: Item) => void;
}

const ItemScreen: React.FC<ItemScreenProps> = ({ item, onBack, canEdit = false, onItemUpdate }) => {
  const { colors, isDarkMode } = useColors();
  const [content, setContent] = useState<string>(item.content || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const webviewRef = useRef<WebView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // Setup back handler
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [hasChanges]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Handle messages from WebView
  const handleMessage = (html: string) => {
    setContent(html);
    setHasChanges(true);
  };

  // Send formatting commands to the editor
  const applyFormat = (command: string, value?: string) => {
    const js = value
      ? `document.execCommand('${command}', false, ${JSON.stringify(value)}); true;`
      : `document.execCommand('${command}', false, null); true;`;
    webviewRef.current?.injectJavaScript(js);
    setHasChanges(true);
  };

  // Save changes to the item
  const saveChanges = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      item.content = content;
      try {
        await storeNewItem(item);
      } catch (e: any) {
        // If already exists, update instead
        await item.save();
      }
      setHasChanges(false);
      if (onItemUpdate) onItemUpdate(item);
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = async () => {
    if (hasChanges) {
      await saveChanges();
    }
    onBack && onBack();
  };

  // Initial HTML for the WebView editor
  const initialHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
        <style>
          body { margin: 0; padding: 16px; font-size: 16px; color: ${isDarkMode ? '#fff' : '#000'}; background: transparent; }
          #editor { min-height: 100vh; outline: none; }
        </style>
      </head>
      <body>
        <div id="editor" contenteditable="${canEdit}" spellcheck="true"></div>
        <script>
          const editor = document.getElementById('editor');
          editor.innerHTML = ${JSON.stringify(item.content || '')};
          editor.addEventListener('input', function() {
            window.ReactNativeWebView.postMessage(editor.innerHTML);
          });
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>  
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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
              <TouchableOpacity onPress={saveChanges} style={[styles.saveButton, { backgroundColor: colors.primary }]}>  
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Editor and Toolbar */}
      <KeyboardAvoidingView
        style={styles.editorContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}
          onMessage={(e) => handleMessage(e.nativeEvent.data)}
          style={styles.webview}
          hideKeyboardAccessoryView={true}
        />
      </KeyboardAvoidingView>
      {canEdit && isKeyboardVisible && (
        <View style={[styles.toolbar, { borderTopColor: colors.divider, backgroundColor: colors.background, bottom: keyboardHeight }]}>
          <TouchableOpacity onPress={() => applyFormat('bold')} style={styles.toolbarButton}><Text style={styles.toolbarButtonText}>B</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => applyFormat('italic')} style={styles.toolbarButton}><Text style={styles.toolbarButtonText}>I</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => applyFormat('underline')} style={styles.toolbarButton}><Text style={styles.toolbarButtonText}>U</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => applyFormat('insertUnorderedList')} style={styles.toolbarButton}><Text style={styles.toolbarButtonText}>•</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => applyFormat('insertHTML', '<input type=\"checkbox\" /> ')} style={styles.toolbarButton}><Text style={styles.toolbarButtonText}>☑</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => applyFormat('formatBlock', 'H1')} style={styles.toolbarButton}><Text style={styles.toolbarButtonText}>H1</Text></TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { padding: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  saveButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  saveButtonText: { color: '#fff', fontWeight: '500' },
  editorContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderTopWidth: 1, position: 'absolute', left: 0, right: 0 },
  toolbarButton: { width: 36, height: 36, backgroundColor: '#eee', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  toolbarButtonText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
});

export default ItemScreen;
