import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiUrl } from '../constants/api';
import { AuthContext } from '../context/AuthContext';
import UserProtectedRoute from '../components/UserProtectedRoute';

// ProfilePicture component (same as in community)
const ProfilePicture = ({ 
  profilePicture, 
  name = 'Anonymous', 
  size = 32,
  style = {} 
}) => {
  const getInitials = (fullName) => {
    if (!fullName || fullName === 'Anonymous') return 'A';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getImageUrl = (profilePicData) => {
    if (!profilePicData) return null;
    
    if (typeof profilePicData === 'string') {
      if (profilePicData.startsWith('http://') || profilePicData.startsWith('https://')) {
        return profilePicData;
      }
      if (profilePicData.startsWith('/uploads/')) {
        return apiUrl(profilePicData);
      }
      return apiUrl(`/uploads/profile/${profilePicData}`);
    }
    
    if (profilePicData && profilePicData.uri) {
      if (profilePicData.uri.startsWith('data:')) {
        return profilePicData.uri;
      }
      if (profilePicData.uri.startsWith('http://') || profilePicData.uri.startsWith('https://')) {
        return profilePicData.uri;
      }
      if (profilePicData.uri.startsWith('/uploads/')) {
        return apiUrl(profilePicData.uri);
      }
      return apiUrl(`/uploads/profile/${profilePicData.uri}`);
    }
    
    return null;
  };

  const getBackgroundColor = (name) => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
      '#d946ef', '#ec4899', '#f43f5e'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const imageUrl = getImageUrl(profilePicture);
  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style
  };

  if (imageUrl) {
    return (
      <View style={[profileStyles.container, containerStyle]}>
        <Image 
          source={{ uri: imageUrl }}
          style={[profileStyles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={(error) => {
            console.log('Profile picture load error:', error.nativeEvent.error);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[
      profileStyles.container, 
      containerStyle,
      { backgroundColor }
    ]}>
      <Text style={[
        profileStyles.initials, 
        { 
          fontSize: size * 0.4,
          lineHeight: size * 0.4
        }
      ]}>
        {initials}
      </Text>
    </View>
  );
};

const PostDetail = () => {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { user } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // For different post types
  const [selectedPollOption, setSelectedPollOption] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [showDonationModal, setShowDonationModal] = useState(false);

  const getCurrentUser = () => {
    if (!user) return 'Anonymous';
    return `${user.fname} ${user.lname}`.trim() || 'Anonymous';
  };

  const getCurrentUserPhone = () => {
    if (!user) return 'Anonymous';
    return user.phone;
  };

  // Helper function to construct proper image URLs
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
      return apiUrl(imagePath);
    }
    
    if (!imagePath.startsWith('/')) {
      return apiUrl(`/uploads/community/${imagePath}`);
    }
    
    return apiUrl(imagePath);
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl(`/api/discussions/${postId}`));
      
      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }

      const data = await response.json();
      setPost(data);
      setComments(data.comments || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

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

  const handleLike = async () => {
    try {
      const response = await fetch(apiUrl(`/api/discussions/${postId}/like`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: getCurrentUserPhone() }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      } else {
        Alert.alert('Error', 'Failed to like post');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      setCommenting(true);
      const response = await fetch(apiUrl(`/api/discussions/${postId}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newComment.trim(),
          author: getCurrentUserPhone(), // Send phone number to backend
          // Remove authorUsername - backend will resolve the display name
        }),
      });

      if (response.ok) {
        const addedComment = await response.json();
        setComments(prev => [...prev, addedComment]);
        setNewComment('');
        
        // Update post comment count
        setPost(prev => ({
          ...prev,
          comments: [...(prev.comments || []), addedComment]
        }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleVote = async (option) => {
    try {
      const previousVote = post.userVotes?.[getCurrentUserPhone()];
      
      const response = await fetch(apiUrl(`/api/discussions/${postId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          option,
          previousVote,
          username: getCurrentUserPhone() 
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setSelectedPollOption(option);
      } else {
        Alert.alert('Error', 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const handleRSVP = async () => {
    try {
      const currentUserPhone = getCurrentUserPhone();
      const isAlreadySignedUp = post.type === 'Event' 
        ? post.attendees?.includes(currentUserPhone)
        : post.volunteers?.includes(currentUserPhone);

      const endpoint = isAlreadySignedUp ? 'cancel-rsvp' : 'rsvp';
      
      const response = await fetch(apiUrl(`/api/discussions/${postId}/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUserPhone }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        Alert.alert(
          isAlreadySignedUp ? 'Cancelled' : 'Success',
          isAlreadySignedUp 
            ? `You're no longer signed up for this ${post.type.toLowerCase()}`
            : `You're now signed up for this ${post.type.toLowerCase()}!`
        );
      } else {
        Alert.alert('Error', 'Failed to update RSVP');
      }
    } catch (error) {
      console.error('Error with RSVP:', error);
      Alert.alert('Error', 'Failed to update RSVP');
    }
  };

  const handleDonate = async () => {
    if (!donationAmount.trim() || isNaN(donationAmount) || parseFloat(donationAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid donation amount');
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/discussions/${postId}/donate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(donationAmount),
          username: getCurrentUser()
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setDonationAmount('');
        setShowDonationModal(false);
        Alert.alert('Thank you!', 'Your donation has been recorded');
      } else {
        Alert.alert('Error', 'Failed to process donation');
      }
    } catch (error) {
      console.error('Error donating:', error);
      Alert.alert('Error', 'Failed to process donation');
    }
  };

  const handleOfferHelp = async () => {
    try {
      const currentUserPhone = getCurrentUserPhone();
      const userAlreadyOfferedHelp = post.helpers?.some(h => h.username === currentUserPhone);
      
      const endpoint = userAlreadyOfferedHelp ? 'withdraw-help' : 'offer-help';
      
      const response = await fetch(apiUrl(`/api/discussions/${postId}/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUserPhone }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        
        const message = userAlreadyOfferedHelp 
          ? 'You are no longer helping with this report.' 
          : 'Thank you! The poster will be notified that you want to help.';
        
        Alert.alert(userAlreadyOfferedHelp ? 'Help Withdrawn' : 'Help Offered', message);
      } else {
        Alert.alert('Error', 'Failed to update help status');
      }
    } catch (error) {
      console.error('Error with help action:', error);
      Alert.alert('Error', 'Failed to update help status');
    }
  };

  const handleDeletePost = async () => {
    console.log('🔴 handleDeletePost function called');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    console.log('✅ User confirmed delete - starting deletion process');
    setShowDeleteConfirm(false);
    
    try {
      console.log('📡 Making DELETE request...');
      console.log('🎯 PostID:', postId);
      console.log('👤 User:', getCurrentUser());
      console.log('📱 Phone:', getCurrentUserPhone());
      
      const requestBody = { 
        author: getCurrentUser(), 
        authorPhone: getCurrentUserPhone() 
      };
      console.log('📦 Request body:', JSON.stringify(requestBody));
      
      const url = apiUrl(`/api/discussions/${postId}`);
      console.log('🌐 Request URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📊 Response status:', response.status);
      console.log('✔️ Response ok:', response.ok);

      if (response.ok) {
        console.log('🎉 Delete successful - navigating back');
        router.push('/community');
      } else {
        console.log('❌ Delete failed - response not ok');
        const responseText = await response.text();
        console.log('📄 Response text:', responseText);
        Alert.alert('Error', 'Failed to delete post');
      }
    } catch (error) {
      console.log('💥 Exception caught in delete process:', error);
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  const cancelDelete = () => {
    console.log('❌ User cancelled delete');
    setShowDeleteConfirm(false);
  };

  const renderPostContent = () => {
    if (!post) return null;

    const getPostTypeConfig = (type) => {
      const configs = {
        Poll: { emoji: '📊', color: '#6366f1', bg: '#eef2ff' },
        Event: { emoji: '📅', color: '#059669', bg: '#ecfdf5' },
        Donation: { emoji: '💰', color: '#dc2626', bg: '#fef2f2' },
        Volunteer: { emoji: '🤝', color: '#7c3aed', bg: '#f3e8ff' },
        Report: { emoji: '🚨', color: '#ea580c', bg: '#fff7ed' },
      };
      return configs[type] || { emoji: '📄', color: '#6b7280', bg: '#f9fafb' };
    };

    const config = getPostTypeConfig(post.type);

    return (
      <View style={styles.postContent}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorSection}>
            <ProfilePicture 
              profilePicture={post.authorProfilePicture} 
              name={post.author || 'Anonymous'} 
              size={40}
              style={{ marginRight: 12 }}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.author || 'Anonymous'}</Text>
              <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
            </View>
          </View>

          {/* Post options for author */}
          {post && post.authorPhone && (post.authorPhone === getCurrentUserPhone()) && (
            <Pressable
              style={styles.optionsButton}
              onPress={() => setShowOptionsModal(true)}
            >
              <Text style={styles.optionsText}>⋮</Text>
            </Pressable>
          )}
        </View>

        {/* Post Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
          <Text style={styles.typeEmoji}>{config.emoji}</Text>
          <Text style={[styles.typeText, { color: config.color }]}>{post.type}</Text>
          {post.location && (
            <Text style={styles.locationText}>• {post.location}</Text>
          )}
        </View>

        {/* Post Title */}
        <Text style={styles.postTitle}>{post.title}</Text>

        {/* Post Description */}
        {post.description && (
          <Text style={styles.postDescription}>{post.description}</Text>
        )}

        {/* Post Image */}
        {post.image && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: getImageUrl(post.image) }}
              style={styles.postImage}
              resizeMode="cover"
            />
          </View>
        )}
      </View>
    );
  };

  const renderTypeSpecificContent = () => {
    if (!post) return null;

    switch (post.type) {
      case 'Poll':
        return renderPollContent();
      case 'Event':
        return renderEventContent();
      case 'Donation':
        return renderDonationContent();
      case 'Volunteer':
        return renderVolunteerContent();
      case 'Report':
        return renderReportContent();
      default:
        return null;
    }
  };

  const renderPollContent = () => {
    const currentUserVote = post.userVotes?.[getCurrentUserPhone()];
    let totalVotes = 0;
    
    if (post.pollVotes) {
      if (post.pollVotes instanceof Map) {
        totalVotes = Array.from(post.pollVotes.values()).reduce((sum, count) => sum + count, 0);
      } else if (typeof post.pollVotes === 'object') {
        totalVotes = Object.values(post.pollVotes).reduce((sum, count) => sum + count, 0);
      }
    }

    return (
      <View style={styles.typeSpecificContent}>
        <Text style={styles.sectionTitle}>Poll Options</Text>
        <Text style={styles.pollStats}>{totalVotes} total votes</Text>
        
        {post.pollOptions?.map((option, index) => {
          const votes = post.pollVotes?.[option] || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = currentUserVote === option;
          
          return (
            <Pressable
              key={index}
              style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
              onPress={() => handleVote(option)}
            >
              <View style={styles.pollOptionContent}>
                <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                  {option}
                </Text>
                <Text style={styles.pollOptionStats}>
                  {votes} votes ({percentage}%)
                </Text>
              </View>
              <View style={[styles.pollOptionBar, { width: `${percentage}%` }]} />
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderEventContent = () => {
    const eventDate = post.eventDate ? new Date(post.eventDate).toLocaleDateString() : 'Date TBD';
    const currentUserPhone = getCurrentUserPhone();
    const isAttending = post.attendees?.includes(currentUserPhone);
    
    return (
      <View style={styles.typeSpecificContent}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventDetail}>📅 Date: {eventDate}</Text>
          {post.eventTime && (
            <Text style={styles.eventDetail}>🕐 Time: {post.eventTime}</Text>
          )}
          <Text style={styles.eventDetail}>
            👥 {post.attendeeCount || 0} people attending
          </Text>
        </View>
        
        <Pressable
          style={[styles.actionButton, isAttending && styles.actionButtonActive]}
          onPress={handleRSVP}
        >
          <Text style={[styles.actionButtonText, isAttending && styles.actionButtonTextActive]}>
            {isAttending ? '✓ Attending' : 'RSVP to Event'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderDonationContent = () => {
    const raised = post.currentAmount || 0;
    const goal = post.goalAmount;
    const progress = goal ? Math.round((raised / goal) * 100) : 0;
    
    return (
      <View style={styles.typeSpecificContent}>
        <Text style={styles.sectionTitle}>Fundraising Campaign</Text>
        <View style={styles.donationInfo}>
          <Text style={styles.donationAmount}>৳{raised.toLocaleString()} raised</Text>
          {goal && (
            <>
              <Text style={styles.donationGoal}>of ৳{goal.toLocaleString()} goal ({progress}%)</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
              </View>
            </>
          )}
          <Text style={styles.donorCount}>
            {post.donors?.length || 0} supporters
          </Text>
        </View>
        
        <Pressable
          style={styles.actionButton}
          onPress={() => setShowDonationModal(true)}
        >
          <Text style={styles.actionButtonText}>💰 Donate Now</Text>
        </Pressable>
      </View>
    );
  };

  const renderVolunteerContent = () => {
    const currentUserPhone = getCurrentUserPhone();
    const isVolunteering = post.volunteers?.includes(currentUserPhone);
    
    return (
      <View style={styles.typeSpecificContent}>
        <Text style={styles.sectionTitle}>Volunteer Opportunity</Text>
        <View style={styles.volunteerInfo}>
          {post.skills && (
            <Text style={styles.volunteerDetail}>
              📋 Skills needed: {post.skills}
            </Text>
          )}
          <Text style={styles.volunteerDetail}>
            👥 {post.volunteerCount || 0} volunteers
            {post.volunteersNeeded && ` of ${post.volunteersNeeded} needed`}
          </Text>
        </View>
        
        <Pressable
          style={[styles.actionButton, isVolunteering && styles.actionButtonActive]}
          onPress={handleRSVP}
        >
          <Text style={[styles.actionButtonText, isVolunteering && styles.actionButtonTextActive]}>
            {isVolunteering ? '✓ Volunteering' : '🤝 Volunteer'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderReportContent = () => {
    const currentUserPhone = getCurrentUserPhone();
    const userIsHelping = post.helpers?.some(h => h.username === currentUserPhone);
    
    return (
      <View style={styles.typeSpecificContent}>
        <Text style={styles.sectionTitle}>Community Issue</Text>
        <View style={styles.reportInfo}>
          <Text style={styles.reportDetail}>
            🚨 Priority: {post.priority || 'Normal'}
          </Text>
          <Text style={styles.reportDetail}>
            🆘 {post.helperCount || 0} people offering help
          </Text>
          {!post.helpNeeded && (
            <Text style={styles.resolvedText}>✅ This issue has been resolved</Text>
          )}
        </View>
        
        {/* Only show help button if: it's a high/urgent priority report, help is needed, and it's not your own post */}
        {post.helpNeeded && 
        (post.priority === 'high' || post.priority === 'urgent') &&
        post.authorPhone !== currentUserPhone && ( // <- ADD THIS CHECK
          <Pressable
            style={[styles.actionButton, userIsHelping && styles.actionButtonActive]}
            onPress={handleOfferHelp}
          >
            <Text style={[styles.actionButtonText, userIsHelping && styles.actionButtonTextActive]}>
              {userIsHelping ? '✓ Helping' : '🆘 Offer Help'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderEngagementSection = () => {
    if (!post) return null;

    const currentUserPhone = getCurrentUserPhone();
    const isLiked = post.likes?.includes(currentUserPhone);

    return (
      <View style={styles.engagementSection}>
        <View style={styles.engagementStats}>
          <Text style={styles.statText}>❤️ {post.likes?.length || 0} likes</Text>
          <Text style={styles.statText}>💬 {comments.length} comments</Text>
        </View>
        
        <View style={styles.engagementButtons}>
          <Pressable
            style={[styles.engagementButton, isLiked && styles.engagementButtonActive]}
            onPress={handleLike}
          >
            <Text style={[styles.engagementButtonText, isLiked && styles.engagementButtonTextActive]}>
              {isLiked ? '❤️ Liked' : '🤍 Like'}
            </Text>
          </Pressable>
          
          <Pressable style={styles.engagementButton}>
            <Text style={styles.engagementButtonText}>💬 Comment</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderComment = ({ item: comment }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <ProfilePicture 
          profilePicture={comment.authorProfilePicture} 
          name={comment.author || 'Anonymous'} 
          size={32}
          style={{ marginRight: 12 }}
        />
        <View style={styles.commentInfo}>
          <Text style={styles.commentAuthor}>
            {comment.author || 'Anonymous'}
          </Text>
          <Text style={styles.commentTime}>
            {formatTimeAgo(comment.createdAt)}
          </Text>
        </View>
      </View>
      <View style={styles.commentBody}>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
    </View>
  );

  const renderCommentSection = () => (
    <View style={styles.commentSection}>
      <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
      
      {/* Comment Input */}
      <View style={styles.commentInput}>
        <ProfilePicture 
          profilePicture={user?.profilePic} 
          name={getCurrentUser()} 
          size={32}
          style={{ marginRight: 12 }}
        />
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentTextInput}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.commentSubmitButton, !newComment.trim() && styles.commentSubmitButtonDisabled]}
            onPress={handleComment}
            disabled={commenting || !newComment.trim()}
          >
            {commenting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.commentSubmitText}>Post</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Comments List */}
      <FlatList
        data={comments}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderComment}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <Text style={styles.emptyCommentsText}>No comments yet. Be the first to comment!</Text>
          </View>
        }
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading post...</Text>
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
          <Pressable style={styles.retryButton} onPress={fetchPost}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <UserProtectedRoute>
      <SafeAreaView style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/community')}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Post Details</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderPostContent()}
          {renderTypeSpecificContent()}
          {renderEngagementSection()}
          {renderCommentSection()}
        </ScrollView>

        {/* Options Modal */}
        <Modal
          visible={showOptionsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowOptionsModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.optionsModal}>
                  <Pressable
                    style={styles.optionItem}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleDeletePost();
                      console.log('🗑️ Delete Post option pressed in modal');
                    }}
                  >
                    <Text style={styles.optionText}>🗑️ Delete Post</Text>
                  </Pressable>
                  <Pressable
                    style={styles.optionItem}
                    onPress={() => {
                      setShowOptionsModal(false);
                      console.log('❌ Cancel option pressed in modal');
                    }}
                  >
                    <Text style={styles.optionText}>Cancel</Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirm}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelDelete}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.optionsModal}>
              <Text style={styles.modalTitle}>Delete Post</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete this post? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalButtonCancel}
                  onPress={cancelDelete}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalButtonConfirm}
                  onPress={confirmDelete}
                >
                  <Text style={styles.modalButtonConfirmText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Donation Modal */}
        <Modal
          visible={showDonationModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDonationModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowDonationModal(false)}>
            <View style={styles.donationModal}>
              <Text style={styles.modalTitle}>Make a Donation</Text>
              <TextInput
                style={styles.donationInput}
                placeholder="Enter amount (৳)"
                value={donationAmount}
                onChangeText={setDonationAmount}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    setShowDonationModal(false);
                    setDonationAmount('');
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalButtonConfirm}
                  onPress={handleDonate}
                >
                  <Text style={styles.modalButtonConfirmText}>Donate</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </UserProtectedRoute>
  );
};

// Profile Picture Styles
const profileStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

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

  // Header
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
  headerSpacer: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
  },

  // Post Content
  postContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  postTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  optionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsText: {
    fontSize: 18,
    color: '#64748b',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  typeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    lineHeight: 32,
    marginBottom: 12,
  },
  postDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 250,
  },

  // Type-specific Content
  typeSpecificContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },

  // Poll Styles
  pollStats: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  pollOption: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  pollOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  pollOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  pollOptionStats: {
    fontSize: 14,
    color: '#64748b',
  },
  pollOptionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
    opacity: 0.1,
  },

  // Event Styles
  eventInfo: {
    marginBottom: 16,
  },
  eventDetail: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 24,
  },

  // Donation Styles
  donationInfo: {
    marginBottom: 16,
  },
  donationAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  donationGoal: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#059669',
  },
  donorCount: {
    fontSize: 14,
    color: '#64748b',
  },

  // Volunteer Styles
  volunteerInfo: {
    marginBottom: 16,
  },
  volunteerDetail: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 24,
  },

  // Report Styles
  reportInfo: {
    marginBottom: 16,
  },
  reportDetail: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 24,
  },
  resolvedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },

  // Action Button
  actionButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextActive: {
    color: '#fff',
  },

  // Engagement Section
  engagementSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
  },
  engagementButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  engagementButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  engagementButtonActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  engagementButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  engagementButtonTextActive: {
    color: '#dc2626',
  },

  // Comment Section
  commentSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  commentInput: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    maxHeight: 100,
    paddingVertical: 8,
  },
  commentSubmitButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  commentSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Comment Item
  commentContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  commentTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  commentBody: {
    paddingLeft: 44,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  commentSeparator: {
    height: 8,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  optionItem: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  optionText: {
    fontSize: 16,
    color: '#1e293b',
  },
  donationModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  donationInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f8fafc',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PostDetail;