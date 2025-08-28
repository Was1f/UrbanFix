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
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SessionManager from '../utils/sessionManager';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiUrl } from '../constants/api';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [banStatusFilter, setBanStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState('permanent');
  const [banExpiryDate, setBanExpiryDate] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => {
    checkSessionAndLoadData();
    
    // Cleanup function to clear timeout
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  const checkSessionAndLoadData = async () => {
    try {
      console.log('🔍 Checking admin session...');
      const adminSession = await SessionManager.getAdminSession();
      
      if (adminSession) {
        console.log('✅ Valid session found, loading users data');
        setSession(adminSession);
        await fetchUsers(adminSession.token);
      } else {
        console.log('❌ No valid session found, redirecting to login');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
      router.replace('/admin-login');
    }
  };

  const fetchUsers = async (authToken, page = 1, reset = false) => {
    try {
      if (!authToken) {
        console.log('⚠️ No auth token provided');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: searchQuery,
        location: locationFilter,
        banStatus: banStatusFilter
      });

      const response = await fetch(apiUrl(`/api/admin/users?${params}`), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setUsers(data.users);
        } else {
          setUsers(prev => page === 1 ? data.users : [...prev, ...data.users]);
        }
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(page);
      } else if (response.status === 401) {
        // Token expired or invalid
        await handleSessionExpired();
        return;
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (session?.token) {
        fetchUsers(session.token);
      }
    }, [session?.token])
  );

  const handleSessionExpired = async () => {
    console.log('⚠️ Session expired, clearing and redirecting');
    await SessionManager.clearAdminSession();
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      { text: 'OK', onPress: () => router.replace('/admin-login') }
    ]);
  };

  const handleSearch = () => {
    if (session?.token) {
      setCurrentPage(1);
      fetchUsers(session.token, 1, true);
    }
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && session?.token && !loading) {
      fetchUsers(session.token, currentPage + 1);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      Alert.alert('Error', 'Please provide a ban reason');
      return;
    }

    try {
      setBanLoading(true);
      const response = await fetch(apiUrl(`/api/admin/users/${selectedUser._id}/ban`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: banReason,
          type: banType,
          expiryDate: banType === 'temporary' ? banExpiryDate : null
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'User has been banned successfully', [
          { text: 'OK', onPress: () => {
            setBanModalVisible(false);
            setBanReason('');
            setSelectedUser(null);
            // Refresh users list
            if (session?.token) {
              fetchUsers(session.token, 1, true);
            }
          }}
        ]);
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

  const handleUnbanUser = async (userId) => {
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
              Alert.alert('Success', 'User has been unbanned successfully', [
                { text: 'OK', onPress: () => {
                  // Refresh users list
                  if (session?.token) {
                    fetchUsers(session.token, 1, true);
                  }
                }}
              ]);
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

  const renderUserCard = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.fname} {item.lname}
          </Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
          <Text style={styles.userLocation}>{item.location || 'No location'}</Text>
        </View>
        <View style={styles.userStatus}>
          {item.isBanned ? (
            <View style={styles.bannedBadge}>
              <Ionicons name="ban-outline" size={16} color="#dc2626" />
              <Text style={styles.bannedText}>Banned</Text>
            </View>
          ) : (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/admin-user-detail?userId=${item._id}`)}
        >
          <Ionicons name="eye-outline" size={16} color="#6366f1" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {item.isBanned ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.unbanButton]}
            onPress={() => handleUnbanUser(item._id)}
          >
            <Ionicons name="checkmark-outline" size={16} color="#10b981" />
            <Text style={[styles.actionButtonText, styles.unbanButtonText]}>Unban</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.banButton]}
            onPress={() => {
              setSelectedUser(item);
              setBanModalVisible(true);
            }}
          >
            <Ionicons name="ban-outline" size={16} color="#dc2626" />
            <Text style={[styles.actionButtonText, styles.banButtonText]}>Ban</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const BanModal = () => (
    <Modal
      visible={banModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setBanModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ban User</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setBanModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Banning: {selectedUser?.fname} {selectedUser?.lname}
          </Text>
          
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Ban Type</Text>
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
                ]}>
                  Permanent
                </Text>
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
                ]}>
                  Temporary
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {banType === 'temporary' && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Expiry Date</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                value={banExpiryDate}
                onChangeText={setBanExpiryDate}
              />
            </View>
          )}
          
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Ban Reason *</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for banning this user..."
              value={banReason}
              onChangeText={setBanReason}
              multiline
              numberOfLines={3}
            />
          </View>
          
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Ban User</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ProtectedRoute>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Manage Users</Text>
            <Text style={styles.headerSubtitle}>User administration and moderation</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name, phone, or location..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // Clear existing timeout
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
                // Set new timeout for debounced search
                const newTimeout = setTimeout(() => {
                  if (session?.token) {
                    setCurrentPage(1);
                    fetchUsers(session.token, 1, true);
                  }
                }, 500); // 500ms delay
                setSearchTimeout(newTimeout);
              }}
              onSubmitEditing={handleSearch}
            />
          </View>
          
          {/* Active Filters Indicator */}
          {(searchQuery || locationFilter || banStatusFilter) && (
            <View style={styles.activeFiltersIndicator}>
              <Ionicons name="filter-outline" size={16} color="#6366f1" />
              <Text style={styles.activeFiltersText}>
                Active Filters: 
                {searchQuery && ` Search: "${searchQuery}"`}
                {locationFilter && ` Location: "${locationFilter}"`}
                {banStatusFilter && ` Status: "${banStatusFilter === 'banned' ? 'Banned' : 'Active'}"`}
              </Text>
              {filterLoading && (
                <View style={styles.filterLoadingIndicator}>
                  <ActivityIndicator size="small" color="#6366f1" />
                  <Text style={styles.filterLoadingText}>Applying filters...</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={styles.filtersRow}>
            <View style={styles.filterInputContainer}>
              <Ionicons name="location-outline" size={16} color="#6b7280" style={styles.filterIcon} />
              <TextInput
                style={styles.filterInput}
                placeholder="Filter by location..."
                value={locationFilter}
                onChangeText={setLocationFilter}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                banStatusFilter === 'banned' && styles.filterButtonActive
              ]}
              onPress={() => {
                if (banStatusFilter === 'banned') {
                  setBanStatusFilter(''); // Clear filter
                } else {
                  setBanStatusFilter('banned'); // Set to banned only
                }
              }}
            >
              <Ionicons 
                name={banStatusFilter === 'banned' ? "ban" : "ban-outline"} 
                size={16} 
                color={banStatusFilter === 'banned' ? "#fff" : "#dc2626"} 
              />
              <Text style={[
                styles.filterButtonText,
                banStatusFilter === 'banned' && styles.filterButtonTextActive
              ]}>
                {banStatusFilter === 'banned' ? 'Banned' : 'Banned'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                banStatusFilter === 'unbanned' && styles.filterButtonActive
              ]}
              onPress={() => {
                if (banStatusFilter === 'unbanned') {
                  setBanStatusFilter(''); // Clear filter
                } else {
                  setBanStatusFilter('unbanned'); // Set to active only
                }
              }}
            >
              <Ionicons 
                name={banStatusFilter === 'unbanned' ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={16} 
                color={banStatusFilter === 'unbanned' ? "#fff" : "#10b981"} 
              />
              <Text style={[
                styles.filterButtonText,
                banStatusFilter === 'unbanned' && styles.filterButtonTextActive
              ]}>
                {banStatusFilter === 'unbanned' ? 'Active' : 'Active'}
              </Text>
            </TouchableOpacity>
            
            {(searchQuery || locationFilter || banStatusFilter) && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  setSearchQuery('');
                  setLocationFilter('');
                  setBanStatusFilter('');
                }}
              >
                <Ionicons name="close-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.clearFilterButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Users List */}
        <FlatList
          data={users}
          renderItem={renderUserCard}
          keyExtractor={(item) => item._id}
          style={styles.usersList}
          contentContainerStyle={styles.usersListContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            currentPage < totalPages ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.loadMoreText}>Loading more users...</Text>
              </View>
            ) : null
          }
        />

        <BanModal />
      </SafeAreaView>
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
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '400',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  searchIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#111827',
  },
  activeFiltersIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  filterLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  filterLoadingText: {
    fontSize: 12,
    color: '#1e40af',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterIcon: {
    marginLeft: 10,
    marginRight: 8,
  },
  filterInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  clearFilterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  userStatus: {
    alignItems: 'flex-end',
  },
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  bannedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  banButton: {
    backgroundColor: '#fef2f2',
  },
  banButtonText: {
    color: '#dc2626',
  },
  unbanButton: {
    backgroundColor: '#f0fdf4',
  },
  unbanButtonText: {
    color: '#10b981',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  banTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  banTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  banTypeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  banTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  banTypeButtonTextActive: {
    color: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
