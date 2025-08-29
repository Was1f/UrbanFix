import React, { useContext, useCallback, useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
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
  const [discussions, setDiscussions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);

  if (!authContext) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16, color: 'red' }}>
          Authentication context not available. Please login first.
        </Text>
        <TouchableOpacity
          style={[styles.editBtn, { marginTop: 20 }]}
          onPress={() => {
            if (navigation?.navigate) navigation.navigate('PhoneLogin');
            else if (router?.push) router.push('/PhoneLogin');
            else if (typeof window !== 'undefined') window.location.href = '/PhoneLogin';
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
            // Only update if there are actual changes to prevent unnecessary re-renders
            const hasChanges = JSON.stringify(res.data) !== JSON.stringify(loggedInUser);
            if (hasChanges) {
              updateUser(res.data);
            }
          }
        } catch (err) {
          // Don't update on error to prevent unnecessary re-renders
          console.error('Error fetching user data:', err);
        }
      };

      fetchUser();
      return () => { isActive = false; };
    }, [loggedInUser?._id]) // Only depend on user ID
  );

  // Fetch user's discussions
  useEffect(() => {
    const fetchDiscussions = async () => {
      if (!loggedInUser?._id) return;

      setLoadingDiscussions(true);
      try {
        const res = await axios.get(apiUrl(`/api/posts/user/${loggedInUser._id}/discussions`));
        setDiscussions(res.data || []);
      } catch (err) {
        console.error("Error fetching discussions:", err);
        Alert.alert('Error', 'Failed to load your discussions.');
      } finally {
        setLoadingDiscussions(false);
      }
    };

    fetchDiscussions();
  }, [loggedInUser?._id]); // Only depend on the user ID, not the entire user object

  if (!loggedInUser) return <Text style={{ textAlign: 'center', marginTop: 20 }}>User not found</Text>;

  const handleLogout = async () => {
    try {
      setShowLogoutModal(false);
      await logout();
    } catch (error) {
      Alert.alert('Logout Error', 'Failed to logout properly. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation?.goBack) navigation.goBack();
          else if (router?.back) router.back();
          else if (typeof window !== 'undefined') window.history.back();
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

          {loggedInUser.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioTitle}>About Me</Text>
              <Text style={styles.bioText}>{loggedInUser.bio}</Text>
            </View>
          )}

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

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            if (navigation?.navigate) navigation.navigate('EditProfileScreen', { userId: loggedInUser._id });
            else if (router?.push) router.push({ pathname: '/EditProfileScreen', params: { userId: loggedInUser._id } });
            else if (typeof window !== 'undefined') window.location.href = `/EditProfileScreen?userId=${loggedInUser._id}`;
          }}
        >
          <Text style={{ fontWeight: '600', color: 'white', fontSize: 16 }}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Support Tickets Button */}
        <TouchableOpacity
          style={styles.ticketBtn}
          onPress={() => {
            if (navigation?.navigate) navigation.navigate('ticket-inbox');
            else if (router?.push) router.push('/ticket-inbox');
            else if (typeof window !== 'undefined') window.location.href = '/ticket-inbox';
          }}
        >
          <Ionicons name="mail-outline" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={{ fontWeight: '600', color: 'white', fontSize: 16 }}>Support Tickets</Text>
        </TouchableOpacity>

                 {/* User Discussions */}
         <View style={{ marginTop: 24 }}>
           <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>My Discussions</Text>
           {loadingDiscussions ? (
             <ActivityIndicator size="large" color="#1e90ff" />
           ) : discussions.length === 0 ? (
             <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 8 }}>You haven't posted any discussions yet.</Text>
           ) : (
             <FlatList
               data={discussions}
               keyExtractor={(item) => item._id}
               renderItem={({ item }) => (
                 <TouchableOpacity
                   style={styles.discussionCard}
                   onPress={() => {
                     if (navigation?.navigate) navigation.navigate('post-detail', { postId: item._id });
                     else if (router?.push) router.push({ pathname: '/post-detail', params: { postId: item._id } });
                     else if (typeof window !== 'undefined') window.location.href = `/post-detail?postId=${item._id}`;
                   }}
                 >
                   {/* Discussion Header */}
                   <View style={styles.discussionHeader}>
                     <Text style={styles.discussionTitle}>{item.title}</Text>
                     <Text style={styles.discussionDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                   </View>
                   
                   {/* Discussion Content */}
                   <Text style={styles.discussionContent} numberOfLines={3}>
                     {item.content}
                   </Text>
                   
                   {/* Discussion Image if exists */}
                   {item.image && (
                     <Image
                       source={{ uri: item.image.startsWith('http') ? item.image : apiUrl(item.image) }}
                       style={styles.discussionImage}
                       resizeMode="cover"
                     />
                   )}
                   
                   {/* Discussion Stats */}
                   <View style={styles.discussionStats}>
                     <View style={styles.statItem}>
                       <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                       <Text style={styles.statText}>{item.commentCount || 0}</Text>
                     </View>
                     <View style={styles.statItem}>
                       <Ionicons name="heart-outline" size={16} color="#6b7280" />
                       <Text style={styles.statText}>{item.likeCount || 0}</Text>
                     </View>
                     <View style={styles.statItem}>
                       <Ionicons name="eye-outline" size={16} color="#6b7280" />
                       <Text style={styles.statText}>{item.viewCount || 0}</Text>
                     </View>
                   </View>
                   
                   {/* Location if exists */}
                   {item.location && (
                     <View style={styles.locationRow}>
                       <Ionicons name="location-outline" size={14} color="#6b7280" />
                       <Text style={styles.locationText}>{item.location}</Text>
                     </View>
                   )}
                 </TouchableOpacity>
               )}
               scrollEnabled={false}
             />
           )}
         </View>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, backgroundColor: '#f9f9f9' },
  headerBtn: { color: '#111827', fontSize: 18, fontWeight: '600', padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileSection: { backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, alignSelf: 'center', borderWidth: 3, borderColor: '#e5e7eb' },
  name: { fontSize: 24, textAlign: 'center', marginBottom: 8, fontWeight: '700', color: '#111827' },
  profession: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 4, fontWeight: '500' },
  address: { color: '#6b7280', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  bioSection: { width: '100%', marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  bioTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'center' },
  bioText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  detailsSection: { width: '100%', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  detailLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  detailValue: { fontSize: 14, color: '#6b7280', fontWeight: '400' },
  editBtn: { backgroundColor: '#1e90ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginVertical: 8, alignSelf: 'center', minWidth: 140, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  ticketBtn: { backgroundColor: '#6b48ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginVertical: 8, alignSelf: 'center', minWidth: 180, alignItems: 'center', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '80%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666', fontWeight: '600', fontSize: 16 },
  logoutButton: { backgroundColor: '#ef4444' },
  logoutButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
     discussionCard: { 
     backgroundColor: '#fff', 
     borderRadius: 12, 
     padding: 16, 
     marginBottom: 12, 
     shadowColor: '#000', 
     shadowOffset: { width: 0, height: 1 }, 
     shadowOpacity: 0.05, 
     shadowRadius: 3, 
     elevation: 1 
   },
   discussionHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-start',
     marginBottom: 8,
   },
   discussionTitle: { 
     fontSize: 16, 
     fontWeight: '600', 
     color: '#111827',
     flex: 1,
     marginRight: 8
   },
   discussionDate: { 
     fontSize: 12, 
     color: '#9ca3af',
     flexShrink: 0
   },
   discussionContent: { 
     fontSize: 14, 
     color: '#6b7280',
     lineHeight: 20,
     marginBottom: 12
   },
   discussionImage: {
     width: '100%',
     height: 120,
     borderRadius: 8,
     marginBottom: 12
   },
   discussionStats: {
     flexDirection: 'row',
     justifyContent: 'space-around',
     paddingVertical: 8,
     borderTopWidth: 1,
     borderTopColor: '#f3f4f6',
     marginBottom: 8
   },
   statItem: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 4
   },
   statText: {
     fontSize: 12,
     color: '#6b7280',
     fontWeight: '500'
   },
   locationRow: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 4,
     paddingTop: 8,
     borderTopWidth: 1,
     borderTopColor: '#f3f4f6'
   },
   locationText: {
     fontSize: 12,
     color: '#6b7280',
     fontWeight: '500'
   }
});
