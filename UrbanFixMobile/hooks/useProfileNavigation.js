import { useRouter } from 'expo-router';

export const useProfileNavigation = () => {
  const router = useRouter();

  const navigateToProfile = (authorPhone, authorName = 'Anonymous') => {
    if (!authorPhone || authorPhone === 'Anonymous') {
      return; // Don't navigate for anonymous users
    }
    
    try {
      router.push(`/ViewPublicProfile?identifier=${authorPhone}`);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation method
      router.push({
        pathname: '/ViewPublicProfile',
        params: { identifier: authorPhone }
      });
    }
  };

  return { navigateToProfile };
};