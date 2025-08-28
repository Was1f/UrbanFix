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
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSessionAndLoadData();
  }, []);

  const checkSessionAndLoadData = async () => {
    try {
      console.log('🔍 Checking admin session...');
      const adminSession = await SessionManager.getAdminSession();
      
      if (adminSession) {
        console.log('✅ Valid session found, loading dashboard data');
        setSession(adminSession);
        await fetchDashboardData(adminSession.token);
      } else {
        console.log('❌ No valid session found, redirecting to login');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
      router.replace('/admin-login');
    }
  };

  const fetchDashboardData = async (authToken) => {
    try {
      if (!authToken) {
        console.log('⚠️ No auth token provided');
        setLoading(false);
        return;
      }

      // Fetch moderation stats
      const statsResponse = await fetch(apiUrl('/api/moderation/admin/stats'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch recent reports
      const reportsResponse = await fetch(apiUrl('/api/moderation/admin/reports?limit=5'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else if (statsResponse.status === 401) {
        // Token expired or invalid
        await handleSessionExpired();
        return;
      }

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.reports || []);
      } else if (reportsResponse.status === 401) {
        // Token expired or invalid
        await handleSessionExpired();
        return;
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
    console.log('⚠️ Session expired, clearing and redirecting');
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
            // Clear session data
            await SessionManager.clearAdminSession();
            console.log('🔒 Logged out successfully');
            Alert.alert('Logged Out', 'You have been successfully logged out.', [
              { 
                text: 'OK', 
                onPress: () => router.replace('/admin-login')
              }
            ]);
          } catch (error) {
            console.error('❌ Error during logout:', error);
            Alert.alert('Logout Error', 'Failed to logout properly. Please try again.', [
              { text: 'OK' }
            ]);
          }
        }
      }
    ]);
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
              style={styles.infoButton}
              onPress={async () => {
                const debugInfo = await SessionManager.debugAdminSession();
                Alert.alert('Session Debug Info', 
                  `Token: ${debugInfo.token}\n` +
                  `Username: ${debugInfo.username}\n` +
                  `Role: ${debugInfo.role}\n` +
                  `Timestamp: ${debugInfo.timestamp}\n` +
                  `Session Age: ${debugInfo.sessionAge}\n` +
                  `Is Expired: ${debugInfo.isExpired}\n` +
                  `Timeout: ${debugInfo.SESSION_TIMEOUT}`
                );
              }}
            >
              <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={async () => {
                try {
                  const response = await fetch(apiUrl('/api/admin/profile'), {
                    headers: {
                      'Authorization': `Bearer ${session?.token}`,
                    },
                  });
                  if (response.ok) {
                    Alert.alert('✅ Token Test', 'Admin token is working correctly!');
                  } else {
                    Alert.alert('❌ Token Test Failed', `Status: ${response.status}\n${await response.text()}`);
                  }
                } catch (error) {
                  Alert.alert('❌ Token Test Error', error.message);
                }
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Statistics Cards */}
          <Text style={styles.sectionHeading}>Overview</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#6366f1" />
              </View>
              <Text style={styles.statNumber}>{stats?.totalReports || 0}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statNumber}>{stats?.pendingReports || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flag-outline" size={24} color="#ef4444" />
              </View>
              <Text style={styles.statNumber}>{stats?.flaggedDiscussions || 0}</Text>
              <Text style={styles.statLabel}>Flagged Posts</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionHeading}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => {
                if (session?.token) {
                  router.push('/moderation-panel');
                } else {
                  Alert.alert('Authentication Required', 'Please login again to access this feature.', [
                    { text: 'OK', onPress: () => router.replace('/admin-login') }
                  ]);
                }
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#6366f1" />
              <Text style={styles.quickLabel}>Moderation Panel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => {
                if (session?.token) {
                  router.push('/admin-announcements');
                } else {
                  Alert.alert('Authentication Required', 'Please login again to access this feature.', [
                    { text: 'OK', onPress: () => router.replace('/admin-login') }
                  ]);
                }
              }}
            >
              <Ionicons name="megaphone-outline" size={20} color="#10b981" />
              <Text style={styles.quickLabel}>Announcements</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => {
                if (session?.token) {
                  router.push('/admin-users');
                } else {
                  Alert.alert('Authentication Required', 'Please login again to access this feature.', [
                    { text: 'OK', onPress: () => router.replace('/admin-login') }
                  ]);
                }
              }}
            >
              <Ionicons name="people-outline" size={20} color="#8b5cf6" />
              <Text style={styles.quickLabel}>Manage Users</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => {
                if (session?.token) {
                  router.push('/admin-tickets');
                } else {
                  Alert.alert('Authentication Required', 'Please login again to access this feature.', [
                    { text: 'OK', onPress: () => router.replace('/admin-login') }
                  ]);
                }
              }}
            >
              <Ionicons name="ticket-outline" size={20} color="#f97316" />
              <Text style={styles.quickLabel}>Support Tickets</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Reports */}
          <Text style={styles.sectionHeading}>Recent Reports</Text>
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionSubtitle}>Latest reports requiring attention</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => {
                  if (session?.token) {
                    router.push('/moderation-panel');
                  } else {
                    Alert.alert('Authentication Required', 'Please login again to access this feature.', [
                      { text: 'OK', onPress: () => router.replace('/admin-login') }
                    ]);
                  }
                }}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>

            {reports.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
                <Text style={styles.emptyStateTitle}>All caught up!</Text>
                <Text style={styles.emptyStateText}>No reports to review at the moment.</Text>
              </View>
            ) : (
              <View style={styles.reportsList}>
                {reports.map((report) => (
                  <View key={report._id} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportBadge}>
                        <Text style={styles.reportBadgeText}>{report.reason}</Text>
                      </View>
                      <Text style={styles.reportTime}>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.reportTitle}>
                      {report.discussionId?.title || 'Unknown Discussion'}
                    </Text>
                    <Text style={styles.reportAuthor}>
                      By {report.discussionId?.author || 'Anonymous'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.reviewButton}
                      onPress={() => {
                        if (session?.token) {
                          router.push(`/moderation-panel?reportId=${report._id}`);
                        } else {
                          Alert.alert('Authentication Required', 'Please login again to access this feature.', [
                            { text: 'OK', onPress: () => router.replace('/admin-login') }
                          ]);
                        }
                      }}
                    >
                      <Text style={styles.reviewButtonText}>Review Report</Text>
                    </TouchableOpacity>
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
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    marginBottom: 8,
    marginRight: '2%',
  },
  quickLabel: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  viewAllButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportBadgeText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportTime: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  reportAuthor: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  reviewButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
