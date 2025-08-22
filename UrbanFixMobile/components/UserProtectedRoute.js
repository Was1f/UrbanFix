import React, { useState, useEffect, useContext } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import SessionManager from '../utils/sessionManager';

const UserProtectedRoute = ({ children, fallbackComponent }) => {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const isLoggedIn = await SessionManager.isUserLoggedIn();
      setIsAuthenticated(isLoggedIn);
      
      if (!isLoggedIn) {
        console.log('❌ User not authenticated or session expired, redirecting to login');
        // Clear the user state and redirect to login
        await logout();
        // Wait for multiple frames to ensure the layout is fully ready
        await new Promise(resolve => {
          let frameCount = 0;
          const checkFrame = () => {
            frameCount++;
            if (frameCount >= 3) {
              resolve();
            } else {
              requestAnimationFrame(checkFrame);
            }
          };
          requestAnimationFrame(checkFrame);
        });
        router.replace('/PhoneLogin');
      }
    } catch (error) {
      console.error('❌ Error checking user authentication:', error);
      // Clear session on error and redirect to login
      await logout();
      // Wait for multiple frames to ensure the layout is fully ready
      await new Promise(resolve => {
        let frameCount = 0;
        const checkFrame = () => {
          frameCount++;
          if (frameCount >= 3) {
            resolve();
          } else {
            requestAnimationFrame(checkFrame);
          }
        };
        requestAnimationFrame(checkFrame);
      });
      router.replace('/PhoneLogin');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Verifying session...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return fallbackComponent || (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>Please login to continue</Text>
      </View>
    );
  }

  return children;
};

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default UserProtectedRoute;
