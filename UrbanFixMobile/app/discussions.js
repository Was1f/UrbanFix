import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiUrl } from '../constants/api';

export default function Discussions() {
  const router = useRouter();
  const { location } = useLocalSearchParams();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiscussions();
  }, [location]);

  const loadDiscussions = async () => {
    try {
      const response = await fetch(apiUrl('/api/discussions'));
      if (response.ok) {
        const data = await response.json();
        // Filter by location if provided
        const filteredDiscussions = location 
          ? data.filter(discussion => 
              discussion.location && 
              discussion.location.toLowerCase().includes(location.toLowerCase())
            )
          : data;
        setDiscussions(filteredDiscussions);
      } else {
        setDiscussions([]);
      }
    } catch (error) {
      console.error('Error loading discussions:', error);
      setDiscussions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDiscussionIcon = (category) => {
    const iconMap = {
      'Road Safety': 'car-outline',
      'Community Events': 'people-outline',
      'Volunteer Opportunities': 'heart-outline',
      'Local News': 'newspaper-outline',
      'General': 'chatbubble-outline',
    };
    return iconMap[category] || 'chatbubble-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {location ? `${location} Discussions` : 'All Discussions'}
        </Text>
        <Pressable 
          style={styles.headerRight} 
          onPress={() => router.push('/create-post')}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading discussions...</Text>
          </View>
        ) : discussions.length > 0 ? (
          <View style={styles.discussionsList}>
            {discussions.map((discussion, index) => (
              <Pressable
                key={discussion._id || index}
                style={styles.discussionCard}
                onPress={() => {
                  Alert.alert(discussion.title, discussion.description);
                }}
              >
                <View style={styles.discussionHeader}>
                  <View style={styles.discussionIcon}>
                    <Ionicons 
                      name={getDiscussionIcon(discussion.category)} 
                      size={20} 
                      color="#007AFF" 
                    />
                  </View>
                  <View style={styles.discussionInfo}>
                    <Text style={styles.discussionTitle} numberOfLines={2}>
                      {discussion.title}
                    </Text>
                    <Text style={styles.discussionMeta}>
                      {discussion.author || 'Anonymous'} • {formatDate(discussion.createdAt || new Date())}
                    </Text>
                  </View>
                  {discussion.isFlagged && (
                    <View style={styles.flaggedBadge}>
                      <Ionicons name="warning" size={16} color="#ff4444" />
                    </View>
                  )}
                </View>
                
                <Text style={styles.discussionDescription} numberOfLines={3}>
                  {discussion.description}
                </Text>

                {discussion.location && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.locationText}>{discussion.location}</Text>
                  </View>
                )}

                <View style={styles.discussionFooter}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{discussion.category || 'General'}</Text>
                  </View>
                  <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                      <Ionicons name="chatbubble-outline" size={14} color="#666" />
                      <Text style={styles.statText}>{discussion.comments?.length || 0}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Ionicons name="heart-outline" size={14} color="#666" />
                      <Text style={styles.statText}>{discussion.likes || 0}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {location ? `No discussions in ${location}` : 'No discussions yet'}
            </Text>
            <Text style={styles.emptyText}>
              Be the first to start a conversation!
            </Text>
            <Pressable 
              style={styles.createButton}
              onPress={() => router.push('/create-post')}
            >
              <Text style={styles.createButtonText}>Create Discussion</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  discussionsList: {
    gap: 12,
  },
  discussionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  discussionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  discussionInfo: {
    flex: 1,
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  discussionMeta: {
    fontSize: 12,
    color: '#666',
  },
  flaggedBadge: {
    marginLeft: 8,
  },
  discussionDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  discussionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
