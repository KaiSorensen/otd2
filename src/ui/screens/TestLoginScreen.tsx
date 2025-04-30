import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/UserContext';
import { useColors } from '../../contexts/ColorContext';
import { logout, deleteUserAccount } from '../../supabase/authService';
import { retrieveUser } from '../../supabase/databaseService';

const HomeScreen = () => {
  const { currentUser } = useAuth();
  const { colors } = useColors();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkDatabaseConnection = async () => {
      if (!currentUser) return;
      
      try {
        setDbStatus('checking');
        // // console.log('TestScreen: Testing database connection for user:', currentUser.id);
        
        // Test reading the user document using our retrieveUser function
        const userData = await retrieveUser(currentUser.id);
        
        if (userData) {
          // // console.log('TestScreen: Successfully read user data:', userData);
          setDbStatus('connected');
        } else {
          // // console.log('TestScreen: User data not found');
          setDbStatus('error');
        }
      } catch (error) {
        console.error('TestScreen: Database test failed:', error);
        setDbStatus('error');
      }
    };
    
    checkDatabaseConnection();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      // Auth state listener will handle navigation
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserAccount();
              // Auth state listener will handle navigation
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert("Error", "Failed to delete account. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.welcome, { color: colors.textPrimary }]}>
        Welcome, {currentUser?.username || 'User'}!
      </Text>
      <Text style={[styles.email, { color: colors.textSecondary }]}>
        {currentUser?.email}
      </Text>
      
      <View style={[styles.statusContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.statusLabel, { color: colors.textPrimary }]}>Database Status:</Text>
        {dbStatus === 'checking' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>Checking connection...</Text>
          </View>
        ) : dbStatus === 'connected' ? (
          <Text style={[styles.statusText, { color: colors.success }]}>Connected</Text>
        ) : (
          <Text style={[styles.statusText, { color: colors.error }]}>Error connecting</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.warning }]} 
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.deleteButton, { backgroundColor: colors.error }]} 
        onPress={handleDeleteAccount}
      >
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    marginBottom: 20,
  },
  statusContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen; 