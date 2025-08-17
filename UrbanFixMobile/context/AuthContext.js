// context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.log('[AuthContext] Failed to load user from storage:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Login: save user to context and AsyncStorage
  const login = async (userObj) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
    } catch (err) {
      console.log('[AuthContext] Failed to save user to storage:', err);
    }
  };

  // Logout: clear user from context and AsyncStorage
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (err) {
      console.log('[AuthContext] Failed to clear user from storage:', err);
    }
  };

  // Update user: for edits or profile changes
  const updateUser = async (updatedUser) => {
  try {
    if (!updatedUser._id) {
      console.warn('updateUser: updatedUser is missing _id!', updatedUser);
      return;
    }
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  } catch (err) {
    console.log('Failed to update user in storage:', err);
  }
};


  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
