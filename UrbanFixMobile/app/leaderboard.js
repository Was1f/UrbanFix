import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiUrl } from '../constants/api';
import { AuthContext } from '../context/AuthContext';
import UserProtectedRoute from '../components/UserProtectedRoute';

const { width } = Dimensions.get('window');

const Leaderboard = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('total');
  const periods = [
    { key: 'daily', label: 'Today', emoji: '🌅' },
    { key: 'weekly', label: 'This Week', emoji: '📅' },
    { key: 'monthly', label: 'This Month', emoji: '🗓️' },
    { key: 'total', label: 'All Time', emoji: '👑' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const leaderboardUrl = apiUrl(`/api/leaderboard?period=${selectedPeriod}&limit=100`);
      const leaderboardRes = await fetch(leaderboardUrl);
      const leaderboardData = await leaderboardRes.json();
      
      if (leaderboardRes.ok) {
        setLeaderboard(leaderboardData);
      }

      // Fetch current user's stats if logged in
      if (user?.phone) {
        const userStatsUrl = apiUrl(`/api/leaderboard/user/${user.phone}?period=${selectedPeriod}`);
        const userStatsRes = await fetch(userStatsUrl);
        const userStatsData = await userStatsRes.json();
        
        if (userStatsRes.ok) {
          setUserStats(userStatsData);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    // Removed location fetching functionality
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Fixed function to get points for period
  const getPointsForPeriod = (userPoints) => {
    if (!userPoints || typeof userPoints !== 'object') return 0;
    
    switch (selectedPeriod) {
      case 'daily':
        return userPoints.daily || 0;
      case 'weekly':
        return userPoints.weekly || 0;
      case 'monthly':
        return userPoints.monthly || 0;
      default:
        return userPoints.total || 0;
    }
  };

  const formatUserName = (user) => {
    if (user.fname && user.lname) {
      return `${user.fname} ${user.lname}`;
    }
    return user.phone ? `User ${user.phone.slice(-4)}` : 'Anonymous';
  };

  const getMedalEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  const renderTopThree = () => {
    const topThree = leaderboard.slice(0, 3);
    if (topThree.length === 0) return null;

    return (
      <View style={styles.podiumContainer}>
        <Text style={styles.podiumTitle}>Top Contributors</Text>
        
        <View style={styles.podium}>
          {/* Second Place */}
          {topThree[1] && (
            <View style={[styles.podiumPlace, styles.secondPlace]}>
              <View style={styles.podiumUser}>
                <Text style={styles.medalEmoji}>🥈</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {formatUserName(topThree[1])}
                </Text>
                {topThree[1].verificationBadge && (
                  <Text style={styles.verificationBadge}>✓</Text>
                )}
                <Text style={styles.podiumPoints}>
                  {getPointsForPeriod(topThree[1].points)} pts
                </Text>
              </View>
              <View style={[styles.podiumBar, styles.secondBar]} />
              <Text style={styles.podiumRank}>#2</Text>
            </View>
          )}

          {/* First Place */}
          <View style={[styles.podiumPlace, styles.firstPlace]}>
            <View style={styles.podiumUser}>
              <Text style={styles.crownEmoji}>👑</Text>
              <Text style={styles.medalEmoji}>🥇</Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {formatUserName(topThree[0])}
              </Text>
              {topThree[0].verificationBadge && (
                <Text style={styles.verificationBadge}>✓</Text>
              )}
              <Text style={styles.podiumPoints}>
                {getPointsForPeriod(topThree[0].points)} pts
              </Text>
            </View>
            <View style={[styles.podiumBar, styles.firstBar]} />
            <Text style={styles.podiumRank}>#1</Text>
          </View>

          {/* Third Place */}
          {topThree[2] && (
            <View style={[styles.podiumPlace, styles.thirdPlace]}>
              <View style={styles.podiumUser}>
                <Text style={styles.medalEmoji}>🥉</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {formatUserName(topThree[2])}
                </Text>
                {topThree[2].verificationBadge && (
                  <Text style={styles.verificationBadge}>✓</Text>
                )}
                <Text style={styles.podiumPoints}>
                  {getPointsForPeriod(topThree[2].points)} pts
                </Text>
              </View>
              <View style={[styles.podiumBar, styles.thirdBar]} />
              <Text style={styles.podiumRank}>#3</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderUserStats = () => {
    if (!userStats) return null;

    return (
      <View style={styles.userStatsContainer}>
        <Text style={styles.userStatsTitle}>Your Position</Text>
        <View style={styles.userStatsCard}>
          <View style={styles.userStatsLeft}>
            <Text style={styles.userStatsName}>{userStats.user.name}</Text>
            <Text style={styles.userStatsRank}>
              Rank #{userStats.rank || 'Unranked'} of {userStats.totalParticipants}
            </Text>
          </View>
          <View style={styles.userStatsRight}>
            <Text style={styles.userStatsPoints}>
              {getPointsForPeriod(userStats.user.points)} pts
            </Text>
            {userStats.user.verificationBadge && (
              <Text style={styles.verificationBadge}>✓</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }) => {
    const isCurrentUser = user?.phone === item.phone;
    const rank = index + 1;
    
    return (
      <View style={[
        styles.leaderboardItem,
        isCurrentUser && styles.currentUserItem,
        rank <= 3 && styles.topThreeItem
      ]}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankEmoji}>{getMedalEmoji(rank)}</Text>
          <Text style={[styles.rankNumber, rank <= 3 && styles.topRankNumber]}>
            #{rank}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.userNameContainer}>
            <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
              {formatUserName(item)}
            </Text>
            {item.verificationBadge && (
              <Text style={styles.verificationBadge}>✓</Text>
            )}
            {isCurrentUser && (
              <Text style={styles.youLabel}>(You)</Text>
            )}
          </View>
          
          {item.stats && (
            <Text style={styles.userActivity}>
              {item.stats.postsCreated || 0} posts • {item.stats.commentsAdded || 0} comments • {item.stats.helpOffered || 0} helps
            </Text>
          )}
        </View>
        
        <View style={styles.pointsContainer}>
          <Text style={[styles.points, rank <= 3 && styles.topPoints]}>
            {getPointsForPeriod(item.points)}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🏆</Text>
      <Text style={styles.emptyTitle}>No contributors yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to earn points by participating in your community!
      </Text>
      <Pressable 
        style={styles.createPostButton}
        onPress={() => router.push('/create-post')}
      >
        <Text style={styles.createPostText}>Create First Post</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Leaderboard</Text>
            <Text style={styles.headerSubtitle}>Community Champions</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {/* Period Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Time Period</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollView}
            >
              {periods.map((period) => (
                <Pressable
                  key={period.key}
                  style={[
                    styles.filterChip,
                    selectedPeriod === period.key && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedPeriod(period.key)}
                >
                  <Text style={styles.filterEmoji}>{period.emoji}</Text>
                  <Text style={[
                    styles.filterText,
                    selectedPeriod === period.key && styles.filterTextActive
                  ]}>
                    {period.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Top Three Podium */}
          {leaderboard.length > 0 && renderTopThree()}

          {/* User Stats */}
          {renderUserStats()}

          {/* Full Leaderboard */}
          <View style={styles.leaderboardContainer}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>
                Global Rankings
              </Text>
              <Text style={styles.leaderboardSubtitle}>
                {periods.find(p => p.key === selectedPeriod)?.label} • {leaderboard.length} participants
              </Text>
            </View>

            {leaderboard.length > 0 ? (
              <View style={styles.leaderboardList}>
                {leaderboard.map((item, index) => (
                  <View key={item.phone || item._id || index}>
                    {renderLeaderboardItem({ item, index })}
                  </View>
                ))}
              </View>
            ) : (
              renderEmptyState()
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </UserProtectedRoute>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  // Loading
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

  // Filters
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterSection: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  filterScrollView: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
  },

  // Podium
  podiumContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  podiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 180,
    paddingHorizontal: 10,
  },
  podiumPlace: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  firstPlace: {
    zIndex: 3,
  },
  secondPlace: {
    zIndex: 2,
  },
  thirdPlace: {
    zIndex: 1,
  },
  podiumUser: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  crownEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  medalEmoji: {
    fontSize: 14,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 2,
  },
  verificationBadge: {
    fontSize: 8,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  podiumPoints: {
    fontSize: 9,
    color: '#6366f1',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 8,
  },
  firstBar: {
    height: 60,
    backgroundColor: '#ffd700',
  },
  secondBar: {
    height: 45,
    backgroundColor: '#c0c0c0',
  },
  thirdBar: {
    height: 30,
    backgroundColor: '#cd7f32',
  },
  podiumRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },

  // User Stats
  userStatsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  userStatsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  userStatsLeft: {
    flex: 1,
  },
  userStatsName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  userStatsRank: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  userStatsRight: {
    alignItems: 'flex-end',
  },
  userStatsPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },

  // Leaderboard
  leaderboardContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leaderboardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  leaderboardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  leaderboardList: {
    paddingVertical: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  currentUserItem: {
    backgroundColor: '#f0f8ff',
  },
  topThreeItem: {
    backgroundColor: '#fefdf8',
  },
  rankContainer: {
    alignItems: 'center',
    width: 50,
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  topRankNumber: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 4,
  },
  currentUserName: {
    color: '#6366f1',
  },
  youLabel: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 4,
  },
  userActivity: {
    fontSize: 11,
    color: '#64748b',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  topPoints: {
    color: '#f59e0b',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#94a3b8',
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
    marginBottom: 24,
  },
  createPostButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createPostText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Leaderboard;