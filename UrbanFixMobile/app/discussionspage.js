import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiUrl } from '../constants/api';

const Discussions = () => {
  const router = useRouter();
  const { location } = useLocalSearchParams();
  
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportedMap, setReportedMap] = useState({});

  const fetchDiscussions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build URL with location filter if provided
      let url = apiUrl('/api/discussions');
      if (location) {
        url += `?location=${encodeURIComponent(location)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      
      const data = await response.json();
      setDiscussions(data);

      // Map reported discussions
      const nextReported = {};
      data.forEach((disc) => {
        if (disc?.status === 'flagged') {
          nextReported[disc._id] = true;
        }
      });
      setReportedMap(nextReported);
      
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  useFocusEffect(
    useCallback(() => {
      fetchDiscussions();
    }, [fetchDiscussions])
  );

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handlePostPress = (post) => {
    router.push(`/post-detail?postId=${post._id}`);
  };

  const handleReport = async (discussionId) => {
    try {
      const response = await fetch(apiUrl('/api/moderation/user/report'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discussionId,
          reason: 'Inappropriate Content',
          reporterUsername: 'Anonymous',
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 201) {
        Alert.alert('Report submitted', 'Thanks! Our admins will review it shortly.');
        setReportedMap((prev) => ({ ...prev, [discussionId]: true }));
      } else if (response.status === 200) {
        Alert.alert('Already reported', 'This discussion is already pending review.');
        setReportedMap((prev) => ({ ...prev, [discussionId]: true }));
      } else {
        Alert.alert('Error', (data && data.message) || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error reporting:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const handleRevoke = async (discussionId) => {
    try {
      const revokeRes = await fetch(apiUrl('/api/moderation/user/report/revoke'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discussionId }),
      });
      const revokeData = await revokeRes.json().catch(() => null);
      if (revokeRes.ok) {
        setReportedMap((prev) => {
          const copy = { ...prev };
          delete copy[discussionId];
          return copy;
        });
        Alert.alert('Revoked', 'Your report has been revoked.');
      } else {
        Alert.alert('Error', (revokeData && revokeData.message) || 'Failed to revoke report');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to revoke report');
    }
  };

  const handleDelete = async (discussionId) => {
    Alert.alert(
      'Delete Discussion',
      'Are you sure you want to delete this discussion? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(apiUrl(`/api/discussions/${discussionId}`), {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                // Remove from local state
                setDiscussions(prev => prev.filter(d => d._id !== discussionId));
                Alert.alert('Success', 'Discussion deleted successfully');
                
                // Update board count by refetching discussions
                // This will trigger the board count update on the backend
                setTimeout(() => {
                  fetchDiscussions();
                }, 1000);
              } else {
                throw new Error('Failed to delete discussion');
              }
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Failed to delete discussion');
            }
          }
        }
      ]
    );
  };

  const retryFetch = () => {
    setError(null);
    fetchDiscussions();
  };

  const renderPostTypeIndicator = (post) => {
    let icon = '';
    let color = '#666';
    
    switch (post.type) {
      case 'Poll':
        icon = '📊';
        color = '#1e90ff';
        break;
      case 'Event':
        icon = '📅';
        color = '#4caf50';
        break;
      case 'Donation':
        icon = '💰';
        color = '#ff9800';
        break;
      case 'Volunteer':
        icon = '🤝';
        color = '#9c27b0';
        break;
      case 'Report':
        icon = '⚠️';
        color = '#f44336';
        break;
      default:
        icon = '📝';
    }

    return (
      <View style={[styles.typePill, { backgroundColor: color + '20' }]}>
        <Text style={[styles.typeText, { color }]}>{icon} {post.type}</Text>
      </View>
    );
  };

  const renderPostPreview = (post) => {
    switch (post.type) {
      case 'Poll':
        // Handle Map object from MongoDB
        let totalVotes = 0;
        if (post.pollVotes) {
          if (post.pollVotes instanceof Map) {
            totalVotes = Array.from(post.pollVotes.values()).reduce((sum, count) => sum + count, 0);
          } else if (typeof post.pollVotes === 'object') {
            totalVotes = Object.values(post.pollVotes).reduce((sum, count) => sum + count, 0);
          }
        }
        return (
          <Text style={styles.postPreview}>
            Poll • {totalVotes} votes • {post.pollOptions?.length || 0} options
          </Text>
        );
      
      case 'Event':
        const eventDate = post.eventDate ? new Date(post.eventDate).toLocaleDateString() : 'Date TBD';
        return (
          <Text style={styles.postPreview}>
            Event • {eventDate} • {post.attendeeCount || 0} attending
          </Text>
        );
      
      case 'Donation':
        const raised = post.currentAmount || 0;
        const goal = post.goalAmount;
        const progress = goal ? Math.round((raised / goal) * 100) : 0;
        return (
          <Text style={styles.postPreview}>
            Donation • ৳{raised.toLocaleString()} raised{goal ? ` (${progress}% of ৳${goal.toLocaleString()})` : ''}
          </Text>
        );
      
      case 'Volunteer':
        const volunteersText = post.volunteersNeeded ? 
          ` of ${post.volunteersNeeded} needed` : '';
        return (
          <Text style={styles.postPreview}>
            Volunteer • {post.volunteerCount || 0} signed up{volunteersText}
          </Text>
        );
      
      case 'Report':
        return (
          <Text style={styles.postPreview}>
            Community Report • Help resolve this issue
          </Text>
        );
      
      default:
        return null;
    }
  };

  const renderInteractionButtons = (post) => {
    const buttons = [];

    switch (post.type) {
      case 'Poll':
        buttons.push(
          <Pressable
            key="vote"
            style={styles.interactionButton}
            onPress={() => handlePostPress(post)}
          >
            <Text style={styles.interactionButtonText}>📊 Vote</Text>
          </Pressable>
        );
        break;

      case 'Event':
        buttons.push(
          <Pressable
            key="rsvp"
            style={styles.interactionButton}
            onPress={() => handlePostPress(post)}
          >
            <Text style={styles.interactionButtonText}>📅 RSVP</Text>
          </Pressable>
        );
        break;

      case 'Donation':
        buttons.push(
          <Pressable
            key="donate"
            style={styles.interactionButton}
            onPress={() => handlePostPress(post)}
          >
            <Text style={styles.interactionButtonText}>💰 Donate</Text>
          </Pressable>
        );
        break;

      case 'Volunteer':
        buttons.push(
          <Pressable
            key="volunteer"
            style={styles.interactionButton}
            onPress={() => handlePostPress(post)}
          >
            <Text style={styles.interactionButtonText}>🤝 Volunteer</Text>
          </Pressable>
        );
        break;
    }

    buttons.push(
      <Pressable
        key="comment"
        style={styles.interactionButton}
        onPress={() => handlePostPress(post)}
      >
        <Text style={styles.interactionButtonText}>💬 Comment</Text>
      </Pressable>
    );

    return (
      <View style={styles.interactionButtonsRow}>
        {buttons}
      </View>
    );
  };

  const renderDiscussion = ({ item: d }) => (
    <Pressable
      style={({ pressed }) => [
        styles.discussionCard,
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
      onPress={() => handlePostPress(d)}
    >
      <View style={styles.discussionHeader}>
        {renderPostTypeIndicator(d)}
        {!!d.location && <Text style={styles.locationText}>📍 {d.location}</Text>}
      </View>

      {d.image && <Image source={{ uri: d.image }} style={styles.discussionImage} />}

      <View style={styles.discussionContent}>
        <Text style={styles.discussionTitle}>{d.title}</Text>
        {!!d.description && (
          <Text style={styles.discussionDescription} numberOfLines={2}>
            {d.description}
          </Text>
        )}
        
        {/* Render type-specific preview */}
        {renderPostPreview(d)}
        
        <Text style={styles.discussionAuthor}>
          By {d.author || 'Anonymous'} • {formatTimeAgo(d.createdAt || d.time)}
        </Text>
        
        <Text style={styles.commentsCount}>
          💬 {d.comments?.length || 0} comments
        </Text>
        
        {/* Render interaction buttons */}
        {renderInteractionButtons(d)}
        
        <View style={styles.actionsRow}>
          {/* Delete button (for demo purposes - in production, add proper auth checks) */}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.deleteButton, pressed && { backgroundColor: '#ffebee' }]}
            onPress={() => handleDelete(d._id)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
          </Pressable>
          
          {(() => {
            const isReported = !!reportedMap[d._id];
            if (isReported) {
              return (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable 
                    accessibilityRole="button" 
                    disabled 
                    style={[styles.outlineButton, styles.outlineButtonDisabled]}
                  >
                    <Text style={[styles.outlineButtonText, styles.outlineButtonTextDisabled]}>
                      Reported
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.outlineButton, pressed && { backgroundColor: '#f2f2f2' }]}
                    onPress={() => handleRevoke(d._id)}
                  >
                    <Text style={styles.outlineButtonText}>Revoke</Text>
                  </Pressable>
                </View>
              );
            }
            return (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.outlineButton, pressed && { backgroundColor: '#f2f2f2' }]}
                onPress={() => handleReport(d._id)}
              >
                <Text style={styles.outlineButtonText}>Report</Text>
              </Pressable>
            );
          })()}
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading discussions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={retryFetch}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {location ? `${location} Discussions` : 'All Discussions'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={discussions}
        keyExtractor={(item) => item._id}
        renderItem={renderDiscussion}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {location ? `No discussions in ${location} yet` : 'No discussions yet'}
            </Text>
            <Text style={styles.emptySubtext}>Be the first to start a conversation!</Text>
            <Pressable 
              style={styles.createButton} 
              onPress={() => router.push('/create-post')}
            >
              <Text style={styles.createButtonText}>Create Post</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <Pressable 
        style={({ pressed }) => [styles.fab, pressed && { backgroundColor: '#187bcd' }]} 
        onPress={() => router.push('/create-post')}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: { 
    flex: 1, 
    backgroundColor: '#f9f9f9' 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#666' 
  },
  errorText: { 
    fontSize: 16, 
    color: '#e74c3c', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  retryButton: { 
    backgroundColor: '#1e90ff', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  retryText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1e90ff',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
  },
  headerSpacer: { 
    width: 80 
  },
  listContainer: {
    paddingTop: 16,
  },
  discussionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  discussionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  discussionImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  discussionContent: {
    padding: 16,
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  discussionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  postPreview: {
    fontSize: 13,
    color: '#1e90ff',
    fontWeight: '500',
    marginBottom: 8,
  },
  discussionAuthor: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  commentsCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  interactionButtonsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  interactionButton: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  interactionButtonText: {
    fontSize: 12,
    color: '#1e90ff',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500',
  },
  outlineButton: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#000',
  },
  outlineButtonDisabled: {
    backgroundColor: '#f2f2f2',
    borderColor: '#999',
  },
  outlineButtonText: { 
    color: '#000', 
    fontWeight: '600', 
    fontSize: 12 
  },
  outlineButtonTextDisabled: { 
    color: '#666' 
  },
  emptyState: { 
    padding: 40, 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#666', 
    fontWeight: '500', 
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#999', 
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { 
    fontSize: 28, 
    color: '#fff', 
    fontWeight: '300' 
  },
});

export default Discussions;