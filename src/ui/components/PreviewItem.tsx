import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Item } from '../../classes/Item';
import { useColors } from '../../contexts/ColorContext';

interface PreviewItemProps {
  item?: Item;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const PreviewItem: React.FC<PreviewItemProps> = ({ item, onSwipeLeft, onSwipeRight }) => {
  const { colors, isDarkMode } = useColors();
  // Track touch for swipe detection
  const [touchStart, setTouchStart] = React.useState(0);
  const SWIPE_THRESHOLD = 50; // Minimum distance to trigger swipe

  const handleTouchStart = (e: any) => {
    setTouchStart(e.nativeEvent.pageX);
  };

  const handleTouchEnd = (e: any) => {
    const touchEnd = e.nativeEvent.pageX;
    const distance = touchStart - touchEnd;

    // Detect swipe direction
    if (distance > SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    } else if (distance < -SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <View 
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          shadowColor: colors.shadow,
        }
      ]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {item ? (
        <>
          <Text style={[
            styles.title,
            { color: colors.textPrimary }
          ]}>
            {item.title || 'Untitled'}
          </Text>
          <Text style={[
            styles.content,
            { color: colors.textSecondary }
          ]}>
            {item.content}
          </Text>
          {item.imageURLs && item.imageURLs.length > 0 && (
            <Text style={[
              styles.imagesPlaceholder,
              { color: colors.textTertiary }
            ]}>
              {item.imageURLs.length} image(s) available
            </Text>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[
            styles.emptyTitle,
            { color: colors.textTertiary }
          ]}>
            No Item Selected
          </Text>
          <Text style={[
            styles.emptySubtitle,
            { color: colors.textTertiary }
          ]}>
            Select a list from above or add items to your today lists
          </Text>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    minHeight: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: width - 32, // Full width minus margins
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  imagesPlaceholder: {
    marginTop: 16,
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PreviewItem; 