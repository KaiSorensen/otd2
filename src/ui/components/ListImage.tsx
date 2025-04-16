import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useColors } from '../../contexts/ColorContext';

interface ListImageProps {
  imageUrl: string | null;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const ListImage: React.FC<ListImageProps> = ({ imageUrl, size = 'medium', style }) => {
  const { colors } = useColors();
  
  // Determine dimensions based on size prop
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 50, height: 50 };
      case 'large':
        return { width: 200, height: 200 };
      case 'medium':
      default:
        return { width: 120, height: 120 };
    }
  };

  const dimensions = getDimensions();

  // Generate a light pastel color based on the string hash of the imageUrl or a random one if null
  const generateColor = () => {
    if (imageUrl) {
      // Simple hash function for strings
      let hash = 0;
      for (let i = 0; i < imageUrl.length; i++) {
        hash = imageUrl.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      // Convert to pastel color
      const h = Math.abs(hash) % 360;
      return `hsl(${h}, 70%, 80%)`;
    } else {
      // Use accent color with opacity if no imageUrl
      return colors.accent + '40'; // 40 is hex for 25% opacity
    }
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: dimensions.width, 
          height: dimensions.height,
          backgroundColor: generateColor(),
        },
        style
      ]}
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ListImage;
