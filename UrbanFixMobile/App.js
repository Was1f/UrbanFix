import React, { useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PhoneLogin from './app/PhoneLogin';
import Home from './app/Home';
import Profile from './app/Profile';
import EditProfileScreen from './app/EditProfileScreen';
import CreatePostReport from './app/CreatePostReport';
import CreateAccount from './app/CreateAccount';
import UserHomepage from './app/user-homepage';
import CommunityHome from './app/community';
import EmergencyContacts from './app/emergency-contacts';
import AnnouncementsList from './app/announcements-list';
import SplashScreen from './app/SplashScreen';

// Chat screens
import ChatList from './app/Chat/ChatList';
import ChatRoom from './app/Chat/ChatRoom';

// NID verification screens
import NidVerifyScreen from './app/nidVerifyScreen';
import UploadScanNID from './app/UploadScanNID';
import EditableForm from './app/EditableForm';

import { AuthProvider, AuthContext } from './context/AuthContext';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading, checkSessionValidity, logout } = useContext(AuthContext);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      if (!loading) {
        if (user) {
          const isValid = await checkSessionValidity();
          if (!isValid) {
            Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
            logout();
          }
        }
        setSessionChecked(true);
      }
    };
    validateSession();
  }, [loading, user, checkSessionValidity, logout]);

  if (loading || !sessionChecked) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {/* Logged-in flow */}
          <Stack.Screen name="UserHomepage" component={UserHomepage} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="CreatePostReport" component={CreatePostReport} />
          <Stack.Screen name="CommunityHome" component={CommunityHome} />
          <Stack.Screen name="EmergencyContacts" component={EmergencyContacts} />
          <Stack.Screen name="AnnouncementsList" component={AnnouncementsList} />

          {/* Chat screens with navigation params */}
          <Stack.Screen name="ChatList" component={ChatList} initialParams={{ userId: user._id }} />
          <Stack.Screen name="ChatRoom" component={ChatRoom} />

          {/* NID verification flow */}
          <Stack.Screen name="NidVerifyScreen" component={NidVerifyScreen} />
          <Stack.Screen name="UploadScanNID" component={UploadScanNID} />
          <Stack.Screen name="EditableForm" component={EditableForm} />
        </>
      ) : (
        <>
          {/* Not logged-in flow */}
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
