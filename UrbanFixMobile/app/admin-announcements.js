import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SessionManager from '../utils/sessionManager';
import { apiUrl } from '../constants/api';

export default function AdminAnnouncements() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'archived', 'all'

  useFocusEffect(
    React.useCallback(() => {
      loadAnnouncements();
    }, [statusFilter])
  );

  useEffect(() => {
    filterAnnouncements();
  }, [searchText, announcements]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const session = await SessionManager.getAdminSession();
      
      if (!session) {
        Alert.alert('Authentication Error', 'Please login again');
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(
        apiUrl(`/api/announcements/admin?status=${statusFilter}&limit=50`),
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session Expired', 'Please login again');
          router.replace('/admin-login');
          return;
        }
        throw new Error('Failed to fetch announcements');
      }

      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      Alert.alert('Error', 'Failed to load announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const filterAnnouncements = () => {
    if (!searchText.trim()) {
      setFilteredAnnouncements(announcements);
      return;
    }

    const filtered = announcements.filter(announcement => {
      const searchLower = searchText.toLowerCase();
      return (
        announcement.title?.toLowerCase().includes(searchLower) ||
        announcement.description?.toLowerCase().includes(searchLower) ||
        announcement.type?.toLowerCase().includes(searchLower) ||
        announcement.customType?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredAnnouncements(filtered);
  };

  const getActionButtonTextStyle = (action) => {
    switch (action) {
      case 'edit':
        return { color: '#374151' };
      case 'delete':
        return { color: '#dc2626' };
      case 'archive':
        return { color: '#f59e0b' };
      case 'restore':
        return { color: '#10b981' };
      default:
        return { color: '#374151' };
    }
  };

  const handleDelete = async (announcementId) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const session = await SessionManager.getAdminSession();
              
              const response = await fetch(
                apiUrl(`/api/announcements/admin/${announcementId}`),
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${session.token}`,
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Failed to delete announcement');
              }

              Alert.alert('Success', 'Announcement deleted successfully');
              loadAnnouncements();
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Failed to delete announcement');
            }
          },
        },
      ]
    );
  };

  const handleArchive = async (announcementId) => {
    try {
      const session = await SessionManager.getAdminSession();
      
      const response = await fetch(
        apiUrl(`/api/announcements/admin/${announcementId}/archive`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to archive announcement');
      }

      Alert.alert('Success', 'Announcement archived successfully');
      loadAnnouncements();
    } catch (error) {
      console.error('Error archiving announcement:', error);
      Alert.alert('Error', 'Failed to archive announcement');
    }
  };

  const handleRestore = async (announcementId) => {
    try {
      const session = await SessionManager.getAdminSession();
      
      const response = await fetch(
        apiUrl(`/api/announcements/admin/${announcementId}/restore`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to restore announcement');
      }

      Alert.alert('Success', 'Announcement restored successfully');
      loadAnnouncements();
    } catch (error) {
      console.error('Error restoring announcement:', error);
      Alert.alert('Error', 'Failed to restore announcement');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (announcement) => {
    if (announcement.isArchived) return '#6b7280';
    if (new Date(announcement.expirationDate) < new Date()) return '#dc2626';
    return '#10b981';
  };

  const getStatusText = (announcement) => {
    if (announcement.isArchived) return 'Archived';
    if (new Date(announcement.expirationDate) < new Date()) return 'Expired';
    return 'Active';
  };

  const renderAnnouncementItem = ({ item }) => (
    <View style={styles.announcementCard}>
      <View style={styles.cardHeader}>
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item)}
            </Text>
          </View>
          <Text style={styles.typeText}>{item.finalType || item.customType || item.type}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      <Text style={styles.titleText}>{item.title}</Text>
      
      {item.time && (
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      )}

      <Text style={styles.descriptionText} numberOfLines={2}>
        {item.description}
      </Text>

      {item.image && (
        <Image
          source={{ uri: apiUrl(item.image) }}
          style={styles.announcementImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.expirationContainer}>
        <Text style={styles.expirationText}>
          Expires: {formatDate(item.expirationDate)}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        {item.isArchived ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={() => handleRestore(item._id)}
          >
            <Ionicons name="refresh-outline" size={16} color="#10b981" />
            <Text style={[styles.actionButtonText, getActionButtonTextStyle('restore')]}>Restore</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.archiveButton]}
            onPress={() => handleArchive(item._id)}
          >
            <Ionicons name="archive-outline" size={16} color="#f59e0b" />
            <Text style={[styles.actionButtonText, getActionButtonTextStyle('archive')]}>Archive</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/admin-edit-announcement?id=${item._id}`)}
        >
          <Ionicons name="create-outline" size={16} color="#374151" />
          <Text style={[styles.actionButtonText, getActionButtonTextStyle('edit')]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item._id)}
        >
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={[styles.actionButtonText, getActionButtonTextStyle('delete')]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      <TouchableOpacity
        style={[styles.filterTab, statusFilter === 'active' && styles.filterTabActive]}
        onPress={() => setStatusFilter('active')}
      >
        <Text style={[styles.filterTabText, statusFilter === 'active' && styles.filterTabTextActive]}>
          Active
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterTab, statusFilter === 'archived' && styles.filterTabActive]}
        onPress={() => setStatusFilter('archived')}
      >
        <Text style={[styles.filterTabText, statusFilter === 'archived' && styles.filterTabTextActive]}>
          Archived
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterTab, statusFilter === 'all' && styles.filterTabActive]}
        onPress={() => setStatusFilter('all')}
      >
        <Text style={[styles.filterTabText, statusFilter === 'all' && styles.filterTabTextActive]}>
          All
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="megaphone-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Announcements</Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter === 'active' 
          ? 'No active announcements found.' 
          : statusFilter === 'archived'
          ? 'No archived announcements found.'
          : 'No announcements found.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Announcements</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Announcements</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/admin-create-announcement')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8e8e8e" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search announcements..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#8e8e8e"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#8e8e8e" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderFilterTabs()}

      <FlatList
        data={filteredAnnouncements}
        renderItem={renderAnnouncementItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={renderEmptyList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerRight: {
    width: 40,
  },
  addButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#6366f1',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  typeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  announcementImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  expirationContainer: {
    marginBottom: 12,
  },
  expirationText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  archiveButton: {
    backgroundColor: '#fef7f0',
    borderColor: '#fed7aa',
  },
  restoreButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
