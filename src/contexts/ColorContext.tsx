import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// Define the color palette for both themes
interface ColorPalette {
    // Backgrounds
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;

    // UI Elements
    card: string;
    cardBorder: string;
    divider: string;

    // Interactive Elements
    primary: string;
    secondary: string;
    accent: string;

    // Status Colors
    success: string;
    warning: string;
    error: string;

    // Input Elements
    inputBackground: string;
    inputText: string;
    inputPlaceholder: string;
    inputBorder: string;

    // Tab Bar
    tabBarBackground: string;
    tabBarBorder: string;
    tabBarActive: string;
    tabBarInactive: string;

    // Header
    headerBackground: string;
    headerText: string;
    headerBorder: string;

    // Icons
    iconPrimary: string;
    iconSecondary: string;

    // Misc
    shadow: string;
    overlay: string;
}

// Define the light theme colors
const lightColors: ColorPalette = {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    backgroundTertiary: '#FAFAFA',

    // Text
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#888888',

    // UI Elements
    card: '#FFFFFF',
    cardBorder: '#EEEEEE',
    divider: '#EEEEEE',

    // Interactive Elements
    primary: '#4A6FFF',
    secondary: '#3498DB',
    accent: '#FFB74D',

    // Status Colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',

    // Input Elements
    inputBackground: '#FFFFFF',
    inputText: '#333333',
    inputPlaceholder: '#999999',
    inputBorder: '#DDDDDD',

    // Tab Bar
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#EEEEEE',
    tabBarActive: '#4A6FFF',
    tabBarInactive: '#888888',

    // Header
    headerBackground: '#FFFFFF',
    headerText: '#333333',
    headerBorder: '#EEEEEE',

    // Icons
    iconPrimary: '#333333',
    iconSecondary: '#888888',

    // Misc
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
};

// Define the dark theme colors
const darkColors: ColorPalette = {
    // Backgrounds
    background: '#121212',
    backgroundSecondary: '#1E1E1E',
    backgroundTertiary: '#222222',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    textTertiary: '#AAAAAA',

    // UI Elements
    card: '#333333',
    cardBorder: '#444444',
    divider: '#333333',

    // Interactive Elements
    primary: '#4A6FFF',
    secondary: '#3498DB',
    accent: '#FFB74D',

    // Status Colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',

    // Input Elements
    inputBackground: '#333333',
    inputText: '#FFFFFF',
    inputPlaceholder: '#AAAAAA',
    inputBorder: '#444444',

    // Tab Bar
    tabBarBackground: '#1E1E1E',
    tabBarBorder: '#333333',
    tabBarActive: '#4A6FFF',
    tabBarInactive: '#AAAAAA',

    // Header
    headerBackground: '#121212',
    headerText: '#FFFFFF',
    headerBorder: '#333333',

    // Icons
    iconPrimary: '#FFFFFF',
    iconSecondary: '#AAAAAA',

    // Misc
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
};

// Create the context
interface ColorsContextType {
    colors: ColorPalette;
    isDarkMode: boolean;
}

const ColorsContext = createContext<ColorsContextType>({
    colors: lightColors,
    isDarkMode: false,
});

// Create a hook to use the colors context
export const useColors = () => useContext(ColorsContext);

// Create the provider component
interface ColorsProviderProps {
    children: ReactNode;
}

export const ColorsProvider: React.FC<ColorsProviderProps> = ({ children }) => {
    // Get the device color scheme
    const colorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
    const [colors, setColors] = useState<ColorPalette>(
        colorScheme === 'dark' ? darkColors : lightColors
    );

    // Update colors when the device theme changes
    useEffect(() => {
        setIsDarkMode(colorScheme === 'dark');
        setColors(colorScheme === 'dark' ? darkColors : lightColors);
    }, [colorScheme]);

    const value = {
        colors,
        isDarkMode,
    };

    return (
        <ColorsContext.Provider value={value}>
            {children}
        </ColorsContext.Provider>
    );
};

export default ColorsProvider;