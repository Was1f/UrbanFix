import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

// Loading component to show while auth is initializing
const AuthLoading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#1e90ff" />
    <Text style={styles.loadingText}>Initializing...</Text>
  </View>
);

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Profile" />
        <Stack.Screen name="PhoneLogin" />
        <Stack.Screen name="CreateAccount" />
        <Stack.Screen name="community" />
        <Stack.Screen name="user-homepage" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="admin-dashboard" />
        <Stack.Screen name="admin-announcements" />
        <Stack.Screen name="admin-create-announcement" />
        <Stack.Screen name="admin-edit-announcement" />
        <Stack.Screen name="announcements-list" />
        <Stack.Screen name="EditProfileScreen" />
        <Stack.Screen name="Home" />
        <Stack.Screen name="SplashScreen" />
        <Stack.Screen name="admin-users" />
        <Stack.Screen name="admin-user-detail" />
        <Stack.Screen name="emergency-contacts" />
        <Stack.Screen name="emergency-report-form" />
        <Stack.Screen name="discussions" />
        <Stack.Screen name="discussionspage" />
        <Stack.Screen name="create-post" />
        <Stack.Screen name="post-detail" />
        <Stack.Screen name="CreatePostReport" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="moderation-panel" />
        <Stack.Screen name="nidVerifyScreen" />
        <Stack.Screen name="ViewPublicProfile" />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
