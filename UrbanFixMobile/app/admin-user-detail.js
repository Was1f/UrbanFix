import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SessionManager from '../utils/sessionManager';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiUrl } from '../constants/api';

export default function AdminUserDetail() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState('permanent');
  const [banExpiryDate, setBanExpiryDate] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    checkSessionAndLoadData();
  }, []);

  const checkSessionAndLoadData = async () => {
    try {
      console.log('🔍 Checking admin session...');
      const adminSession = await SessionManager.getAdminSession();
      
      if (adminSession) {
        console.log('✅ Valid session found, loading user data');
        setSession(adminSession);
        await fetchUserDetails(adminSession.token);
      } else {
        console.log('❌ No valid session found, redirecting to login');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
      router.replace('/admin-login');
    }
  };

  const fetchUserDetails = async (authToken) => {
    try {
      if (!authToken || !userId) {
        console.log('⚠️ No auth token or userId provided');
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl(`/api/admin/users/${userId}`), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        await handleSessionExpired();
        return;
      } else if (response.status === 404) {
        Alert.alert('Error', 'User not found');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to load user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionExpired = async () => {
    console.log('⚠️ Session expired, clearing and redirecting');
    await SessionManager.clearAdminSession();
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      { text: 'OK', onPress: () => router.replace('/admin-login') }
    ]);
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      Alert.alert('Error', 'Please provide a ban reason');
      return;
    }

    if (banType === 'temporary' && !banExpiryDate) {
      Alert.alert('Error', 'Please select an expiry date for temporary ban');
      return;
    }

    setBanLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/users/${userId}/ban`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: banReason,
          banType,
          expiryDate: banType === 'temporary' ? banExpiryDate : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message);
        setBanModalVisible(false);
        setBanReason('');
        setBanType('permanent');
        setBanExpiryDate('');
        // Refresh user data
        await fetchUserDetails(session.token);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      Alert.alert('Error', 'Failed to ban user');
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    Alert.alert('Unban User', 'Are you sure you want to unban this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unban',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(apiUrl(`/api/admin/users/${userId}/unban`), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              Alert.alert('Success', data.message);
              // Refresh user data
              await fetchUserDetails(session.token);
            } else {
              const errorData = await response.json();
              Alert.alert('Error', errorData.message || 'Failed to unban user');
            }
          } catch (error) {
            console.error('Error unbanning user:', error);
            Alert.alert('Error', 'Failed to unban user');
          }
        }
      }
    ]);
  };

  const handleUpdateBan = async () => {
    if (!banReason.trim()) {
      Alert.alert('Error', 'Please provide a ban reason');
      return;
    }

    if (banType === 'temporary' && !banExpiryDate) {
      Alert.alert('Error', 'Please select an expiry date for temporary ban');
      return;
    }

    setEditLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/users/${userId}/ban`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: banReason,
          banType,
          expiryDate: banType === 'temporary' ? banExpiryDate : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message);
        setEditModalVisible(false);
        setBanReason('');
        setBanType('permanent');
        setBanExpiryDate('');
        // Refresh user data
        await fetchUserDetails(session.token);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update ban details');
      }
    } catch (error) {
      console.error('Error updating ban details:', error);
      Alert.alert('Error', 'Failed to update ban details');
    } finally {
      setEditLoading(false);
    }
  };

  const openBanModal = () => {
    setBanReason('');
    setBanType('permanent');
    setBanExpiryDate('');
    setBanModalVisible(true);
  };

  const openEditModal = () => {
    setBanReason(user.banReason || '');
    setBanType(user.banExpiryDate ? 'temporary' : 'permanent');
    setBanExpiryDate(user.banExpiryDate ? new Date(user.banExpiryDate).toISOString().split('T')[0] : '');
    setEditModalVisible(true);
  };

  const BanModal = () => (
    <Modal
      visible={banModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setBanModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ban User: {user?.username}</Text>
          
          <Text style={styles.modalLabel}>Ban Type:</Text>
          <View style={styles.banTypeContainer}>
            <TouchableOpacity
              style={[
                styles.banTypeButton,
                banType === 'permanent' && styles.banTypeButtonActive
              ]}
              onPress={() => setBanType('permanent')}
            >
              <Text style={[
                styles.banTypeButtonText,
                banType === 'permanent' && styles.banTypeButtonTextActive
              ]}>Permanent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.banTypeButton,
                banType === 'temporary' && styles.banTypeButtonActive
              ]}
              onPress={() => setBanType('temporary')}
            >
              <Text style={[
                styles.banTypeButtonText,
                banType === 'temporary' && styles.banTypeButtonTextActive
              ]}>Temporary</Text>
            </TouchableOpacity>
          </View>

          {banType === 'temporary' && (
            <>
              <Text style={styles.modalLabel}>Expiry Date:</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                value={banExpiryDate}
                onChangeText={setBanExpiryDate}
              />
            </>
          )}

          <Text style={styles.modalLabel}>Ban Reason:</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter ban reason..."
            value={banReason}
            onChangeText={setBanReason}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setBanModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleBanUser}
              disabled={banLoading}
            >
              {banLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>Ban User</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const EditBanModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Ban: {user?.username}</Text>
          
          <Text style={styles.modalLabel}>Ban Type:</Text>
          <View style={styles.banTypeContainer}>
            <TouchableOpacity
              style={[
                styles.banTypeButton,
                banType === 'permanent' && styles.banTypeButtonActive
              ]}
              onPress={() => setBanType('permanent')}
            >
              <Text style={[
                styles.banTypeButtonText,
                banType === 'permanent' && styles.banTypeButtonTextActive
              ]}>Permanent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.banTypeButton,
                banType === 'temporary' && styles.banTypeButtonActive
              ]}
              onPress={() => setBanType('temporary')}
            >
              <Text style={[
                styles.banTypeButtonText,
                banType === 'temporary' && styles.banTypeButtonTextActive
              ]}>Temporary</Text>
            </TouchableOpacity>
          </View>

          {banType === 'temporary' && (
            <>
              <Text style={styles.modalLabel}>Expiry Date:</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                value={banExpiryDate}
                onChangeText={setBanExpiryDate}
              />
            </>
          )}

          <Text style={styles.modalLabel}>Ban Reason:</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter ban reason..."
            value={banReason}
            onChangeText={setBanReason}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleUpdateBan}
              disabled={editLoading}
            >
              {editLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>Update Ban</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading user details...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>User Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* User Status Banner */}
          <View style={[
            styles.statusBanner,
            user.isBanned ? styles.bannedBanner : styles.activeBanner
          ]}>
            <Text style={[
              styles.statusText,
              user.isBanned ? styles.bannedText : styles.activeText
            ]}>
              {user.isBanned ? 'ACCOUNT BANNED' : 'ACCOUNT ACTIVE'}
            </Text>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username:</Text>
              <Text style={styles.infoValue}>{user.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name:</Text>
              <Text style={styles.infoValue}>{user.fname} {user.lname}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{user.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{user.address}</Text>
            </View>
          </View>

          {/* Demographics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demographics</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>
                {new Date(user.dob).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>{user.gender}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Occupation:</Text>
              <Text style={styles.infoValue}>{user.occupation}</Text>
            </View>
            {user.skills && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Skills:</Text>
                <Text style={styles.infoValue}>{user.skills}</Text>
              </View>
            )}
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Joined:</Text>
              <Text style={styles.infoValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified:</Text>
              <Text style={styles.infoValue}>
                {user.isVerified ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verification Badge:</Text>
              <Text style={styles.infoValue}>
                {user.verificationBadge ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Points:</Text>
              <Text style={styles.infoValue}>{user.points?.total || 0}</Text>
            </View>
          </View>

          {/* Ban Information */}
          {user.isBanned && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ban Information</Text>
              <View style={styles.banInfoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ban Reason:</Text>
                  <Text style={styles.infoValue}>{user.banReason}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ban Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(user.banDate).toLocaleDateString()}
                  </Text>
                </View>
                {user.banExpiryDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Expires:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(user.banExpiryDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {user.bannedBy && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Banned By:</Text>
                    <Text style={styles.infoValue}>{user.bannedBy.username}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              {user.isBanned ? (
                <>
                  <TouchableOpacity 
                    style={styles.editBanButton}
                    onPress={openEditModal}
                  >
                    <Text style={styles.editBanButtonText}>Edit Ban</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.unbanButton}
                    onPress={handleUnbanUser}
                  >
                    <Text style={styles.unbanButtonText}>Unban User</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.banButton}
                  onPress={openBanModal}
                >
                  <Text style={styles.banButtonText}>Ban User</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        <BanModal />
        <EditBanModal />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1e90ff',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  bannedBanner: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  activeBanner: {
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannedText: {
    color: '#d32f2f',
  },
  activeText: {
    color: '#2e7d32',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  banInfoCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  actionButtons: {
    gap: 15,
  },
  banButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  banButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editBanButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  unbanButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  unbanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  banTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  banTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  banTypeButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  banTypeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  banTypeButtonTextActive: {
    color: 'white',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
