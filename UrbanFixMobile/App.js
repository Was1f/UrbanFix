// App.js
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PhoneLogin from './app/PhoneLogin';
import Home from './app/Home';
import Profile from './app/Profile';
import EditProfileScreen from './app/EditProfileScreen';
import CreatePostReport from './app/CreatePostReport';
import CreateAccount from './app/CreateAccount';
import { AuthProvider, AuthContext } from './context/AuthContext';
import SplashScreen from './app/SplashScreen';


const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
return <SplashScreen />;  }

  return (
    
    <Stack.Navigator

    screenOptions={{ headerShown: false }}>
      {user ? (
        // Logged in → Home flow
        <>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="CreatePostReport" component={CreatePostReport} />
        </>
      ) : (
        // Not logged in → Login flow
        <>
        
          <Stack.Screen name="PhoneLogin" component={PhoneLogin} />
          <Stack.Screen name="AccountCreation" component={CreateAccount} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
