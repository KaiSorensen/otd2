import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { List } from '../../classes/List';
import ListImage from './ListImage';
import { useColors } from '../../contexts/ColorContext';

interface ListPreviewProps {
  list: List;
  onPress: () => void;
}

const ListPreview: React.FC<ListPreviewProps> = ({ list, onPress }) => {
  const { colors } = useColors();
  
  // Helper function to strip HTML tags for plain text display
  const stripHtml = (html: string): string => {
    return html ? html.replace(/<[^>]*>?/gm, '') : '';
  };

  return (
    <TouchableOpacity 
      testID="list-preview"
      style={[styles.container, { backgroundColor: colors.card }]} 
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <ListImage 
          imageUrl={list.coverImageURL} 
          size="small" 
          style={styles.image} 
        />
      </View>
      <View style={styles.contentContainer}>
        <Text 
          style={[styles.title, { color: colors.textPrimary }]} 
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {list.title}
        </Text>
        {list.description && (
          <Text 
            style={[styles.description, { color: colors.textSecondary }]} 
            numberOfLines={2} 
            ellipsizeMode="tail"
          >
            {stripHtml(list.description)}
          </Text>
        )}
        <View style={styles.metaContainer}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {new Date(list.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
});

export default ListPreview; 