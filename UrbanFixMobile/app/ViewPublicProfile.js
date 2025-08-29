// app/ViewPublicProfile.js
import React, { useEffect, useState } from 'react';
import { 
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiUrl } from '../constants/api';

export default function ViewPublicProfile(props) {
  // Safe access to identifier: works as screen or component
  const identifier = props?.route?.params?.identifier || props?.identifier;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        // Determine query param type
        const queryParam = identifier.includes('@')
          ? `email=${identifier}`
          : /^\d+$/.test(identifier)
          ? `phone=${identifier}`
          : `id=${identifier}`;

        const res = await fetch(apiUrl(`/api/user/profile?${queryParam}`));
        const data = await res.json();

        if (res.ok) {
          setProfile(data);
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

    fetchProfile();
  }, [identifier]);

  // Handle no identifier
  if (!identifier) {
    return (
      <View style={styles.container}>
        <Text style={styles.centerText}>No identifier provided</Text>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Profile not found
  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.centerText}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Public Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <Image 
            source={
              profile.profilePic?.uri 
                ? { uri: apiUrl(profile.profilePic.uri) }
                : require('../assets/profile.jpg')
            }
            style={styles.profileImage}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {profile.name || `${profile.fname || ''} ${profile.lname || ''}`}
            </Text>
            {profile.verificationBadge && (
              <Ionicons name="checkmark-circle" size={24} color="#1DA1F2" style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={styles.profession}>{profile.profession || 'Not specified'}</Text>
          {profile.location && <Text style={styles.address}>{profile.location}</Text>}

          <View style={styles.detailsSection}>
            {profile.points !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Points:</Text>
                <Text style={styles.detailValue}>{profile.points}</Text>
              </View>
            )}
            {profile.phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{profile.phone}</Text>
              </View>
            )}
            {profile.email && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{profile.email}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  centerText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'gray' },
  header: { padding: 16, backgroundColor: '#f9f9f9', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 40 },
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
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, borderWidth: 3, borderColor: '#e5e7eb' },
  name: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  profession: { fontSize: 16, color: '#6b7280', marginBottom: 4, fontWeight: '500', textAlign: 'center' },
  address: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  detailsSection: { width: '100%', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 16 },
  detailLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  detailValue: { fontSize: 14, color: '#6b7280', fontWeight: '400' },
});
