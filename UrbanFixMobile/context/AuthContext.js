// context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SessionManager from '../utils/sessionManager';
import { useRouter } from 'expo-router';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from SessionManager on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if user session is valid
        const userData = await SessionManager.getUserData();
        if (userData) {
          setUser(userData);
          console.log('✅ [AuthContext] User session loaded successfully');
        } else {
          // Clear any stale data if session is expired
          await SessionManager.clearUserSession();
          console.log('⚠️ [AuthContext] No valid session found');
        }
      } catch (err) {
        console.log('❌ [AuthContext] Failed to load user from session:', err);
        // Clear session on error
        await SessionManager.clearUserSession();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Login: save user to context and SessionManager
  const login = async (userObj) => {
    try {
      console.log('🔐 [AuthContext] Starting login process for user:', userObj?.fname || userObj?.name || 'Unknown');
      const sessionStored = await SessionManager.storeUserSession(userObj);
      if (sessionStored) {
        console.log('✅ [AuthContext] Session stored, updating user state...');
        setUser(userObj);
        // Also keep old AsyncStorage for backward compatibility
        await AsyncStorage.setItem('user', JSON.stringify(userObj));
        console.log('✅ [AuthContext] User login completed successfully');
        return true;
      } else {
        throw new Error('Failed to store session');
      }
    } catch (err) {
      console.log('❌ [AuthContext] Failed to save user session:', err);
      throw err;
    }
  };

  // Logout: clear user from context and SessionManager, then route to login
  const logout = async () => {
    try {
      await SessionManager.clearUserSession();
      await AsyncStorage.removeItem('user'); // Also clear legacy storage
      setUser(null);
      console.log('✅ [AuthContext] User logged out successfully');
      
      // Route to login page after successful logout and clear navigation stack
      console.log('🔄 [AuthContext] Routing to login page and clearing navigation stack...');
      
      // For expo-router, we need to completely reset the navigation stack
      // This prevents users from going back to authenticated pages
      try {
        // First try to navigate to root which should trigger our index.js logic
        router.navigate('/');
        
        // If that doesn't work, try replace with PhoneLogin
        setTimeout(() => {
          router.replace('/PhoneLogin');
        }, 100);
      } catch (navError) {
        console.log('🔄 [AuthContext] Fallback: using direct replace...');
        router.replace('/PhoneLogin');
      }
      
    } catch (err) {
      console.log('❌ [AuthContext] Failed to clear user session:', err);
      // Even if session clearing fails, still try to route to login
      try {
        router.navigate('/');
        setTimeout(() => {
          router.replace('/PhoneLogin');
        }, 100);
      } catch (routingError) {
        console.log('❌ [AuthContext] Failed to route to login page:', routingError);
        // Final fallback
        try {
          router.replace('/PhoneLogin');
        } catch (finalError) {
          console.log('❌ [AuthContext] All routing methods failed:', finalError);
        }
      }
    }
  };

  // Update user: for edits or profile changes
  const updateUser = async (updatedUser) => {
    try {
      if (!updatedUser._id) {
        console.warn('updateUser: updatedUser is missing _id!', updatedUser);
        return;
      }
      const sessionUpdated = await SessionManager.updateUserSession(updatedUser);
      if (sessionUpdated) {
        setUser(updatedUser);
        // Also update legacy storage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ [AuthContext] User data updated successfully');
      }
    } catch (err) {
      console.log('❌ [AuthContext] Failed to update user session:', err);
    }
  };

  // Check if user session is valid
  const checkSessionValidity = async () => {
    try {
      const isValid = await SessionManager.isUserLoggedIn();
      if (!isValid && user) {
        // Session expired, use logout method to clear state and route to login
        console.log('⚠️ [AuthContext] Session expired, logging out user...');
        await logout();
        return false;
      }
      return isValid;
    } catch (err) {
      console.log('❌ [AuthContext] Failed to check session validity:', err);
      return false;
    }
  };


  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser, 
      loading, 
      checkSessionValidity 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
