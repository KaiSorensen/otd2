import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import TestLoginScreen from './TestLoginScreen';

const UserSettingsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <TestLoginScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default UserSettingsScreen;
