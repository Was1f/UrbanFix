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
      const boardsRes = await fetch(apiUrl('/api/boards'));
      const boardsData = await boardsRes.json();

      const discussionsRes = await fetch(apiUrl('/api/discussions'));
      const discussionsData = await discussionsRes.json();

      setBoards(boardsData);
      setDiscussions(discussionsData);

      const nextReported = {};
      discussionsData.forEach((disc) => {
        if (disc?.status === 'flagged') {
          nextReported[disc._id] = true;
        }
      });
      setReportedMap(nextReported);
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
    router.push(`/discussions?location=${encodeURIComponent(board.title)}`);
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
    setLoading(true);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading...</Text>
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
              style={({ pressed }) => [styles.boardCard, pressed && { transform: [{ scale: 0.97 }] }]}
              onPress={() => handleBoardPress(item)}
            >
              <View style={styles.boardImageContainer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.boardImage} />
                ) : (
                  <View style={[styles.boardImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>{(item.title || 'U').charAt(0)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.boardTitle}>{item.title}</Text>
              <Text style={styles.boardPosts}>{item.posts || 0} post{(item.posts || 0) !== 1 ? 's' : ''}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No location boards available</Text>
            </View>
          }
        />

        <Text style={styles.sectionTitle}>Recent Discussions</Text>
        {discussions.length > 0 ? (
          discussions.slice(0, 10).map((d, index) => (
            <View style={styles.discussionCard} key={d._id || index}>
              <View style={styles.discussionHeader}>
                <View style={styles.typePill}>
                  <Text style={styles.typeText}>{d.type}</Text>
                </View>
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
                <Text style={styles.discussionAuthor}>
                  By {d.author || 'Anonymous'} • {formatTimeAgo(d.createdAt || d.time)}
                </Text>
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
            </View>
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
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
  },
  adminButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    minWidth: 72,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  adminButtonText: { color: '#000', fontWeight: '600' },
  tagsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  tagButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: '#000', fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    color: '#1e1e1e',
  },
  boardCard: {
    width: width * 0.4,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginLeft: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  boardImageContainer: { width: '100%', height: 80, marginBottom: 8 },
  boardImage: { width: '100%', height: '100%', borderRadius: 8, resizeMode: 'cover' },
  placeholderImage: { backgroundColor: '#1e90ff', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  boardTitle: { fontWeight: '600', fontSize: 15, color: '#1e1e1e', marginBottom: 4 },
  boardPosts: { fontSize: 12, color: '#666' },
  discussionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  discussionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  typePill: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 12, color: '#000', fontWeight: '600' },
  locationText: { fontSize: 12, color: '#666', fontWeight: '500' },
  discussionImage: { width: '100%', height: 120, resizeMode: 'cover' },
  discussionContent: { padding: 12 },
  discussionTitle: { fontWeight: '600', fontSize: 16, color: '#1e1e1e', marginBottom: 4 },
  discussionDescription: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  discussionAuthor: { fontSize: 12, color: '#999' },
  actionsRow: { marginTop: 8, flexDirection: 'row' },
  outlineButton: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#000',
    alignSelf: 'flex-start',
  },
  outlineButtonDisabled: {
    backgroundColor: '#f2f2f2',
    borderColor: '#999',
  },
  outlineButtonText: { color: '#000', fontWeight: '600', fontSize: 12 },
  outlineButtonTextDisabled: { color: '#666' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666', fontWeight: '500', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
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
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300' },
});

export default CommunityHome;


