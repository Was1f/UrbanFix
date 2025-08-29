import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SessionManager from '../utils/sessionManager';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiUrl } from '../constants/api';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSessionAndLoadData();
  }, []);

  const checkSessionAndLoadData = async () => {
    try {
      const adminSession = await SessionManager.getAdminSession();
      
      if (adminSession) {
        setSession(adminSession);
        await fetchDashboardData(adminSession.token);
      } else {
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error checking session:', error);
      router.replace('/admin-login');
    }
  };

  const fetchDashboardData = async (authToken) => {
    try {
      if (!authToken) {
        setLoading(false);
        return;
      }

      // Fetch comprehensive dashboard stats
      const response = await fetch(apiUrl('/api/admin/dashboard/stats'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else if (response.status === 401) {
        await handleSessionExpired();
        return;
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (session?.token) {
        fetchDashboardData(session.token);
      }
    }, [session?.token])
  );

  const handleSessionExpired = async () => {
    await SessionManager.clearAdminSession();
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      { text: 'OK', onPress: () => router.replace('/admin-login') }
    ]);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          try {
            await SessionManager.clearAdminSession();
            Alert.alert('Logged Out', 'You have been successfully logged out.', [
              { 
                text: 'OK', 
                onPress: () => router.replace('/admin-login')
              }
            ]);
          } catch (error) {
            console.error('Error during logout:', error);
            Alert.alert('Logout Error', 'Failed to logout properly. Please try again.', [
              { text: 'OK' }
            ]);
          }
        }
      }
    ]);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getGrowthColor = (current, previous) => {
    if (!previous) return '#10b981';
    const growth = ((current - previous) / previous) * 100;
    if (growth > 0) return '#10b981';
    if (growth < 0) return '#ef4444';
    return '#6b7280';
  };

  const DashboardContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {session?.username || 'Admin'}! 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Key Metrics */}
          <Text style={styles.sectionHeading}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="people-outline" size={20} color="#6366f1" />
                </View>
                <Text style={styles.metricTrend}>
                  +{stats?.users?.growth?.today || 0} today
                </Text>
              </View>
              <Text style={styles.metricNumber}>{formatNumber(stats?.users?.total || 0)}</Text>
              <Text style={styles.metricLabel}>Total Users</Text>
              <View style={styles.metricDetails}>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Verified: </Text>
                  {formatNumber(stats?.users?.verified || 0)}
                </Text>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Banned: </Text>
                  {formatNumber(stats?.users?.banned || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#10b981" />
                </View>
                <Text style={styles.metricTrend}>
                  +{stats?.posts?.growth?.today || 0} today
                </Text>
              </View>
              <Text style={styles.metricNumber}>{formatNumber(stats?.posts?.total || 0)}</Text>
              <Text style={styles.metricLabel}>Total Posts</Text>
              <View style={styles.metricDetails}>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Active: </Text>
                  {formatNumber(stats?.posts?.active || 0)}
                </Text>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Pending: </Text>
                  {formatNumber(stats?.posts?.pending || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="ticket-outline" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.metricTrend}>
                  +{stats?.tickets?.growth?.today || 0} today
                </Text>
              </View>
              <Text style={styles.metricNumber}>{formatNumber(stats?.tickets?.total || 0)}</Text>
              <Text style={styles.metricLabel}>Support Tickets</Text>
              <View style={styles.metricDetails}>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Open: </Text>
                  {formatNumber(stats?.tickets?.open || 0)}
                </Text>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Resolved: </Text>
                  {formatNumber(stats?.tickets?.resolved || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="megaphone-outline" size={20} color="#8b5cf6" />
                </View>
                <Text style={styles.metricTrend}>
                  +{stats?.announcements?.today || 0} today
                </Text>
              </View>
              <Text style={styles.metricNumber}>{formatNumber(stats?.announcements?.total || 0)}</Text>
              <Text style={styles.metricLabel}>Announcements</Text>
              <View style={styles.metricDetails}>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Active: </Text>
                  {formatNumber(stats?.announcements?.active || 0)}
                </Text>
                <Text style={styles.metricDetail}>
                  <Text style={styles.metricDetailLabel}>Archived: </Text>
                  {formatNumber(stats?.announcements?.archived || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Growth Trends */}
          <Text style={styles.sectionHeading}>Growth Trends</Text>
          <View style={styles.trendsContainer}>
            <View style={styles.trendCard}>
              <Text style={styles.trendTitle}>User Growth</Text>
              <View style={styles.trendChart}>
                <View style={styles.chartBar}>
                  <View style={[styles.chartBarFill, { height: Math.min((stats?.users?.growth?.thisWeek || 0) * 2, 60) }]} />
                  <Text style={styles.chartLabel}>Week</Text>
                </View>
                <View style={styles.chartBar}>
                  <View style={[styles.chartBarFill, { height: Math.min((stats?.users?.growth?.thisMonth || 0) * 2, 60) }]} />
                  <Text style={styles.chartLabel}>Month</Text>
                </View>
              </View>
              <View style={styles.trendRow}>
                <Text style={styles.trendLabel}>This Week:</Text>
                <Text style={[styles.trendValue, { color: getGrowthColor(stats?.users?.growth?.thisWeek, 0) }]}>
                  +{stats?.users?.growth?.thisWeek || 0}
                </Text>
              </View>
              <View style={styles.trendRow}>
                <Text style={styles.trendLabel}>This Month:</Text>
                <Text style={[styles.trendValue, { color: getGrowthColor(stats?.users?.growth?.thisMonth, 0) }]}>
                  +{stats?.users?.growth?.thisMonth || 0}
                </Text>
              </View>
            </View>

            <View style={styles.trendCard}>
              <Text style={styles.trendTitle}>Content Growth</Text>
              <View style={styles.trendChart}>
                <View style={styles.chartBar}>
                  <View style={[styles.chartBarFill, { height: Math.min((stats?.posts?.growth?.thisWeek || 0) * 2, 60) }]} />
                  <Text style={styles.chartLabel}>Week</Text>
                </View>
                <View style={styles.chartBar}>
                  <View style={[styles.chartBarFill, { height: Math.min((stats?.posts?.growth?.thisMonth || 0) * 2, 60) }]} />
                  <Text style={styles.chartLabel}>Month</Text>
                </View>
              </View>
              <View style={styles.trendRow}>
                <Text style={styles.trendLabel}>Posts This Week:</Text>
                <Text style={[styles.trendValue, { color: getGrowthColor(stats?.posts?.growth?.thisWeek, 0) }]}>
                  +{stats?.posts?.growth?.thisWeek || 0}
                </Text>
              </View>
              <View style={styles.trendRow}>
                <Text style={styles.trendLabel}>Posts This Month:</Text>
                <Text style={[styles.trendValue, { color: getGrowthColor(stats?.posts?.growth?.thisMonth, 0) }]}>
                  +{stats?.posts?.growth?.thisMonth || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionHeading}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => router.push('/moderation-panel')}
            >
              <Ionicons name="shield-checkmark-outline" size={24} color="#6366f1" />
              <Text style={styles.quickLabel}>Moderation Panel</Text>
              <Text style={styles.quickSubtext}>
                {stats?.reports?.pending || 0} pending reports
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => router.push('/admin-announcements')}
            >
              <Ionicons name="megaphone-outline" size={24} color="#10b981" />
              <Text style={styles.quickLabel}>Announcements</Text>
              <Text style={styles.quickSubtext}>
                {stats?.announcements?.active || 0} active
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => router.push('/admin-users')}
            >
              <Ionicons name="people-outline" size={24} color="#8b5cf6" />
              <Text style={styles.quickLabel}>Manage Users</Text>
              <Text style={styles.quickSubtext}>
                {stats?.users?.total || 0} total users
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => router.push('/admin-tickets')}
            >
              <Ionicons name="ticket-outline" size={24} color="#f97316" />
              <Text style={styles.quickLabel}>Support Tickets</Text>
              <Text style={styles.quickSubtext}>
                {stats?.tickets?.open || 0} open tickets
              </Text>
            </TouchableOpacity>
          </View>

          {/* Top Users */}
          {stats?.topUsers && stats.topUsers.length > 0 && (
            <>
              <Text style={styles.sectionHeading}>Top Users</Text>
              <View style={styles.topUsersContainer}>
                {stats.topUsers.map((user, index) => {
                  const buildImgSrc = (profilePic) => {
                    if (!profilePic) return null;
                    if (typeof profilePic === 'string') {
                      if (profilePic.startsWith('http://') || profilePic.startsWith('https://')) return profilePic;
                      if (profilePic.startsWith('/uploads/')) return apiUrl(profilePic);
                      return apiUrl(`/uploads/profile/${profilePic}`);
                    }
                    if (typeof profilePic === 'object' && profilePic.uri) {
                      const u = profilePic.uri;
                      if (typeof u !== 'string') return null;
                      if (u.startsWith('http://') || u.startsWith('https://')) return u;
                      if (u.startsWith('/uploads/')) return apiUrl(u);
                      return apiUrl(`/uploads/profile/${u}`);
                    }
                    return null;
                  };
                  const imgSrc = buildImgSrc(user?.profilePic);
                  return (
                    <TouchableOpacity
                      key={user._id || index}
                      style={styles.topUserCard}
                      onPress={() => router.push(`/ViewPublicProfile?identifier=${encodeURIComponent(user.phone || user.username)}&from=admin`)}
                    >
                      <View style={styles.topUserRank}>
                        <Text style={styles.rankNumber}>#{index + 1}</Text>
                      </View>
                      <View style={styles.topUserAvatarContainer}>
                        {imgSrc ? (
                          <View style={styles.topUserAvatarWrap}>
                            <Image source={{ uri: imgSrc }} style={styles.topUserAvatarImage} />
                          </View>
                        ) : (
                          <View style={[styles.topUserAvatar, { backgroundColor: '#6366f1' }]}>
                            <Text style={styles.topUserAvatarInitial}>{(user.username || 'U').charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.topUserInfo}>
                        <Text style={styles.topUserName} numberOfLines={1}>@{user.username}</Text>
                        <Text style={styles.topUserPoints}>{formatNumber(user.points?.total || 0)} points</Text>
                        <Text style={styles.topUserSubline} numberOfLines={1}>
                          {(user.stats?.postsCreated || 0)} posts · {(user.stats?.commentsAdded || 0)} comments
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Recent Activity */}
          <Text style={styles.sectionHeading}>Recent Activity</Text>
          <View style={styles.activityContainer}>
            {stats?.recentPosts && stats.recentPosts.length > 0 && (
              <View style={styles.activitySection}>
                <Text style={styles.activitySectionTitle}>Recent Posts</Text>
                {stats.recentPosts.slice(0, 3).map((post, index) => (
                  <View key={post._id || index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="document-text-outline" size={16} color="#6366f1" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {post.title}
                      </Text>
                      <Text style={styles.activityMeta}>
                        by {post.author} • {new Date(post.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.activityStatus, { backgroundColor: post.status === 'active' ? '#dcfce7' : '#fef3c7' }]}>
                      <Text style={[styles.activityStatusText, { color: post.status === 'active' ? '#16a34a' : '#d97706' }]}>
                        {post.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {stats?.recentTickets && stats.recentTickets.length > 0 && (
              <View style={styles.activitySection}>
                <Text style={styles.activitySectionTitle}>Recent Tickets</Text>
                {stats.recentTickets.slice(0, 3).map((ticket, index) => (
                  <View key={ticket._id || index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="ticket-outline" size={16} color="#f59e0b" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {ticket.subject}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {ticket.priority} priority • {new Date(ticket.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.activityStatus, { backgroundColor: ticket.status === 'open' ? '#fef2f2' : '#dcfce7' }]}>
                      <Text style={[styles.activityStatusText, { color: ticket.status === 'open' ? '#dc2626' : '#16a34a' }]}>
                        {ticket.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTrend: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  metricDetails: {
    marginTop: 8,
  },
  metricDetail: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  metricDetailLabel: {
    fontWeight: '600',
    color: '#111827',
  },
  trendsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  trendCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
    marginBottom: 12,
  },
  chartBar: {
    width: '45%',
    alignItems: 'center',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 8,
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  quickSubtext: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  topUsersContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  topUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  topUserAvatarContainer: {
    marginRight: 12,
  },
  topUserAvatarWrap: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 2,
  },
  topUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topUserAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  topUserAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  topUserRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  topUserInfo: {
    flex: 1,
    minWidth: 0,
  },
  topUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  topUserPoints: {
    fontSize: 12,
    color: '#6b7280',
  },
  topUserSubline: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  activityContainer: {
    paddingHorizontal: 16,
  },
  activitySection: {
    marginBottom: 20,
  },
  activitySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
  activityStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
