import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import SessionManager from '../utils/sessionManager';

const ProtectedRoute = ({ children, fallbackComponent }) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const isLoggedIn = await SessionManager.isAdminLoggedIn();
      setIsAuthenticated(isLoggedIn);
      
      if (!isLoggedIn) {
        console.log('❌ User not authenticated, redirecting to login');
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
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
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
      router.replace('/admin-login');
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
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
  },
});

export default ProtectedRoute;
