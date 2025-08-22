import React, { useEffect, useState, useCallback, useContext } from 'react';
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
  Share,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av'; // Fixed import
import { apiUrl } from '../constants/api';
import { AuthContext } from '../context/AuthContext';

const PostDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  
  // Extract postId from params, handling both string and array cases
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  
  console.log('PostDetail - Received params:', params);
  console.log('PostDetail - Extracted postId:', postId);
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [reportedMap, setReportedMap] = useState({});
  const [userVote, setUserVote] = useState(null);
  const [userRSVP, setUserRSVP] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(true);

  // Get current user info
  const getCurrentUser = () => {
    if (!user) return 'Anonymous';
    return `${user.fname} ${user.lname}`; // Use full name as unique identifier
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

  // Helper function to construct proper media URLs
  const getMediaUrl = (mediaPath, mediaType) => {
    if (!mediaPath) return null;
    
    // If it's already a full URL, return as is
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return mediaPath;
    }
    
    // If it starts with /uploads, construct the full URL
    if (mediaPath.startsWith('/uploads/')) {
      return apiUrl(mediaPath);
    }
    
    // If it's just a filename, construct path based on media type
    if (!mediaPath.startsWith('/')) {
      if (mediaType === 'audio') {
        return apiUrl(`/uploads/community/audio/${mediaPath}`);
      } else if (mediaType === 'video') {
        return apiUrl(`/uploads/community/video/${mediaPath}`);
      } else {
        return apiUrl(`/uploads/community/${mediaPath}`);
      }
    }
    
    // Default case
    return apiUrl(mediaPath);
  };

  const fetchPostData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Fetching data for postId:', postId);
      
      // Validate postId before making requests
      if (!postId || postId === 'undefined' || postId === 'null' || postId.length < 10) {
        throw new Error('Invalid post ID provided');
      }
      
      const postUrl = apiUrl(`/api/discussions/${postId}`);
      const commentsUrl = apiUrl(`/api/discussions/${postId}/comments`);
      
      console.log('Fetching from URLs:', postUrl, commentsUrl);
      
      const [postRes, commentsRes] = await Promise.all([
        fetch(postUrl),
        fetch(commentsUrl)
      ]);

      console.log('Response status - Post:', postRes.status, 'Comments:', commentsRes.status);

      if (!postRes.ok) {
        if (postRes.status === 400) {
          throw new Error('Invalid post ID format');
        } else if (postRes.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error(`Failed to fetch post (${postRes.status})`);
      }

      const [postData, commentsData] = await Promise.all([
        postRes.json(),
        commentsRes.ok ? commentsRes.json() : []
      ]);

      console.log('Fetched post data:', postData?._id);
      console.log('Post image URL:', postData?.image);
      console.log('Post audio URL:', postData?.audio);
      console.log('Post video URL:', postData?.video);
      console.log('Fetched comments count:', commentsData?.length);

      setPost(postData);
      setComments(commentsData);
      setLikeCount(postData.likes?.length || 0);
      setIsLiked(postData.likes?.includes(getCurrentUser()) || false);

      // Set user interaction states based on current user
      const currentUser = getCurrentUser();
      
      if (postData.type === 'Poll' && postData.userVotes) {
        const userVoteEntry = Object.entries(postData.userVotes || {}).find(([userId]) => userId === currentUser);
        setUserVote(userVoteEntry ? userVoteEntry[1] : null);
      }
      
      if (['Event', 'Volunteer'].includes(postData.type)) {
        const hasRSVP = postData.type === 'Event' 
          ? (postData.attendees || []).includes(currentUser)
          : (postData.volunteers || []).includes(currentUser);
        setUserRSVP(hasRSVP);
      }

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
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostData();
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
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
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
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

  const getPriorityConfig = (priority) => {
    const configs = {
      'low': { color: '#22c55e', bg: '#dcfce7', label: 'Low Priority' },
      'medium': { color: '#eab308', bg: '#fef3c7', label: 'Medium Priority' },
      'high': { color: '#f97316', bg: '#fed7aa', label: 'High Priority' },
      'urgent': { color: '#ef4444', bg: '#fee2e2', label: 'Urgent' },
    };
    return configs[priority] || { color: '#6b7280', bg: '#f3f4f6', label: 'Normal' };
  };

  const handleLike = async () => {
    try {
      // Validate postId before making request
      if (!postId || postId === 'undefined' || postId === 'null') {
        Alert.alert('Error', 'Invalid post ID');
        return;
      }
      
      const response = await fetch(apiUrl(`/api/discussions/${postId}/like`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: getCurrentUser() }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setIsLiked(!isLiked);
        setLikeCount(updatedPost.likes?.length || 0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to like post');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', error.message || 'Failed to like post');
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this post: ${post.title}\n\n${post.description || ''}\n\nShared via UrbanFix Community`,
        title: post.title,
        url: `https://urbanfix.app/post/${postId}`, // Replace with your actual app URL
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleVote = async (option) => {
    if (userVote === option) return;

    try {
      // Validate postId
      if (!postId || postId === 'undefined' || postId === 'null') {
        Alert.alert('Error', 'Invalid post ID');
        return;
      }
      
      const response = await fetch(apiUrl(`/api/discussions/${postId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option,
          previousVote: userVote,
          username: getCurrentUser()
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setUserVote(option);
        Alert.alert('Success', 'Vote recorded!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', error.message || 'Failed to record vote');
    }
  };

  const handleRSVP = async () => {
    try {
      // Validate postId
      if (!postId || postId === 'undefined' || postId === 'null') {
        Alert.alert('Error', 'Invalid post ID');
        return;
      }
      
      const endpoint = userRSVP ? 'cancel-rsvp' : 'rsvp';
      const response = await fetch(apiUrl(`/api/discussions/${postId}/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: getCurrentUser() }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setUserRSVP(!userRSVP);
        Alert.alert('Success', userRSVP ? 'RSVP cancelled' : 'RSVP confirmed!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update RSVP');
      }
    } catch (error) {
      console.error('Error with RSVP:', error);
      Alert.alert('Error', error.message || 'Failed to update RSVP');
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
                  username: getCurrentUser()
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

  const handlePlayAudio = async () => {
    if (!post.audio) {
      Alert.alert('No Audio', 'This post does not have an audio file.');
      return;
    }

    try {
      setAudioError(null);
      
      // For web platform, use HTML5 audio
      if (Platform.OS === 'web') {
        const audioUrl = getMediaUrl(post.audio, 'audio');
        const audio = new window.Audio(audioUrl);
        
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          audio.play();
          setIsPlaying(true);
          
          // Handle when audio finishes
          audio.addEventListener('ended', () => {
            setIsPlaying(false);
          });
        }
        return;
      }

      // For mobile platforms, use expo-av
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      const audioUrl = getMediaUrl(post.audio, 'audio');
      console.log('Playing audio from URL:', audioUrl);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioError('Failed to play audio');
      Alert.alert('Audio Error', 'Failed to play audio file. Please check the audio URL.');
    }
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
          author: getCurrentUser(),
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

  const renderPriorityBadge = () => {
    if (!post.priority || post.priority === 'normal') return null;
    
    const config = getPriorityConfig(post.priority);
    return (
      <View style={[styles.priorityBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.priorityText, { color: config.color }]}>
          ⚡ {config.label}
        </Text>
      </View>
    );
  };

  const handleDeletePost = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeletePost
        }
      ]
    );
  };

  const confirmDeletePost = async () => {
    try {
      const response = await fetch(apiUrl(`/api/discussions/${postId}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: getCurrentUser() })
      });

      if (response.ok) {
        Alert.alert('Success', 'Post deleted successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', error.message || 'Failed to delete post');
    }
  };

  const renderMediaContent = () => {
    // Render image if present
    if (post.image) {
      return (
        <Image 
          source={{ uri: getImageUrl(post.image) }} 
          style={styles.postImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Image load error:', error.nativeEvent.error);
            console.log('Failed image URL:', getImageUrl(post.image));
            console.log('Original image path:', post.image);
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', getImageUrl(post.image));
          }}
        />
      );
    }
    
    // Render video placeholder if present
    if (post.video) {
      return (
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoIcon}>🎥</Text>
            <Text style={styles.videoText}>Video Content</Text>
            <Text style={styles.videoSubtext}>Tap to view video</Text>
          </View>
        </View>
      );
    }
    
    return null;
  };

  const renderPollSection = () => {
    if (post.type !== 'Poll' || !post.pollOptions) return null;

    const totalVotes = Object.values(post.pollVotes || {}).reduce((sum, count) => sum + count, 0);
    const showResults = !post.pollPrivate || totalVotes > 0;

    return (
      <View style={styles.pollSection}>
        <Text style={styles.sectionTitle}>📊 Poll Options</Text>
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
                    <Text style={styles.pollVotes}>({votes})</Text>
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
        <Text style={styles.sectionTitle}>📅 Event Details</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventDate}>📅 {formatDate(post.eventDate)}</Text>
          {post.eventTime && (
            <Text style={styles.eventTime}>🕐 {post.eventTime}</Text>
          )}
          <Text style={styles.attendeeCount}>👥 {post.attendeeCount || 0} attending</Text>
        </View>
        
        <Pressable
          style={[
            styles.actionButton,
            styles.rsvpButton,
            userRSVP && styles.rsvpButtonActive
          ]}
          onPress={handleRSVP}
        >
          <Text style={[
            styles.actionButtonText,
            userRSVP && styles.rsvpButtonTextActive
          ]}>
            {userRSVP ? '✓ Attending' : '📅 RSVP'}
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
        <Text style={styles.sectionTitle}>💝 Donation Campaign</Text>
        
        <View style={styles.donationStats}>
          <View style={styles.donationAmount}>
            <Text style={styles.currentAmount}>
              ৳{(post.currentAmount || 0).toLocaleString()}
            </Text>
            <Text style={styles.raisedLabel}>raised</Text>
          </View>
          {post.goalAmount && (
            <View style={styles.donationGoal}>
              <Text style={styles.goalAmount}>
                of ৳{post.goalAmount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {post.goalAmount && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        )}

        <Text style={styles.donorCount}>
          {post.donors?.length || 0} people donated
        </Text>

        <Pressable style={[styles.actionButton, styles.donateButton]} onPress={handleDonate}>
          <Text style={styles.actionButtonText}>💰 Donate Now</Text>
        </Pressable>
      </View>
    );
  };

  const renderVolunteerSection = () => {
    if (post.type !== 'Volunteer') return null;

    return (
      <View style={styles.volunteerSection}>
        <Text style={styles.sectionTitle}>🤝 Volunteer Opportunity</Text>
        
        <View style={styles.volunteerInfo}>
          {post.volunteersNeeded && (
            <Text style={styles.volunteersNeeded}>
              👥 {post.volunteersNeeded} volunteers needed
            </Text>
          )}
          
          <Text style={styles.volunteerCount}>
            ✋ {post.volunteerCount || 0} signed up
          </Text>

          {post.skills && (
            <Text style={styles.skills}>
              🎯 Skills: {post.skills}
            </Text>
          )}
        </View>

        <Pressable
          style={[
            styles.actionButton,
            styles.volunteerButton,
            userRSVP && styles.volunteerButtonActive
          ]}
          onPress={handleRSVP}
        >
          <Text style={[
            styles.actionButtonText,
            userRSVP && styles.volunteerButtonTextActive
          ]}>
            {userRSVP ? '✓ Volunteering' : '🤝 Volunteer'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderReportSection = () => {
    if (post.type !== 'Report') return null;

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>🚨 Community Report</Text>
        <View style={styles.reportAlert}>
          <Text style={styles.reportNote}>
            This is a community issue that needs attention. Help by commenting with solutions or additional information.
          </Text>
        </View>
      </View>
    );
  };

  const renderAudioSection = () => {
    if (!post.audio) return null;

    return (
      <View style={styles.audioSection}>
        <Text style={styles.sectionTitle}>🎵 Audio Message</Text>
        <Pressable
          style={[
            styles.audioButton,
            isPlaying && styles.audioButtonPlaying
          ]}
          onPress={handlePlayAudio}
        >
          <Text style={[
            styles.audioButtonText,
            isPlaying && styles.audioButtonTextPlaying
          ]}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play Audio'}
          </Text>
        </Pressable>
        {audioError && (
          <Text style={styles.audioError}>{audioError}</Text>
        )}
      </View>
    );
  };

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

  if (error || !post) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>{error || 'Post not found'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchPostData}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{post.type}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Show delete button only for post author */}
          {post.author === getCurrentUser() && (
            <Pressable 
              style={styles.deleteButton} 
              onPress={handleDeletePost}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </Pressable>
          )}
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareIcon}>📤</Text>
          </Pressable>
        </View>
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
            {/* Post Header */}
            <View style={styles.postHeader}>
              <View style={styles.postMeta}>
                <View style={styles.typeLocation}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{post.type}</Text>
                  </View>
                  {post.location && (
                    <Text style={styles.locationText}>📍 {post.location}</Text>
                  )}
                </View>
                {renderPriorityBadge()}
              </View>
              <Text style={styles.timeText}>{formatTimeAgo(post.createdAt || post.time)}</Text>
            </View>

            {/* Post Media Content */}
            {renderMediaContent()}

            {/* Post Content */}
            <View style={styles.postContent}>
              <Text style={styles.postTitle}>{post.title}</Text>
              {post.description && (
                <Text style={styles.postDescription}>{post.description}</Text>
              )}
              <Text style={styles.postAuthor}>
                By {post.author || 'Anonymous'}
              </Text>
            </View>

            {/* Like and Comment Bar */}
            <View style={styles.engagementBar}>
              <Pressable style={styles.likeButton} onPress={handleLike}>
                <Text style={[styles.likeIcon, isLiked && styles.likeIconActive]}>
                  {isLiked ? '❤️' : '🤍'}
                </Text>
                <Text style={styles.likeCount}>{likeCount}</Text>
              </Pressable>
              
              <Pressable 
                style={styles.commentToggle}
                onPress={() => setShowComments(!showComments)}
              >
                <Text style={styles.commentIcon}>💬</Text>
                <Text style={styles.commentCount}>{comments.length}</Text>
              </Pressable>

              <Pressable style={styles.shareButtonSmall} onPress={handleShare}>
                <Text style={styles.shareIconSmall}>📤</Text>
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
            </View>

            {/* Type-specific sections */}
            {renderAudioSection()}
            {renderPollSection()}
            {renderEventSection()}
            {renderDonationSection()}
            {renderVolunteerSection()}
            {renderReportSection()}
          </View>

          {/* Comments Section */}
          {showComments && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>
                💬 Comments ({comments.length})
              </Text>
              
              {comments.map((comment) => (
                <View key={comment._id} style={styles.commentCard}>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <View style={styles.commentFooter}>
                    <Text style={styles.commentAuthor}>
                      {comment.author || 'Anonymous'}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatTimeAgo(comment.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}

              {comments.length === 0 && (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsEmoji}>💭</Text>
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>Be the first to join the conversation!</Text>
                </View>
              )}
            </View>
          )}
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
              <Text style={styles.sendButtonText}>📨</Text>
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
    backgroundColor: '#f8fafc',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 16,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 16,
  },

  // Loading and error states
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

  // Content
  scrollView: {
    flex: 1,
  },
  postCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Post Header
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  postMeta: {
    flex: 1,
  },
  typeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Post Content
  postImage: {
    width: '100%',
    height: 200,
  },
  videoContainer: {
    width: '100%',
    height: 200,
  },
  videoPlaceholder: {
    backgroundColor: '#f1f5f9',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  videoText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  videoSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  postContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    lineHeight: 26,
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 12,
  },
  postAuthor: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Engagement Bar
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    justifyContent: 'space-between',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  likeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  likeIconActive: {
    transform: [{ scale: 1.1 }],
  },
  likeCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  commentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  commentIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  commentCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  shareButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  shareIconSmall: {
    fontSize: 16,
    marginRight: 6,
  },
  shareText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },

  // Audio Section
  audioSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  audioButton: {
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    alignItems: 'center',
  },
  audioButtonPlaying: {
    backgroundColor: '#6366f1',
  },
  audioButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  audioButtonTextPlaying: {
    color: '#fff',
  },
  audioError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },

  // Poll Section
  pollSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pollOption: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pollOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f8ff',
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollOptionText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  pollOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  pollResults: {
    alignItems: 'flex-end',
  },
  pollPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  pollVotes: {
    fontSize: 12,
    color: '#64748b',
  },
  pollBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  pollBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  pollBarFillSelected: {
    backgroundColor: '#6366f1',
  },
  totalVotes: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },

  // Event Section
  eventSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  eventInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventDate: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 6,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 6,
    fontWeight: '500',
  },
  attendeeCount: {
    fontSize: 15,
    color: '#64748b',
  },

  // Donation Section
  donationSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  donationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  donationAmount: {
    alignItems: 'flex-start',
  },
  currentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  raisedLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  donationGoal: {
    alignItems: 'flex-end',
  },
  goalAmount: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  donorCount: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },

  // Volunteer Section
  volunteerSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  volunteerInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  volunteersNeeded: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 6,
    fontWeight: '500',
  },
  volunteerCount: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 6,
    fontWeight: '500',
  },
  skills: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },

  // Report Section
  reportSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reportAlert: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  reportNote: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },

  // Action Buttons
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  rsvpButton: {
    backgroundColor: '#22c55e',
  },
  rsvpButtonActive: {
    backgroundColor: '#ef4444',
  },
  rsvpButtonTextActive: {
    color: '#fff',
  },
  donateButton: {
    backgroundColor: '#f59e0b',
  },
  volunteerButton: {
    backgroundColor: '#6366f1',
  },
  volunteerButtonActive: {
    backgroundColor: '#ef4444',
  },
  volunteerButtonTextActive: {
    color: '#fff',
  },

  // Comments Section
  commentsSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentContent: {
    fontSize: 15,
    color: '#1e293b',
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
    color: '#64748b',
    fontWeight: '500',
  },
  commentTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCommentsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Comment Input
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendButtonText: {
    fontSize: 18,
  },
});

export default PostDetail;