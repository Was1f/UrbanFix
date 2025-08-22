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
          // Use a more robust navigation approach
          try {
            router.replace('/PhoneLogin');
          } catch (error) {
            console.log('🔍 [Index] Navigation failed, trying alternative approach');
            // If that fails, try a different approach
            setTimeout(() => {
              try {
                router.replace('/PhoneLogin');
              } catch (navError) {
                console.error('🔍 [Index] All navigation attempts failed:', navError);
              }
            }, 100);
          }
          return;
        }

        // Check if session is valid
        const isValid = await checkSessionValidity();
        if (!isValid) {
          console.log('🔍 [Index] Session invalid, checkSessionValidity will handle logout');
          return;
        }

        console.log('🔍 [Index] User authenticated, redirecting to dashboard');
        try {
          router.replace('/user-homepage');
        } catch (error) {
          console.log('🔍 [Index] Navigation to dashboard failed, trying alternative approach');
          setTimeout(() => {
            try {
              router.replace('/user-homepage');
            } catch (navError) {
              console.error('🔍 [Index] All navigation attempts to dashboard failed:', navError);
            }
          }, 100);
        }
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
