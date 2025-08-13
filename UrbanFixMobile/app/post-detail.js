import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiUrl } from '../constants/api';

const PostDetail = () => {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [reportedMap, setReportedMap] = useState({});
  const [userVote, setUserVote] = useState(null);
  const [userRSVP, setUserRSVP] = useState(false);

  const fetchPostData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [postRes, commentsRes] = await Promise.all([
        fetch(apiUrl(`/api/discussions/${postId}`)),
        fetch(apiUrl(`/api/discussions/${postId}/comments`))
      ]);

      if (!postRes.ok) {
        throw new Error('Failed to fetch post');
      }

      const [postData, commentsData] = await Promise.all([
        postRes.json(),
        commentsRes.ok ? commentsRes.json() : []
      ]);

      setPost(postData);
      setComments(commentsData);

      // Set user interaction states (in real app, get from user auth)
      if (postData.type === 'Poll') {
        setUserVote(postData.userVote || null);
      }
      if (['Event', 'Volunteer'].includes(postData.type)) {
        setUserRSVP(postData.userRSVP || false);
      }

      // Map reported items
      const nextReported = {};
      if (postData?.status === 'flagged') {
        nextReported[postData._id] = true;
      }
      commentsData.forEach((comment) => {
        if (comment?.status === 'flagged') {
          nextReported[comment._id] = true;
        }
      });
      setReportedMap(nextReported);
      
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostData();
  }, [fetchPostData]);

  useFocusEffect(
    useCallback(() => {
      fetchPostData();
    }, [fetchPostData])
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(post?.eventTime && { hour: '2-digit', minute: '2-digit' })
    });
  };

  const handleVote = async (option) => {
    if (userVote === option) return; // Already voted for this option

    try {
      const response = await fetch(apiUrl(`/api/discussions/${postId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option,
          previousVote: userVote,
          username: 'Anonymous'
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setUserVote(option);
        Alert.alert('Success', 'Vote recorded!');
      } else {
        throw new Error('Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Failed to record vote');
    }
  };

  const handleRSVP = async () => {
    try {
      const endpoint = userRSVP ? 'cancel-rsvp' : 'rsvp';
      const response = await fetch(apiUrl(`/api/discussions/${postId}/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Anonymous' }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setUserRSVP(!userRSVP);
        Alert.alert('Success', userRSVP ? 'RSVP cancelled' : 'RSVP confirmed!');
      } else {
        throw new Error('Failed to update RSVP');
      }
    } catch (error) {
      console.error('Error with RSVP:', error);
      Alert.alert('Error', 'Failed to update RSVP');
    }
  };

  const handleDonate = () => {
    Alert.prompt(
      'Make a Donation',
      'Enter donation amount (BDT):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Donate',
          onPress: async (amount) => {
            if (!amount || isNaN(amount)) {
              Alert.alert('Error', 'Please enter a valid amount');
              return;
            }
            
            try {
              const response = await fetch(apiUrl(`/api/discussions/${postId}/donate`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: parseFloat(amount),
                  username: 'Anonymous'
                }),
              });

              if (response.ok) {
                const updatedPost = await response.json();
                setPost(updatedPost);
                Alert.alert('Success', `Thank you for your donation of ৳${amount}!`);
              } else {
                throw new Error('Failed to process donation');
              }
            } catch (error) {
              console.error('Error donating:', error);
              Alert.alert('Error', 'Failed to process donation');
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setCommentLoading(true);
      
      const response = await fetch(apiUrl(`/api/discussions/${postId}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          author: 'Anonymous',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const newCommentData = await response.json();
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
      
      Alert.alert('Success', 'Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const renderPollSection = () => {
    if (post.type !== 'Poll' || !post.pollOptions) return null;

    const totalVotes = Object.values(post.pollVotes || {}).reduce((sum, count) => sum + count, 0);
    const showResults = !post.pollPrivate || totalVotes > 0;

    return (
      <View style={styles.pollSection}>
        <Text style={styles.sectionTitle}>Poll Options</Text>
        {post.pollOptions.map((option, index) => {
          const votes = post.pollVotes?.[option] || 0;
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const isSelected = userVote === option;

          return (
            <Pressable
              key={index}
              style={[
                styles.pollOption,
                isSelected && styles.pollOptionSelected
              ]}
              onPress={() => handleVote(option)}
            >
              <View style={styles.pollOptionContent}>
                <Text style={[
                  styles.pollOptionText,
                  isSelected && styles.pollOptionTextSelected
                ]}>
                  {option}
                </Text>
                {showResults && (
                  <View style={styles.pollResults}>
                    <Text style={styles.pollPercentage}>{percentage.toFixed(1)}%</Text>
                    <Text style={styles.pollVotes}>({votes} votes)</Text>
                  </View>
                )}
              </View>
              {showResults && (
                <View style={styles.pollBar}>
                  <View 
                    style={[
                      styles.pollBarFill, 
                      { width: `${percentage}%` },
                      isSelected && styles.pollBarFillSelected
                    ]} 
                  />
                </View>
              )}
            </Pressable>
          );
        })}
        <Text style={styles.totalVotes}>Total votes: {totalVotes}</Text>
      </View>
    );
  };

  const renderEventSection = () => {
    if (post.type !== 'Event') return null;

    return (
      <View style={styles.eventSection}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <Text style={styles.eventDate}>📅 {formatDate(post.eventDate)}</Text>
        {post.eventTime && (
          <Text style={styles.eventTime}>🕐 {post.eventTime}</Text>
        )}
        <Text style={styles.attendeeCount}>👥 {post.attendeeCount || 0} attending</Text>
        
        <Pressable
          style={[
            styles.rsvpButton,
            userRSVP && styles.rsvpButtonActive
          ]}
          onPress={handleRSVP}
        >
          <Text style={[
            styles.rsvpButtonText,
            userRSVP && styles.rsvpButtonTextActive
          ]}>
            {userRSVP ? 'Cancel RSVP' : 'RSVP to Event'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderDonationSection = () => {
    if (post.type !== 'Donation') return null;

    const progress = post.goalAmount ? (post.currentAmount / post.goalAmount) * 100 : 0;

    return (
      <View style={styles.donationSection}>
        <Text style={styles.sectionTitle}>Donation Campaign</Text>
        
        <View style={styles.donationStats}>
          <Text style={styles.currentAmount}>
            Raised: ৳{(post.currentAmount || 0).toLocaleString()}
          </Text>
          {post.goalAmount && (
            <Text style={styles.goalAmount}>
              Goal: ৳{post.goalAmount.toLocaleString()}
            </Text>
          )}
        </View>

        {post.goalAmount && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        )}

        <Text style={styles.donorCount}>
          {post.donors?.length || 0} donors
        </Text>

        <Pressable style={styles.donateButton} onPress={handleDonate}>
          <Text style={styles.donateButtonText}>💰 Donate</Text>
        </Pressable>
      </View>
    );
  };

  const renderVolunteerSection = () => {
    if (post.type !== 'Volunteer') return null;

    return (
      <View style={styles.volunteerSection}>
        <Text style={styles.sectionTitle}>Volunteer Campaign</Text>
        
        {post.volunteersNeeded && (
          <Text style={styles.volunteersNeeded}>
            Volunteers needed: {post.volunteersNeeded}
          </Text>
        )}
        
        <Text style={styles.volunteerCount}>
          {post.volunteerCount || 0} volunteers signed up
        </Text>

        {post.skills && (
          <Text style={styles.skills}>
            Required skills: {post.skills}
          </Text>
        )}

        <Pressable
          style={[
            styles.volunteerButton,
            userRSVP && styles.volunteerButtonActive
          ]}
          onPress={handleRSVP}
        >
          <Text style={[
            styles.volunteerButtonText,
            userRSVP && styles.volunteerButtonTextActive
          ]}>
            {userRSVP ? 'Cancel Volunteer' : '🤝 Volunteer'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderReportSection = () => {
    if (post.type !== 'Report') return null;

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Community Report</Text>
        <Text style={styles.reportNote}>
          This is a community report. Help resolve this issue by commenting below.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        <Pressable style={styles.retryButton} onPress={fetchPostData}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.headerBar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{post.type}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Post Card */}
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.typePill}>
                <Text style={styles.typeText}>{post.type}</Text>
              </View>
              {post.location && (
                <Text style={styles.locationText}>📍 {post.location}</Text>
              )}
            </View>

            {post.image && (
              <Image source={{ uri: post.image }} style={styles.postImage} />
            )}

            <View style={styles.postContent}>
              <Text style={styles.postTitle}>{post.title}</Text>
              {post.description && (
                <Text style={styles.postDescription}>{post.description}</Text>
              )}
              <Text style={styles.postAuthor}>
                By {post.author || 'Anonymous'} • {formatTimeAgo(post.createdAt || post.time)}
              </Text>
            </View>

            {/* Type-specific sections */}
            {renderPollSection()}
            {renderEventSection()}
            {renderDonationSection()}
            {renderVolunteerSection()}
            {renderReportSection()}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments ({comments.length})
            </Text>
            
            {comments.map((comment) => (
              <View key={comment._id} style={styles.commentCard}>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <View style={styles.commentFooter}>
                  <Text style={styles.commentAuthor}>
                    {comment.author || 'Anonymous'} • {formatTimeAgo(comment.createdAt)}
                  </Text>
                </View>
              </View>
            ))}

            {comments.length === 0 && (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to join the conversation!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!newComment.trim() || commentLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || commentLoading}
          >
            {commentLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header styles
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerSpacer: {
    width: 50,
  },

  // Loading and error states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Main content styles
  scrollView: {
    flex: 1,
  },
  postCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  typePill: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  postImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  postContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    lineHeight: 26,
  },
  postDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  postAuthor: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },

  // Section styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  // Poll styles
  pollSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  pollOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pollOptionSelected: {
    borderColor: '#1e90ff',
    backgroundColor: '#e3f2fd',
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pollOptionTextSelected: {
    color: '#1e90ff',
    fontWeight: '600',
  },
  pollResults: {
    alignItems: 'flex-end',
  },
  pollPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  pollVotes: {
    fontSize: 12,
    color: '#666',
  },
  pollBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  pollBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 2,
  },
  pollBarFillSelected: {
    backgroundColor: '#1e90ff',
  },
  totalVotes: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },

  // Event styles
  eventSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  eventDate: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  attendeeCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  rsvpButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  rsvpButtonActive: {
    backgroundColor: '#dc3545',
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rsvpButtonTextActive: {
    color: '#fff',
  },

  // Donation styles
  donationSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  donationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28a745',
  },
  goalAmount: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  donorCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  donateButton: {
    backgroundColor: '#ffc107',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  donateButtonText: {
    color: '#212529',
    fontSize: 16,
    fontWeight: '600',
  },

  // Volunteer styles
  volunteerSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  volunteersNeeded: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  volunteerCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  skills: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  volunteerButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  volunteerButtonActive: {
    backgroundColor: '#dc3545',
  },
  volunteerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  volunteerButtonTextActive: {
    color: '#fff',
  },

  // Report styles
  reportSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reportNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Comments styles
  commentsSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  commentContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#999',
  },

  // Comment input styles
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PostDetail;