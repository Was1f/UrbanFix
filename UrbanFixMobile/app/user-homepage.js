import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../constants/api';

export default function UserHomepage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [communityItems, setCommunityItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/discussions'));
        const data = await res.json();
        if (!isMounted) return;
        setCommunityItems(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (e) {
        if (isMounted) setCommunityItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
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
            {user?.profilePicture ? (
              <Image 
                source={{ uri: user.profilePicture }} 
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
        <Text style={styles.sectionHeading}>Important Updates/Notifications</Text>
        <View style={styles.notificationCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>Power Outage Reported</Text>
            <Text style={styles.notifTime}>4 PM - 5 PM</Text>
          </View>
          <Image
            source={require('../assets/placeholder.png')}
            style={styles.notifImage}
            resizeMode="cover"
          />
        </View>

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
  },
  notifTitle: { fontWeight: '700', color: '#111', marginBottom: 4 },
  notifTime: { color: '#6b7280', fontSize: 12 },
  notifImage: { width: 90, height: 60, borderRadius: 10 },

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
});


