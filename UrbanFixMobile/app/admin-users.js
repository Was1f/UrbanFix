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
} from 'react-native';
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
        await handleSessionExpired();
        return;
      } else {
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (session?.token) {
        fetchUsers(session.token, 1, true);
      }
    }, [session?.token])
  );

  // Separate effect for filters to avoid infinite loops
  useEffect(() => {
    if (session?.token) {
      setCurrentPage(1);
      setFilterLoading(true);
      fetchUsers(session.token, 1, true);
    }
  }, [searchQuery, locationFilter, banStatusFilter]);

  const handleSessionExpired = async () => {
    console.log('⚠️ Session expired, clearing and redirecting');
    await SessionManager.clearAdminSession();
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      { text: 'OK', onPress: () => router.replace('/admin-login') }
    ]);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers(session.token, 1, true);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !loading) {
      fetchUsers(session.token, currentPage + 1, false);
    }
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
      const response = await fetch(apiUrl(`/api/admin/users/${selectedUser._id}/ban`), {
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
        setSelectedUser(null);
        // Refresh users list
        fetchUsers(session.token, 1, true);
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
              const data = await response.json();
              Alert.alert('Success', data.message);
              // Refresh users list
              fetchUsers(session.token, 1, true);
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

  const renderUserCard = ({ item: user }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.location}>{user.location}</Text>
        </View>
        <View style={styles.userStatus}>
          {user.isBanned ? (
            <View style={styles.bannedBadge}>
              <Text style={styles.bannedText}>BANNED</Text>
            </View>
          ) : (
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.userDetails}>
        <Text style={styles.userName}>{user.fname} {user.lname}</Text>
        <Text style={styles.joinDate}>Joined: {new Date(user.createdAt).toLocaleDateString()}</Text>
        
        {user.isBanned && (
          <View style={styles.banInfo}>
            <Text style={styles.banReason}>Reason: {user.banReason}</Text>
            <Text style={styles.banDate}>Banned: {new Date(user.banDate).toLocaleDateString()}</Text>
            {user.banExpiryDate && (
              <Text style={styles.banExpiry}>Expires: {new Date(user.banExpiryDate).toLocaleDateString()}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => {
            // Navigate to user detail view
            router.push(`/admin-user-detail?userId=${user._id}`);
          }}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {user.isBanned ? (
          <TouchableOpacity 
            style={styles.unbanButton}
            onPress={() => handleUnbanUser(user._id)}
          >
            <Text style={styles.unbanButtonText}>Unban</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.banButton}
            onPress={() => {
              setSelectedUser(user);
              setBanModalVisible(true);
            }}
          >
            <Text style={styles.banButtonText}>Ban</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const BanModal = () => (
    <Modal
      visible={banModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setBanModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ban User: {selectedUser?.username}</Text>
          
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
              onPress={() => {
                setBanModalVisible(false);
                setBanReason('');
                setBanType('permanent');
                setBanExpiryDate('');
                setSelectedUser(null);
              }}
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

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading users...</Text>
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
          <Text style={styles.title}>Manage Users</Text>
          <View style={styles.headerSpacer} />
        </View>

                        {/* Search and Filters */}
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
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
                  
                  {/* Active Filters Indicator */}
                  {(searchQuery || locationFilter || banStatusFilter) && (
                    <View style={styles.activeFiltersIndicator}>
                      <Text style={styles.activeFiltersText}>
                        Active Filters: 
                        {searchQuery && ` Search: "${searchQuery}"`}
                        {locationFilter && ` Location: "${locationFilter}"`}
                        {banStatusFilter && ` Status: "${banStatusFilter === 'banned' ? 'Banned' : 'Active'}"`}
                      </Text>
                      {filterLoading && (
                        <View style={styles.filterLoadingIndicator}>
                          <ActivityIndicator size="small" color="#2196f3" />
                          <Text style={styles.filterLoadingText}>Applying filters...</Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  <View style={styles.filtersRow}>
            <TextInput
              style={styles.filterInput}
              placeholder="Filter by location..."
              value={locationFilter}
              onChangeText={setLocationFilter}
            />
            
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
              <Text style={[
                styles.filterButtonText,
                banStatusFilter === 'banned' && styles.filterButtonTextActive
              ]}>
                {banStatusFilter === 'banned' ? 'Banned ✓' : 'Banned'}
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
              <Text style={[
                styles.filterButtonText,
                banStatusFilter === 'unbanned' && styles.filterButtonTextActive
              ]}>
                {banStatusFilter === 'unbanned' ? 'Active ✓' : 'Active'}
              </Text>
            </TouchableOpacity>
            
            {(searchQuery || locationFilter || banStatusFilter) && (
              <TouchableOpacity
                style={[styles.filterButton, styles.clearFilterButton]}
                onPress={() => {
                  setSearchQuery('');
                  setLocationFilter('');
                  setBanStatusFilter('');
                }}
              >
                <Text style={styles.clearFilterButtonText}>Clear All</Text>
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            currentPage < totalPages ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#1e90ff" />
                <Text style={styles.loadMoreText}>Loading more users...</Text>
              </View>
            ) : null
          }
        />

        <BanModal />
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
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  activeFiltersIndicator: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  filterLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  filterLoadingText: {
    fontSize: 12,
    color: '#1976d2',
    fontStyle: 'italic',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  filterButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  clearFilterButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  clearFilterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#999',
  },
  userStatus: {
    marginLeft: 10,
  },
  bannedBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userDetails: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  joinDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  banInfo: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  banReason: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 2,
  },
  banDate: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 2,
  },
  banExpiry: {
    fontSize: 12,
    color: '#856404',
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  banButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  banButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  unbanButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  unbanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadMoreText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
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
