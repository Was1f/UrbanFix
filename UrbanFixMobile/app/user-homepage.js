import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../constants/api';
import SessionManager from '../utils/sessionManager';
import config from '../config';
import UserProtectedRoute from '../components/UserProtectedRoute';

const { width } = Dimensions.get('window');

export default function UserHomepage() {
  const router = useRouter();
  const { user, checkSessionValidity, logout } = useContext(AuthContext);
  const [communityItems, setCommunityItems] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const announcementFlatListRef = useRef(null);
  const [lastAnnouncementCheck, setLastAnnouncementCheck] = useState(null);
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  // Mark component as mounted
  useEffect(() => {
    setIsComponentMounted(true);
  }, []);

  // Authentication check that only runs after component is mounted
  useEffect(() => {
    if (!isComponentMounted) return;
    
    const checkAuthOnMount = async () => {
      console.log('🔒 [UserHomepage] Checking authentication on mount...');
      
      // Check if user exists
      if (!user) {
        console.log('🔒 [UserHomepage] No user found, redirecting to login');
        // Instead of navigating immediately, set a flag and let the component handle it
        // This avoids the navigation timing issue
        return;
      }

      // Check if session is valid
      const isValid = await checkSessionValidity();
      if (!isValid) {
        console.log('🔒 [UserHomepage] Session invalid, redirecting to login');
        // checkSessionValidity will handle logout and routing
        return;
      }

      console.log('✅ [UserHomepage] Authentication check passed');
    };

    checkAuthOnMount();
  }, [isComponentMounted, user, checkSessionValidity, router]); // Dependencies include isComponentMounted

  // Watch for user state changes (like logout)
  useEffect(() => {
    if (!isComponentMounted) return;
    
    if (!user) {
      console.log('🔒 [UserHomepage] User state changed to null, redirecting to login');
      // Instead of navigating immediately, set a flag and let the component handle it
      // This avoids the navigation timing issue
    }
  }, [isComponentMounted, user, router]);

  // Handle navigation after component is properly mounted
  useEffect(() => {
    if (!isComponentMounted || user) return;
    
    // Wait a bit longer to ensure navigation is ready
    const timer = setTimeout(() => {
      try {
        console.log('🔒 [UserHomepage] Now attempting navigation to login...');
        router.replace('/PhoneLogin');
      } catch (error) {
        console.error('🔒 [UserHomepage] Navigation failed:', error);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isComponentMounted, user, router]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        // Load discussions
        const discussionsRes = await fetch(apiUrl('/api/discussions'));
        const discussionsData = await discussionsRes.json();
        if (isMounted) {
          setCommunityItems(Array.isArray(discussionsData) ? discussionsData.slice(0, 3) : []);
        }
      } catch (e) {
        if (isMounted) setCommunityItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const loadAnnouncementsInitial = async () => {
      try {
        const announcementsRes = await fetch(apiUrl('/api/announcements'));
        const announcementsData = await announcementsRes.json();
        if (isMounted) {
          const newAnnouncements = Array.isArray(announcementsData) ? announcementsData : [];
          setAnnouncements(newAnnouncements);
          setLastAnnouncementCheck(new Date().toISOString());
        }
      } catch (e) {
        console.warn('Failed to load announcements:', e);
        if (isMounted) setAnnouncements([]);
      } finally {
        if (isMounted) setAnnouncementsLoading(false);
      }
    };

    loadData();
    loadAnnouncementsInitial();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Use focus effect to check session validity and new announcements when returning to this screen
  useFocusEffect(
    React.useCallback(() => {
      const validateSessionAndLoadData = async () => {
        // Check if session is still valid
        const isSessionValid = await checkSessionValidity();
        if (!isSessionValid) {
          console.log('🔄 Session expired in user homepage, logout will handle routing');
          // logout method will handle both session clearing and routing to login
          return;
        }

        // Refresh session timestamp to keep it active
        await SessionManager.refreshUserSession();

        // Load announcements if this isn't the first load
        if (lastAnnouncementCheck) {
          loadAnnouncements(true); // Show notification for new announcements
        }
      };

      validateSessionAndLoadData();
    }, [lastAnnouncementCheck, checkSessionValidity, logout, router])
  );

  const loadAnnouncements = async (showNotification = false) => {
    try {
      const announcementsRes = await fetch(apiUrl('/api/announcements'));
      const announcementsData = await announcementsRes.json();
      const newAnnouncements = Array.isArray(announcementsData) ? announcementsData : [];
      
      // Check for new announcements
      if (showNotification && lastAnnouncementCheck && newAnnouncements.length > 0) {
        const newAnnouncementsSinceLastCheck = newAnnouncements.filter(
          announcement => new Date(announcement.createdAt) > new Date(lastAnnouncementCheck)
        );
        
        if (newAnnouncementsSinceLastCheck.length > 0) {
          const latestAnnouncement = newAnnouncementsSinceLastCheck[0];
          Alert.alert(
            '🔔 New Announcement',
            `${latestAnnouncement.title}`,
            [
              { text: 'View', onPress: () => router.push('/announcements-list') },
              { text: 'Dismiss', style: 'cancel' }
            ]
          );
        }
      }
      
      setAnnouncements(newAnnouncements);
      setLastAnnouncementCheck(new Date().toISOString());
    } catch (e) {
      console.warn('Failed to load announcements:', e);
      setAnnouncements([]);
    }
  };

  const getDefaultImageForType = (type) => {
    // Map announcement types to default images
    const typeImageMap = {
      'Power Outage': require('../assets/announcement/default.png'),
      'Government Declaration': require('../assets/announcement/default.png'),
      'Flood Warning': require('../assets/announcement/default.png'),
      'Emergency Alert': require('../assets/announcement/default.png'),
      'Public Service': require('../assets/announcement/default.png'),
      'Infrastructure': require('../assets/announcement/default.png'),
      'Health Advisory': require('../assets/announcement/default.png'),
      'Transportation': require('../assets/announcement/default.png'),
      'Weather Alert': require('../assets/announcement/default.png'),
      'Community Event': require('../assets/announcement/default.png'),
      'Other': require('../assets/announcement/default.png'),
    };
    
    return typeImageMap[type] || require('../assets/placeholder.png');
  };

  const renderAnnouncementCard = ({ item }) => {
    const imageUrl = item.image ? apiUrl(item.image) : null;
    const announcementType = item.finalType || item.customType || item.type;
    
    return (
      <View style={styles.notificationCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          {item.time && <Text style={styles.notifTime}>{item.time}</Text>}
          <Text style={styles.notifType}>{announcementType}</Text>
        </View>
        {item.image ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.notifImage}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={getDefaultImageForType(announcementType)}
            style={styles.notifImage}
            resizeMode="cover"
          />
        )}
      </View>
    );
  };

  // If user is not authenticated, show a message instead of trying to navigate
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting to login...</Text>
          <Text style={styles.loadingSubtext}>Please wait while we redirect you to the login page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <UserProtectedRoute>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={() => router.push('/Profile')}
          accessibilityRole="button"
          accessibilityLabel="Go to Profile"
        >
          <View style={styles.avatar}>
            {user?.profilePic?.uri ? (
              <Image 
                source={{ uri: `${config.API_BASE_URL}${user.profilePic.uri}` }} 
                style={styles.profileImage}
                defaultSource={require('../assets/profile.jpg')}
              />
            ) : (
              <Image 
                source={require('../assets/profile.jpg')} 
                style={styles.profileImage}
              />
            )}
            {user?.verificationBadge && (
              <View style={styles.verificationBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Urban Fix</Text>
        <Pressable style={styles.headerRight} accessibilityRole="button" onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color="#000" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* User Greeting */}
        {user && (
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>
              Hello, {user.fname || 'User'}! 👋
            </Text>
            <Text style={styles.greetingSubtext}>
              Welcome back to UrbanFix
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8e8e8e" />
          <Text style={styles.searchPlaceholder}>Search</Text>
        </View>

        {/* Important Updates / Notifications */}
        <TouchableOpacity onPress={() => router.push('/announcements-list')}>
          <Text style={styles.sectionHeading}>Important Updates/Notifications</Text>
        </TouchableOpacity>
        
        {announcementsLoading ? (
          <View style={styles.notificationCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>Loading announcements...</Text>
            </View>
            <Image
              source={require('../assets/placeholder.png')}
              style={styles.notifImage}
              resizeMode="cover"
            />
          </View>
        ) : announcements.length > 0 ? (
          <FlatList
            ref={announcementFlatListRef}
            data={announcements}
            renderItem={renderAnnouncementCard}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            style={styles.announcementsList}
            snapToInterval={width - 32}
            decelerationRate="fast"
          />
        ) : (
          <View style={styles.notificationCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>No announcements</Text>
              <Text style={styles.notifTime}>Check back later</Text>
            </View>
            <Image
              source={require('../assets/placeholder.png')}
              style={styles.notifImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Report Issue', icon: 'alert-circle-outline', route: '/report-issue' },
            { label: 'Suggest Improvement', icon: 'create-outline', route: null },
            { label: 'Community Forum', icon: 'people-outline', route: '/community' },
            { label: 'Emergency Contacts', icon: 'call-outline', route: '/emergency-contacts' },
            { label: 'Local Services', icon: 'search-outline', route: null },
            { label: 'City News', icon: 'newspaper-outline', route: null },
          ].map((item) => (
            <Pressable 
              key={item.label} 
              style={styles.quickButton} 
              onPress={() => {
                if (item.route) {
                  router.push(item.route);
                }
              }}
            >
              <Ionicons name={item.icon} size={18} color="#000" />
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionHeading}>Recent Activity</Text>
        <View style={styles.activityList}>
          {[
            { title: 'Road Safety', subtitle: 'Reported a Pothole', by: 'Alex, 2 days ago' },
            { title: 'Community Events', subtitle: 'Neighborhood Watch Meeting', by: 'Sarah, 3 days ago' },
            { title: 'Volunteer Opportunities', subtitle: 'Park Cleanup Event', by: 'Mark, 4 days ago' },
          ].map((a, idx) => (
            <View key={idx} style={styles.activityItem}>
              <View style={styles.activityIconHolder}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>{a.title}</Text>
                <Text style={styles.activitySubtitle}>Posted by {a.by}</Text>
                <Text style={styles.activityMuted}>{a.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Community Updates */}
        <Text style={styles.sectionHeading}>Community Updates</Text>
        <View style={{ gap: 12 }}>
          {(loading ? [1, 2, 3] : communityItems).map((item, idx) => (
            <View key={idx} style={styles.communityCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.communityTitle} numberOfLines={1}>
                  {loading ? 'Loading…' : item.title || 'Untitled'}
                </Text>
                <Text style={styles.communitySubtitle} numberOfLines={2}>
                  {loading ? ' ' : item.description || ' '}
                </Text>
              </View>
              {item?.image ? (
                <Image source={{ uri: item.image }} style={styles.communityImage} />
              ) : (
                <Image source={require('../assets/placeholder.png')} style={styles.communityImage} />
              )}
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.seeMore, pressed && { backgroundColor: '#f0f0f0' }]}
          onPress={() => router.push('/community')}
        >
          <Text style={styles.seeMoreText}>See More</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
    </UserProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerLeft: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerRight: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarText: { fontWeight: '700', color: '#111' },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1DA1F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  greetingSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },

  searchBar: {
    marginHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchPlaceholder: { color: '#8e8e8e', fontSize: 14 },

  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },

  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    width: width - 32,
  },
  notifTitle: { fontWeight: '700', color: '#111', marginBottom: 4 },
  notifTime: { color: '#6b7280', fontSize: 12, marginBottom: 2 },
  notifType: { color: '#3b82f6', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  notifImage: { width: 90, height: 60, borderRadius: 10 },
  announcementsList: {
    marginBottom: 10,
  },

  quickGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  quickLabel: { fontWeight: '600', color: '#111', fontSize: 12 },

  activityList: { marginHorizontal: 16 },
  activityItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  activityIconHolder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { fontWeight: '700', color: '#111', marginBottom: 2 },
  activitySubtitle: { color: '#6b7280', fontSize: 12 },
  activityMuted: { color: '#9ca3af', fontSize: 12 },

  communityCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  communityTitle: { fontWeight: '700', color: '#111' },
  communitySubtitle: { color: '#6b7280', marginTop: 4, fontSize: 12 },
  communityImage: { width: 90, height: 60, borderRadius: 10 },

  seeMore: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  seeMoreText: { color: '#111', fontWeight: '600' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});


