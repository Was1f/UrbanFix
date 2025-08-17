import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiUrl } from '../constants/api';

const { width } = Dimensions.get('window');

const CommunityHome = () => {
  const router = useRouter();

  const [boards, setBoards] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportedMap, setReportedMap] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch boards and discussions concurrently
      const [boardsRes, discussionsRes] = await Promise.all([
        fetch(apiUrl('/api/boards')),
        fetch(apiUrl('/api/discussions'))
      ]);

      if (!boardsRes.ok || !discussionsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [boardsData, discussionsData] = await Promise.all([
        boardsRes.json(),
        discussionsRes.json()
      ]);

      setBoards(boardsData);
      setDiscussions(discussionsData);

      // Map reported discussions
      const nextReported = {};
      discussionsData.forEach((disc) => {
        if (disc?.status === 'flagged') {
          nextReported[disc._id] = true;
        }
      });
      setReportedMap(nextReported);
      
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleBoardPress = (board) => {
    if (board.posts === 0) {
      Alert.alert(
        'No Posts Yet', 
        `There are no posts in ${board.title} yet. Be the first to create one!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Post', onPress: () => router.push('/create-post') }
        ]
      );
      return;
    }
    router.push(`/discussionspage?location=${encodeURIComponent(board.title)}`);
  };

  const handlePostPress = (post) => {
    router.push(`/post-detail?postId=${post._id}`);
  };

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

  const retryFetch = () => {
    setError(null);
    fetchData();
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading community...</Text>
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
        <View style={styles.headerSideSpacer} />
        <Text style={styles.headerTitle}>UrbanFix Community</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.adminButton, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/admin-login')}
        >
          <Text style={styles.adminButtonText}>Admin</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.tagsRow}>
          {[
            { label: 'All Posts', route: '/discussions' },
            { label: 'Trending 🔥', route: '/trending' },
            { label: 'Recent 🆕', route: '/recent' },
            { label: 'My Area ⭐', route: '/my-area' },
          ].map((tag) => (
            <Pressable
              key={tag.label}
              style={({ pressed }) => [styles.tagButton, pressed && { backgroundColor: '#f2f2f2' }]}
              onPress={() => router.push(tag.route)}
            >
              <Text style={styles.tagText}>{tag.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Browse by Location</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={boards}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.boardCard, 
                pressed && { transform: [{ scale: 0.97 }] },
                item.posts === 0 && styles.emptyBoardCard
              ]}
              onPress={() => handleBoardPress(item)}
            >
              <View style={styles.boardImageContainer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.boardImage} />
                ) : (
                  <View style={[
                    styles.boardImage, 
                    styles.placeholderImage,
                    item.posts === 0 && styles.emptyPlaceholderImage
                  ]}>
                    <Text style={[
                      styles.placeholderText,
                      item.posts === 0 && styles.emptyPlaceholderText
                    ]}>
                      {(item.title || 'U').charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.boardTitle,
                item.posts === 0 && styles.emptyBoardTitle
              ]}>
                {item.title}
              </Text>
              <Text style={[
                styles.boardPosts,
                item.posts === 0 && styles.emptyBoardPosts
              ]}>
                {item.posts === 0 ? 'No posts yet' : `${item.posts} post${item.posts !== 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No location boards available</Text>
              <Text style={styles.emptySubtext}>Create a post to start a new location board!</Text>
            </View>
          }
        />

        <Text style={styles.sectionTitle}>Recent Discussions</Text>
        {discussions.length > 0 ? (
          discussions.slice(0, 10).map((d, index) => (
            <Pressable
              key={d._id || index}
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

              {d.image && <Image source={{ uri: d.image }} style={styles.discussionImage} resizeMode="cover" />}

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
                  {(() => {
                    const isReported = !!reportedMap[d._id];
                    if (isReported) {
                      return (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable accessibilityRole="button" disabled style={[styles.outlineButton, styles.outlineButtonDisabled]}>
                            <Text style={[styles.outlineButtonText, styles.outlineButtonTextDisabled]}>Reported</Text>
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
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No discussions yet</Text>
            <Text style={styles.emptySubtext}>Be the first to start a conversation!</Text>
          </View>
        )}
      </ScrollView>

      <Pressable style={({ pressed }) => [styles.fab, pressed && { backgroundColor: '#187bcd' }]} onPress={() => router.push('/create-post')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f9f9f9' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#e74c3c', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#1e90ff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerSideSpacer: { width: 72 },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  adminButton: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  tagButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  boardCard: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    width: 120,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyBoardCard: {
    opacity: 0.6,
  },
  boardImageContainer: {
    marginBottom: 8,
  },
  boardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderImage: {
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPlaceholderImage: {
    backgroundColor: '#ccc',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyPlaceholderText: {
    color: '#999',
  },
  boardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyBoardTitle: {
    color: '#999',
  },
  boardPosts: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyBoardPosts: {
    color: '#bbb',
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
    justifyContent: 'flex-end',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  outlineButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  outlineButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  outlineButtonTextDisabled: {
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default CommunityHome;