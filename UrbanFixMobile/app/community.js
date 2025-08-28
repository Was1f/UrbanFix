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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiUrl } from '../constants/api';
import UserProtectedRoute from '../components/UserProtectedRoute';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// ProfilePicture component
const ProfilePicture = ({ 
  profilePicture, 
  name = 'Anonymous', 
  size = 32,
  style = {} 
}) => {
  // Helper function to get initials from name
  const getInitials = (fullName) => {
    if (!fullName || fullName === 'Anonymous') return 'A';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Helper function to get image URL
  const getImageUrl = (profilePicData) => {
    if (!profilePicData) return null;
    
    // Handle string URLs
    if (typeof profilePicData === 'string') {
      if (profilePicData.startsWith('http://') || profilePicData.startsWith('https://')) {
        return profilePicData;
      }
      if (profilePicData.startsWith('/uploads/')) {
        return apiUrl(profilePicData);
      }
      return apiUrl(`/uploads/profile/${profilePicData}`);
    }
    
    // Handle object with uri property (your current structure)
    if (profilePicData && profilePicData.uri) {
      if (profilePicData.uri.startsWith('data:')) {
        return profilePicData.uri; // Base64 data URL
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

  // Generate a consistent color based on the name
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

  // Fallback to initials with colored background
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

const CommunityHome = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [boards, setBoards] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportedMap, setReportedMap] = useState({});

  // Enhanced filtering and sorting states
  const [sortBy, setSortBy] = useState('popular'); // Start with popular as default
  const [filterArea, setFilterArea] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  
  // Modal states for dropdowns
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);

  // Filter and sort options
  const sortOptions = [
    { value: 'popular', label: 'Most Popular', icon: '🔥' },
    { value: 'recent', label: 'Most Recent', icon: '🕐' },
    { value: 'oldest', label: 'Oldest First', icon: '📅' },
    { value: 'most_comments', label: 'Most Discussed', icon: '💬' },
    { value: 'most_likes', label: 'Most Liked', icon: '❤️' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories', icon: '📋' },
    { value: 'Report', label: 'Reports', icon: '🚨' },
    { value: 'Poll', label: 'Polls', icon: '📊' },
    { value: 'Event', label: 'Events', icon: '📅' },
    { value: 'Donation', label: 'Donations', icon: '💰' },
    { value: 'Volunteer', label: 'Volunteer', icon: '🤝' },
  ];

  const urgencyOptions = [
    { value: '', label: 'All Priorities', icon: '⚡' },
    { value: 'urgent', label: 'Urgent', icon: '🔴', color: '#ef4444' },
    { value: 'high', label: 'High Priority', icon: '🟠', color: '#f97316' },
    { value: 'medium', label: 'Medium Priority', icon: '🟡', color: '#eab308' },
    { value: 'normal', label: 'Normal', icon: '🟢', color: '#22c55e' },
    { value: 'low', label: 'Low Priority', icon: '🔵', color: '#3b82f6' },
  ];

  // Get current user info
  const getCurrentUser = () => {
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

  // Calculate popularity score for sorting (enhanced algorithm)
  const calculatePopularityScore = (discussion) => {
    const now = new Date();
    const postDate = new Date(discussion.createdAt);
    const hoursAge = Math.max(1, (now - postDate) / (1000 * 60 * 60)); // Minimum 1 hour
    
    // Base engagement metrics
    const likes = discussion.likes?.length || 0;
    const comments = discussion.comments?.length || 0;
    
    // Weight different types of engagement
    const likeWeight = 1;
    const commentWeight = 3; // Comments are more valuable than likes
    
    // Priority/urgency multiplier
    const urgencyMultipliers = {
      'urgent': 4,
      'high': 2.5,
      'medium': 1.5,
      'normal': 1,
      'low': 0.8
    };
    const urgencyMultiplier = urgencyMultipliers[discussion.priority] || 1;
    
    // Post type multiplier (reports and events might need more visibility)
    const typeMultipliers = {
      'Report': 1.3,
      'Event': 1.2,
      'Donation': 1.1,
      'Poll': 1,
      'Volunteer': 1
    };
    const typeMultiplier = typeMultipliers[discussion.type] || 1;
    
    // Raw engagement score
    const engagementScore = (likes * likeWeight) + (comments * commentWeight);
    
    // Time decay factor - newer posts get boost, but not too aggressive
    const timeDecayFactor = Math.pow(hoursAge, -0.3); // Gentle decay
    
    // Velocity bonus for posts getting engagement quickly
    const velocityBonus = hoursAge < 24 ? (engagementScore / Math.max(1, hoursAge)) * 0.1 : 0;
    
    // Final popularity score
    const popularityScore = (
      engagementScore * 
      timeDecayFactor * 
      urgencyMultiplier * 
      typeMultiplier
    ) + velocityBonus;
    
    return Math.max(0, popularityScore);
  };

  // Enhanced sorting and filtering function
  const applySortingAndFiltering = useCallback(() => {
    let filtered = [...discussions];

    // Apply area filter
    if (filterArea) {
      filtered = filtered.filter(d => d.location === filterArea);
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(d => d.type === filterCategory);
    }

    // Apply urgency filter
    if (filterUrgency) {
      filtered = filtered.filter(d => d.priority === filterUrgency);
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => calculatePopularityScore(b) - calculatePopularityScore(a));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'most_comments':
        filtered.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
        break;
      case 'most_likes':
        filtered.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    setFilteredDiscussions(filtered);
  }, [discussions, sortBy, filterArea, filterCategory, filterUrgency]);

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

  useEffect(() => {
    applySortingAndFiltering();
  }, [applySortingAndFiltering]);

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
    if (!post._id) {
      Alert.alert('Error', 'Invalid post data');
      return;
    }
    
    try {
      router.push(`/post-detail?postId=${post._id}`);
    } catch (error) {
      console.error('Navigation error:', error);
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
      
      const currentDiscussion = discussions.find(d => d._id === discussionId);
      const userAlreadyOfferedHelp = currentDiscussion?.helpers?.some(h => h.username === currentUserName);
      
      const endpoint = userAlreadyOfferedHelp ? 'withdraw-help' : 'offer-help';
      
      const response = await fetch(apiUrl(`/api/discussions/${discussionId}/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUserName }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
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
      Donation: { emoji: '💰', color: '#dc2626', bg: '#fef2f2' },
      Volunteer: { emoji: '🤝', color: '#7c3aed', bg: '#f3e8ff' },
      Report: { emoji: '🚨', color: '#ea580c', bg: '#fff7ed' },
    };
    return configs[type] || { emoji: '📄', color: '#6b7280', bg: '#f9fafb' };
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

  const renderDropdownModal = (visible, onClose, options, selectedValue, onSelect, title) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalOptions}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.modalOption,
                  selectedValue === option.value && styles.modalOptionSelected
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={styles.modalOptionEmoji}>{option.icon}</Text>
                <Text style={[
                  styles.modalOptionText,
                  selectedValue === option.value && styles.modalOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Text style={styles.modalOptionCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );

  const renderFilterChips = () => {
    const activeFilters = [];
    
    if (filterArea) activeFilters.push({ label: filterArea === 'Dhanmondi' ? 'My Area (Dhanmondi)' : filterArea, type: 'area' });
    if (filterCategory) activeFilters.push({ label: filterCategory, type: 'category' });
    if (filterUrgency) activeFilters.push({ label: urgencyOptions.find(u => u.value === filterUrgency)?.label, type: 'urgency' });
    
    if (activeFilters.length === 0) return null;

    return (
      <View style={styles.activeFiltersSection}>
        <Text style={styles.activeFiltersLabel}>Active filters:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.activeFiltersContainer}>
            {activeFilters.map((filter, index) => (
              <View key={index} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{filter.label}</Text>
                <Pressable
                  onPress={() => {
                    if (filter.type === 'area') setFilterArea('');
                    if (filter.type === 'category') setFilterCategory('');
                    if (filter.type === 'urgency') setFilterUrgency('');
                  }}
                  style={styles.removeFilterButton}
                >
                  <Text style={styles.removeFilterText}>×</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={styles.clearAllFiltersButton}
              onPress={() => {
                setFilterArea('');
                setFilterCategory('');
                setFilterUrgency('');
              }}
            >
              <Text style={styles.clearAllFiltersText}>Clear All</Text>
            </Pressable>
          </View>
        </ScrollView>
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

  const getAreaOptions = () => {
    const areas = [{ value: '', label: 'All Areas', icon: '🌍' }];
    boards.forEach(board => {
      areas.push({
        value: board.title,
        label: `${board.title} (${board.posts || 0})`,
        icon: '📍'
      });
    });
    return areas;
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/user-homepage')}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSubtitle}>{filteredDiscussions.length} posts</Text>
          </View>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/admin-login')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* Enhanced Filter Bar */}
        <View style={styles.filterBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {/* Sort By Dropdown */}
            <Pressable
              style={styles.filterDropdown}
              onPress={() => setShowSortModal(true)}
            >
              <Text style={styles.filterDropdownEmoji}>🔥</Text>
              <Text style={styles.filterDropdownText}>
                {sortOptions.find(s => s.value === sortBy)?.label || 'Sort'}
              </Text>
              <Text style={styles.filterDropdownArrow}>▼</Text>
            </Pressable>

            {/* Category Filter Dropdown */}
            <Pressable
              style={[styles.filterDropdown, filterCategory && styles.filterDropdownActive]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.filterDropdownEmoji}>📂</Text>
              <Text style={styles.filterDropdownText}>
                {filterCategory || 'Category'}
              </Text>
              <Text style={styles.filterDropdownArrow}>▼</Text>
            </Pressable>

            {/* Urgency Filter Dropdown */}
            <Pressable
              style={[styles.filterDropdown, filterUrgency && styles.filterDropdownActive]}
              onPress={() => setShowUrgencyModal(true)}
            >
              <Text style={styles.filterDropdownEmoji}>⚡</Text>
              <Text style={styles.filterDropdownText}>
                {urgencyOptions.find(u => u.value === filterUrgency)?.label || 'Priority'}
              </Text>
              <Text style={styles.filterDropdownArrow}>▼</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Active Filters */}
        {renderFilterChips()}

        {/* Content */}
        <View style={styles.content}>
          {/* Location Selection - Back to original style */}
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
                    !filterArea && styles.locationChipSelected
                  ]}
                  onPress={() => setFilterArea('')}
                >
                  <Text style={[
                    styles.locationChipText,
                    !filterArea && styles.locationChipTextSelected
                  ]}>
                    All Areas
                  </Text>
                </Pressable>
                
                {/* My Area - Hardcoded to Dhanmondi */}
                <Pressable
                  style={[
                    styles.locationChip,
                    filterArea === 'Dhanmondi' && styles.locationChipSelected
                  ]}
                  onPress={() => setFilterArea('Dhanmondi')}
                >
                  <Text style={[
                    styles.locationChipText,
                    filterArea === 'Dhanmondi' && styles.locationChipTextSelected
                  ]}>
                    My Area (Dhanmondi)
                  </Text>
                </Pressable>
                
                {boards.map((board) => (
                  <Pressable
                    key={board._id}
                    style={[
                      styles.locationChip,
                      filterArea === board.title && styles.locationChipSelected
                    ]}
                    onPress={() => setFilterArea(board.title)}
                  >
                    <Text style={[
                      styles.locationChipText,
                      filterArea === board.title && styles.locationChipTextSelected
                    ]}>
                      {board.title}
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
            {filteredDiscussions.length > 0 ? (
              <FlatList
                data={filteredDiscussions}
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
                        {discussion.priority && discussion.priority !== 'normal' && (
                          <View style={[
                            styles.priorityBadge,
                            { backgroundColor: urgencyOptions.find(u => u.value === discussion.priority)?.color + '20' }
                          ]}>
                            <Text style={[
                              styles.priorityText,
                              { color: urgencyOptions.find(u => u.value === discussion.priority)?.color }
                            ]}>
                              {urgencyOptions.find(u => u.value === discussion.priority)?.icon}
                            </Text>
                          </View>
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

                    {/* Post Footer with Profile Picture */}
                    <View style={styles.postFooter}>
                      <View style={styles.postMeta}>
                        <View style={styles.authorContainer}>
                          <ProfilePicture 
                            profilePicture={discussion.authorProfilePicture} 
                            name={discussion.author || 'Anonymous'} 
                            size={24}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.authorText}>By {discussion.author || 'Anonymous'}</Text>
                        </View>
                        <View style={styles.engagementStats}>
                          <Text style={styles.statsText}>
                            ❤️ {discussion.likes?.length || 0}
                          </Text>
                          <Text style={styles.statsText}>
                            💬 {discussion.comments?.length || 0}
                          </Text>
                          <Text style={styles.popularityScore}>
                            🔥 {Math.round(calculatePopularityScore(discussion))}
                          </Text>
                        </View>
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
                    <Text style={styles.emptySubtitle}>Try adjusting your filters or be the first to post!</Text>
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

        {/* Dropdown Modals */}
        {renderDropdownModal(
          showSortModal,
          () => setShowSortModal(false),
          sortOptions,
          sortBy,
          setSortBy,
          'Sort Posts By'
        )}

        {renderDropdownModal(
          showCategoryModal,
          () => setShowCategoryModal(false),
          categoryOptions,
          filterCategory,
          setFilterCategory,
          'Filter by Category'
        )}

        {renderDropdownModal(
          showUrgencyModal,
          () => setShowUrgencyModal(false),
          urgencyOptions,
          filterUrgency,
          setFilterUrgency,
          'Filter by Priority'
        )}
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
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
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

  // Enhanced Filter Bar
  filterBar: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 100,
  },
  filterDropdownActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  filterDropdownEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  filterDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    flex: 1,
  },
  filterDropdownArrow: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 4,
  },

  // Active Filters
  activeFiltersSection: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginRight: 6,
  },
  removeFilterButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFilterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  clearAllFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ef4444',
  },
  clearAllFiltersText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOptions: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: '#eef2ff',
  },
  modalOptionEmoji: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  modalOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  modalOptionCheck: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: 'bold',
  },

  // Content Layout
  content: {
    flex: 1,
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

  // Post Cards
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
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
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
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  engagementStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  popularityScore: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
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

  // Create Button
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
});

export default CommunityHome;