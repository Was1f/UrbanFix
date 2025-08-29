// app/ViewPublicProfile.js
import React, { useEffect, useState } from 'react';
import { 
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable, SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiUrl } from '../constants/api';
import DiscussionCard from '../components/DiscussionCard';

export default function ViewPublicProfile() {
  const { identifier } = useLocalSearchParams();
  const router = useRouter();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // NEW states for discussions
  const [discussions, setDiscussions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        console.log('Fetching profile for identifier:', identifier);
        const res = await fetch(apiUrl(`/api/user/profile/${identifier}`));
        const data = await res.json();

        console.log('Profile fetch response:', { status: res.status, data });

        if (res.ok) {
          setProfile(data);
          // 🔹 fetch discussions after profile
          fetchUserDiscussions(data._id);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        Alert.alert('Error', 'Unable to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserDiscussions = async (userId) => {
      try {
        setLoadingDiscussions(true);
        const res = await fetch(apiUrl(`/api/user/${userId}/discussions`));
        const data = await res.json();
        if (res.ok) {
          setDiscussions(data);
        } else {
          console.error('Failed to fetch discussions:', data.message);
        }
      } catch (err) {
        console.error('Error fetching discussions:', err);
      } finally {
        setLoadingDiscussions(false);
      }
    };

    fetchProfile();
  }, [identifier]);

  // Handle no identifier
  if (!identifier) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/community')}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Public Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.centerText}>No identifier provided</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/community')}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Public Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Profile not found
  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/community')}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Public Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.centerText}>User not found</Text>
          <Text style={styles.centerSubtext}>This user may not exist or their profile is private</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Helper function to get profile image URL
  const getProfileImageUrl = (profilePic) => {
    if (!profilePic) return null;
    
    if (typeof profilePic === 'string') {
      if (profilePic.startsWith('http://') || profilePic.startsWith('https://')) {
        return profilePic;
      }
      if (profilePic.startsWith('/uploads/')) {
        return apiUrl(profilePic);
      }
      return apiUrl(`/uploads/profile/${profilePic}`);
    }
    
    if (profilePic && profilePic.uri) {
      if (profilePic.uri.startsWith('data:')) {
        return profilePic.uri;
      }
      if (profilePic.uri.startsWith('http://') || profilePic.uri.startsWith('https://')) {
        return profilePic.uri;
      }
      if (profilePic.uri.startsWith('/uploads/')) {
        return apiUrl(profilePic.uri);
      }
      return apiUrl(`/uploads/profile/${profilePic.uri}`);
    }
    
    return null;
  };

  const profileImageUrl = getProfileImageUrl(profile.profilePic);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/community')}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Public Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            {profileImageUrl ? (
              <Image 
                source={{ uri: profileImageUrl }}
                style={styles.profileImage}
                onError={(error) => {
                  console.log('Profile image load error:', error.nativeEvent.error);
                }}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImagePlaceholderText}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>

          {/* Name and Verification Badge */}
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {profile.name || 'Anonymous User'}
            </Text>
            {profile.verificationBadge && (
              <Ionicons name="checkmark-circle" size={24} color="#1DA1F2" style={{ marginLeft: 8 }} />
            )}
          </View>

          {/* Profession */}
          <Text style={styles.profession}>{profile.profession || 'Not specified'}</Text>

          {/* Location */}
          {profile.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.points?.total || profile.points || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {profile.phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color="#6366f1" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{profile.phone}</Text>
                </View>
              </View>
            )}

            {profile.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={20} color="#6366f1" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{profile.email}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Member Since Section */}
          <View style={styles.memberSection}>
            <Text style={styles.memberText}>Community Member</Text>
          </View>
        </View>

        {/* 🔹 User Discussions Section */}
        <View style={styles.discussionsSection}>
          <Text style={styles.sectionTitle}>User's Discussions</Text>

          {loadingDiscussions ? (
            <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 20 }} />
          ) : discussions.length === 0 ? (
            <Text style={styles.emptyText}>No discussions yet</Text>
          ) : (
            discussions.map((discussion) => (
              <DiscussionCard key={discussion._id} discussion={discussion} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#64748b',
  },
  headerTitle: { 
    flex: 1,
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Center states
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  centerText: { 
    textAlign: 'center', 
    fontSize: 18, 
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  centerSubtext: {
    textAlign: 'center', 
    fontSize: 14, 
    color: '#94a3b8',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },

  // Content
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40 
  },
  
  profileSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Profile Image
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 3, 
    borderColor: '#e5e7eb' 
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Name and basic info
  nameContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  name: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#111827', 
    textAlign: 'center' 
  },
  profession: { 
    fontSize: 16, 
    color: '#6b7280', 
    marginBottom: 8, 
    fontWeight: '500', 
    textAlign: 'center' 
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  location: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginLeft: 4,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },

  // Details
  detailsSection: { 
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: { 
    fontSize: 12,
    fontWeight: '500', 
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: { 
    fontSize: 14, 
    color: '#111827', 
    fontWeight: '500',
    marginTop: 2,
  },

  // Member section
  memberSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  memberText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },

  // Discussions
  discussionsSection: {
    marginTop: 24,
    paddingHorizontal: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    marginVertical: 12,
  },
});
