import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import UserProtectedRoute from '../components/UserProtectedRoute';
import { apiUrl } from '../constants/api';

export default function AnnouncementsList() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    filterAnnouncements();
  }, [searchText, announcements]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('/api/announcements'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      
      const data = await response.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      Alert.alert('Error', 'Failed to load announcements. Please try again.');
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getTypeColor = (type) => {
    const typeColors = {
      'Power Outage': '#ef4444',
      'Government Declaration': '#3b82f6',
      'Flood Warning': '#0ea5e9',
      'Emergency Alert': '#dc2626',
      'Public Service': '#10b981',
      'Infrastructure': '#f59e0b',
      'Health Advisory': '#8b5cf6',
      'Transportation': '#06b6d4',
      'Weather Alert': '#6366f1',
      'Community Event': '#84cc16',
      'Other': '#6b7280',
    };
    return typeColors[type] || '#6b7280';
  };

  const renderAnnouncementItem = ({ item }) => (
    <TouchableOpacity
      style={styles.announcementCard}
      onPress={() => {
        // You can navigate to a detailed view if needed
        Alert.alert(item.title, item.description);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
          <View 
            style={[
              styles.typeBadge, 
              { backgroundColor: getTypeColor(item.finalType || item.customType || item.type) }
            ]}
          >
            <Text style={styles.typeText}>
              {item.finalType || item.customType || item.type}
            </Text>
          </View>
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

      <Text style={styles.descriptionText} numberOfLines={3}>
        {item.description}
      </Text>

      {item.image ? (
        <Image
          source={{ uri: apiUrl(item.image) }}
          style={styles.announcementImage}
          resizeMode="cover"
        />
      ) : (
        <Image
          source={getDefaultImageForType(item.finalType || item.customType || item.type)}
          style={styles.announcementImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.timestampText}>
          Posted at {formatTime(item.createdAt)}
        </Text>
        <Text style={styles.expiresText}>
          Expires: {formatDate(item.expirationDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="megaphone-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Announcements</Text>
      <Text style={styles.emptySubtitle}>
        {searchText.trim() 
          ? 'No announcements match your search.' 
          : 'Check back later for important updates.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <UserProtectedRoute>
        <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcements</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
        </SafeAreaView>
      </UserProtectedRoute>
    );
  }

  return (
    <UserProtectedRoute>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={styles.headerRight} />
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
    </UserProtectedRoute>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
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
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  timestampText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  expiresText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '500',
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
