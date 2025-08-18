import { useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to check user authentication and redirect to login if not authenticated
 * Use this hook in any component that requires user authentication
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.redirectOnLoad - Whether to redirect immediately if not authenticated (default: true)
 * @param {boolean} options.checkSession - Whether to validate session on component focus (default: true)
 * @returns {Object} - { user, loading, isAuthenticated }
 */
export const useAuthCheck = (options = {}) => {
  const { 
    redirectOnLoad = true, 
    checkSession = true 
  } = options;
  
  const { user, loading, checkSessionValidity, logout } = useContext(AuthContext);
  const router = useRouter();

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!loading) {
        if (!user && redirectOnLoad) {
          console.log('🔒 [useAuthCheck] User not authenticated, redirecting to login');
          router.replace('/PhoneLogin');
          return;
        }

        if (user && checkSession) {
          // Validate session if user exists
          const isValid = await checkSessionValidity();
          if (!isValid) {
            console.log('🔒 [useAuthCheck] Session expired, redirecting to login');
            // logout method will handle routing
            return;
          }
        }
      }
    };

    checkAuth();
  }, [loading, user, redirectOnLoad, checkSession, router, checkSessionValidity]);

  return {
    user,
    loading,
    isAuthenticated: !!user && !loading
  };
};

export default useAuthCheck;
