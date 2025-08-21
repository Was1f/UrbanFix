import React, { useEffect, useState, useCallback, useContext } from 'react';
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
import UserProtectedRoute from '../components/UserProtectedRoute';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const CommunityHome = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [boards, setBoards] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportedMap, setReportedMap] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Get current user info
  const getCurrentUser = () => {
    if (!user) return 'Anonymous';
    return user.phone; // Use phone as unique identifier since it's unique in your system
  };

  // Helper function to construct proper image URLs
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If it starts with /uploads, construct the full URL
    if (imagePath.startsWith('/uploads/')) {
      return apiUrl(imagePath);
    }
    
    // If it's just a filename, assume it's in uploads/community
    if (!imagePath.startsWith('/')) {
      return apiUrl(`/uploads/community/${imagePath}`);
    }
    
    // Default case
    return apiUrl(imagePath);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
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
    // Ensure we have a valid post ID
    if (!post._id) {
      Alert.alert('Error', 'Invalid post data');
      return;
    }
    
    console.log('Navigating to post:', post._id); // Debug log
    console.log('Full post object:', post); // Debug log
    
    // Try both navigation methods
    try {
      router.push(`/post-detail?postId=${post._id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      router.push({
        pathname: '/post-detail',
        params: { postId: post._id }
      });
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
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

  const handleOfferHelp = async (discussionId) => {
    try {
      const currentUserName = getCurrentUser();
      
      // Find the current discussion to check if user already offered help
      const currentDiscussion = discussions.find(d => d._id === discussionId);
      const userAlreadyOfferedHelp = currentDiscussion?.helpers?.some(h => h.username === currentUserName);
      
      // Choose the correct endpoint based on current state
      const endpoint = userAlreadyOfferedHelp ? 'withdraw-help' : 'offer-help';
      
      const response = await fetch(apiUrl(`/api/discussions/${discussionId}/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUserName }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        // Update the discussions state with the new helper count
        setDiscussions(prev => prev.map(d => 
          d._id === discussionId ? updatedPost : d
        ));
        
        const message = userAlreadyOfferedHelp 
          ? 'You are no longer helping with this report.' 
          : 'Thank you! The poster will be notified that you want to help.';
        
        Alert.alert(userAlreadyOfferedHelp ? 'Help Withdrawn' : 'Help Offered', message);
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.message || 'Failed to update help status');
      }
    } catch (error) {
      console.error('Error with help action:', error);
      Alert.alert('Error', 'Failed to update help status');
    }
  };

  const getPostTypeConfig = (type) => {
    const configs = {
      Poll: { emoji: '📊', color: '#6366f1', bg: '#eef2ff' },
      Event: { emoji: '📅', color: '#059669', bg: '#ecfdf5' },
      Donation: { emoji: '💝', color: '#dc2626', bg: '#fef2f2' },
      Volunteer: { emoji: '🤝', color: '#7c3aed', bg: '#f3e8ff' },
      Report: { emoji: '🚨', color: '#ea580c', bg: '#fff7ed' }, // Changed to emergency/alert emoji
    };
    return configs[type] || { emoji: '📝', color: '#6b7280', bg: '#f9fafb' };
  };

  const renderPostTypeIndicator = (post) => {
    const config = getPostTypeConfig(post.type);
    return (
      <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.typeEmoji]}>{config.emoji}</Text>
        <Text style={[styles.typeText, { color: config.color }]}>{post.type}</Text>
      </View>
    );
  };

  const renderPostPreview = (post) => {
    switch (post.type) {
      case 'Poll':
        let totalVotes = 0;
        if (post.pollVotes) {
          if (post.pollVotes instanceof Map) {
            totalVotes = Array.from(post.pollVotes.values()).reduce((sum, count) => sum + count, 0);
          } else if (typeof post.pollVotes === 'object') {
            totalVotes = Object.values(post.pollVotes).reduce((sum, count) => sum + count, 0);
          }
        }
        return (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>{totalVotes} votes • {post.pollOptions?.length || 0} options</Text>
          </View>
        );
      
      case 'Event':
        const eventDate = post.eventDate ? new Date(post.eventDate).toLocaleDateString() : 'Date TBD';
        return (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>{eventDate} • {post.attendeeCount || 0} attending</Text>
          </View>
        );
      
      case 'Donation':
        const raised = post.currentAmount || 0;
        const goal = post.goalAmount;
        const progress = goal ? Math.round((raised / goal) * 100) : 0;
        return (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>
              ৳{raised.toLocaleString()} raised{goal ? ` (${progress}%)` : ''}
            </Text>
          </View>
        );
      
      case 'Volunteer':
        const volunteersText = post.volunteersNeeded ? 
          ` of ${post.volunteersNeeded} needed` : '';
        return (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>
              {post.volunteerCount || 0} volunteers{volunteersText}
            </Text>
          </View>
        );
      
      case 'Report':
        const priorityLabel = post.priority && post.priority !== 'normal' ? 
          ` • ${post.priority.charAt(0).toUpperCase() + post.priority.slice(1)} Priority` : '';
        
        return (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>
              🚨 Community issue{priorityLabel} • {post.helperCount || 0} people helping
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderImageWithFallback = (imagePath, style) => {
    const imageUrl = getImageUrl(imagePath);
    
    if (!imageUrl) return null;

    return (
      <Image 
        source={{ uri: imageUrl }} 
        style={style}
        onError={(error) => {
          console.log('Image load error:', error.nativeEvent.error);
          console.log('Failed image URL:', imageUrl);
        }}
        onLoad={() => {
          console.log('Image loaded successfully:', imageUrl);
        }}
        resizeMode="cover"
      />
    );
  };

  const getFilteredDiscussions = () => {
    let filtered = discussions;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.author?.toLowerCase().includes(query)
      );
    }
    
    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(d => d.location === selectedLocation);
    }
    
    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(d => d.type === selectedType);
    }
    
    // Filter by active filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(d => d.type.toLowerCase() === activeFilter);
    }
    
    return filtered;
  };

  const filters = [
    { key: 'all', label: 'All', emoji: '📋' },
    { key: 'poll', label: 'Polls', emoji: '📊' },
    { key: 'event', label: 'Events', emoji: '📅' },
    { key: 'donation', label: 'Help', emoji: '💝' },
    { key: 'volunteer', label: 'Volunteer', emoji: '🤝' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={retryFetch}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <UserProtectedRoute>
      <SafeAreaView style={styles.page}>
        {/* Simplified Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/user-homepage')}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Community</Text>
          </View>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/admin-login')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Filter Tabs - Moved to top for easy access */}
          <View style={styles.filterSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {filters.map((filter) => (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterTab,
                    activeFilter === filter.key && styles.filterTabActive
                  ]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text style={styles.filterEmoji}>{filter.emoji}</Text>
                  <Text style={[
                    styles.filterText,
                    activeFilter === filter.key && styles.filterTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Location Selection - Simplified */}
          {boards.length > 0 && (
            <View style={styles.locationSection}>
              <Text style={styles.sectionLabel}>Browse by area:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.locationContainer}
              >
                <Pressable
                  style={[
                    styles.locationChip,
                    !selectedLocation && styles.locationChipSelected
                  ]}
                  onPress={() => setSelectedLocation('')}
                >
                  <Text style={[
                    styles.locationChipText,
                    !selectedLocation && styles.locationChipTextSelected
                  ]}>
                    All Areas
                  </Text>
                </Pressable>
                {boards.map((board) => (
                  <Pressable
                    key={board._id}
                    style={[
                      styles.locationChip,
                      selectedLocation === board.title && styles.locationChipSelected
                    ]}
                    onPress={() => setSelectedLocation(board.title)}
                  >
                    <Text style={[
                      styles.locationChipText,
                      selectedLocation === board.title && styles.locationChipTextSelected
                    ]}>
                      📍 {board.title}
                      {board.posts > 0 && (
                        <Text style={styles.postCount}> ({board.posts})</Text>
                      )}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Posts List */}
          <View style={styles.postsSection}>
            {getFilteredDiscussions().length > 0 ? (
              <FlatList
                data={getFilteredDiscussions()}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.postsList}
                renderItem={({ item: discussion }) => (
                  <Pressable
                    style={styles.postCard}
                    onPress={() => handlePostPress(discussion)}
                  >
                    {/* Post Header */}
                    <View style={styles.postHeader}>
                      <View style={styles.postHeaderLeft}>
                        {renderPostTypeIndicator(discussion)}
                        {discussion.location && (
                          <Text style={styles.locationTag}>📍 {discussion.location}</Text>
                        )}
                      </View>
                      <Text style={styles.timeText}>{formatTimeAgo(discussion.createdAt)}</Text>
                    </View>

                    {/* Post Title */}
                    <Text style={styles.postTitle} numberOfLines={2}>
                      {discussion.title}
                    </Text>

                    {/* Post Description */}
                    {discussion.description && (
                      <Text style={styles.postDescription} numberOfLines={2}>
                        {discussion.description}
                      </Text>
                    )}

                    {/* Post Image */}
                    {discussion.image && (
                      <View style={styles.imageContainer}>
                        {renderImageWithFallback(discussion.image, styles.postImage)}
                      </View>
                    )}

                    {/* Post Preview Info */}
                    {renderPostPreview(discussion)}

                    {/* Post Footer */}
                    <View style={styles.postFooter}>
                      <View style={styles.postMeta}>
                        <Text style={styles.authorText}>By {discussion.author || 'Anonymous'}</Text>
                        <Text style={styles.commentsText}>
                          💬 {discussion.comments?.length || 0} replies
                        </Text>
                      </View>
                      
                      <View style={styles.actionButtons}>
                        {/* Special Help button for Reports with high priority */}
                        {discussion.type === 'Report' && (discussion.priority === 'high' || discussion.priority === 'urgent') && (() => {
                          const currentUserName = getCurrentUser();
                          const userIsHelping = discussion.helpers?.some(h => h.username === currentUserName);
                          
                          return (
                            <Pressable
                              style={[
                                styles.helpButton,
                                userIsHelping && styles.helpButtonActive
                              ]}
                              onPress={() => handleOfferHelp(discussion._id)}
                            >
                              <Text style={[
                                styles.helpButtonText,
                                userIsHelping && styles.helpButtonTextActive
                              ]}>
                                {userIsHelping ? '✓ Helping' : '🆘 Help'}
                              </Text>
                            </Pressable>
                          );
                        })()}
                        
                        <Pressable
                          style={[
                            styles.reportButton,
                            reportedMap[discussion._id] && styles.reportButtonReported
                          ]}
                          onPress={() => {
                            const isReported = !!reportedMap[discussion._id];
                            isReported ? handleRevoke(discussion._id) : handleReport(discussion._id);
                          }}
                        >
                          <Text style={[
                            styles.reportButtonText,
                            reportedMap[discussion._id] && styles.reportButtonTextReported
                          ]}>
                            {reportedMap[discussion._id] ? '✓' : '⚠️'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>💭</Text>
                    <Text style={styles.emptyTitle}>No posts found</Text>
                    <Text style={styles.emptySubtitle}>Try changing your filters or be the first to post!</Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💭</Text>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>Start the conversation!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Create Post Button */}
        <Pressable 
          style={styles.createButton} 
          onPress={() => router.push('/create-post')}
        >
          <Text style={styles.createButtonText}>+ Create Post</Text>
        </Pressable>
      </SafeAreaView>
    </UserProtectedRoute>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Loading & Error States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Header - Simplified
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#64748b',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 16,
  },

  // Content Layout
  content: {
    flex: 1,
  },

  // Filters - Moved to top
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterContainer: {
    paddingHorizontal: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Location Selection - Simplified
  locationSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  locationContainer: {
    gap: 8,
  },
  locationChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  locationChipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  locationChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  locationChipTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  postCount: {
    color: '#94a3b8',
    fontSize: 12,
  },

  // Posts Section
  postsSection: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  postsList: {
    padding: 20,
    paddingBottom: 100,
  },

  // Post Cards - Cleaner design
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationTag: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 180,
  },
  previewContainer: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postMeta: {
    flex: 1,
  },
  authorText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  commentsText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  helpButtonActive: {
    backgroundColor: '#22c55e',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  helpButtonTextActive: {
    color: '#fff',
  },
  reportButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonReported: {
    backgroundColor: '#dcfce7',
  },
  reportButtonText: {
    fontSize: 12,
  },
  reportButtonTextReported: {
    color: '#16a34a',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Create Button - Better positioned
  createButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
export default CommunityHome;