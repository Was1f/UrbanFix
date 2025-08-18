import React, { useContext, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import SplashScreen from './SplashScreen';

export default function IndexScreen() {
  const { user, loading, checkSessionValidity } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    const handleRouting = async () => {
      if (!loading) {
        console.log('🔍 [Index] Checking authentication state...');
        
        if (!user) {
          console.log('🔍 [Index] No user, redirecting to login');
          // Prevent back navigation by using replace
          router.replace('/PhoneLogin');
          return;
        }

        // Check if session is valid
        const isValid = await checkSessionValidity();
        if (!isValid) {
          console.log('🔍 [Index] Session invalid, checkSessionValidity will handle logout');
          return;
        }

        console.log('🔍 [Index] User authenticated, redirecting to dashboard');
        router.replace('/user-homepage');
      }
    };

    handleRouting();
  }, [loading, user, router, checkSessionValidity]);

  // Additional effect to handle user state changes (like logout)
  useEffect(() => {
    if (!loading && !user) {
      console.log('🔍 [Index] User state changed to logged out, ensuring redirect to login');
      router.replace('/PhoneLogin');
    }
  }, [user, loading, router]);

  // Show splash screen while determining auth state
  return <SplashScreen />;
}
