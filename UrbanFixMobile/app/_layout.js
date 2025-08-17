import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

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
        <Stack.Screen name="EditProfileScreen" />
        <Stack.Screen name="Home" />
        <Stack.Screen name="SplashScreen" />
      </Stack>
    </AuthProvider>
  );
}
