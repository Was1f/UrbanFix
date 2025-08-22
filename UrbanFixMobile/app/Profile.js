import React, { useContext, useCallback, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { apiUrl } from "../constants/api";

export default function Profile({ navigation }) {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Handle case where AuthContext is not available
  if (!authContext) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16, color: 'red' }}>
          Authentication context not available. Please login first.
        </Text>
        <TouchableOpacity 
          style={[styles.editBtn, { marginTop: 20 }]}
          onPress={() => {
            if (navigation?.navigate) {
              navigation.navigate('PhoneLogin');
            } else if (router?.push) {
              router.push('/PhoneLogin');
            } else if (typeof window !== 'undefined') {
              window.location.href = '/PhoneLogin';
            }
          }}
        >
          <Text style={{ fontWeight: 'bold', color: 'white' }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user: loggedInUser, updateUser, logout } = authContext;

  // Fetch fresh user data on screen focus
  useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const fetchUser = async () => {
      if (!loggedInUser?._id) return;

      try {
        const res = await axios.get(apiUrl(`/api/user/${loggedInUser._id}`));
        if (isActive && res.data?._id) {
          updateUser(res.data); // update context
        }
      } catch (err) {
        console.error('Error fetching user:', err.message);
        if (isActive) {
          // fallback to previous context data, don't overwrite with empty/bad data
          updateUser(loggedInUser);
        }
      }
    };

    fetchUser();
    return () => { isActive = false; };
  }, [loggedInUser])
);

  if (!loggedInUser) return <Text style={{ textAlign: 'center', marginTop: 20 }}>User not found</Text>;

  const handleLogout = async () => {
    try {
      setShowLogoutModal(false);
      await logout();
      // Navigation to login page is handled automatically by the logout method
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      Alert.alert('Logout Error', 'Failed to logout properly. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation?.goBack) {
            navigation.goBack();
          } else if (router?.back) {
            router.back();
          } else if (typeof window !== 'undefined') {
            window.history.back();
          }
        }}>
          <Text style={styles.headerBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => setShowLogoutModal(true)}>
          <Text style={styles.headerBtn}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          {/* Profile Picture - Use user's profile pic if available, otherwise default */}
          <Image 
            source={
              loggedInUser.profilePic?.uri 
                ? { uri: apiUrl(loggedInUser.profilePic.uri) }
                : require('../assets/profile.jpg')
            } 
            style={styles.profileImage} 
            defaultSource={require('../assets/profile.jpg')}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {loggedInUser.fname && loggedInUser.lname
                ? `${loggedInUser.fname} ${loggedInUser.lname}`
                : loggedInUser.name}
            </Text>
            {loggedInUser.verificationBadge && (
              <Ionicons name="checkmark-circle" size={24} color="#1DA1F2" style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={styles.profession}>{loggedInUser.occupation || loggedInUser.profession}</Text>
          <Text style={styles.address}>{loggedInUser.address}</Text>
          
          {/* Bio Section */}
          {loggedInUser.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioTitle}>About Me</Text>
              <Text style={styles.bioText}>{loggedInUser.bio}</Text>
            </View>
          )}
          
          {/* Additional User Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{loggedInUser.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{loggedInUser.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{loggedInUser.email}</Text>
            </View>
            {loggedInUser.bloodGroup && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Blood Group:</Text>
                <Text style={styles.detailValue}>{loggedInUser.bloodGroup}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            if (navigation?.navigate) {
              navigation.navigate('EditProfileScreen', { userId: loggedInUser._id });
            } else if (router?.push) {
              router.push({
                pathname: '/EditProfileScreen',
                params: { userId: loggedInUser._id }
              });
            } else if (typeof window !== 'undefined') {
              window.location.href = `/EditProfileScreen?userId=${loggedInUser._id}`;
            }
          }}
        >
          <Text style={{ fontWeight: '600', color: 'white', fontSize: 16 }}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={styles.modalMessage}>Do you want to logout?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#f9f9f9',
  },
  headerBtn: { 
    color: '#111827', 
    fontSize: 18, 
    fontWeight: '600',
    padding: 8,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    marginBottom: 16, 
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  name: { 
    fontSize: 24, 
    textAlign: 'center', 
    marginBottom: 8, 
    fontWeight: '700',
    color: '#111827',
  },
  profession: { 
    fontSize: 16, 
    color: '#6b7280', 
    textAlign: 'center', 
    marginBottom: 4,
    fontWeight: '500',
  },
  address: { 
    color: '#6b7280', 
    textAlign: 'center', 
    marginBottom: 16,
    fontSize: 14,
  },
  bioSection: {
    width: '100%',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  detailsSection: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  detailValue: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  editBtn: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
    alignSelf: 'center',
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
