import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import SessionManager from '../utils/sessionManager';
import ProtectedRoute from '../components/ProtectedRoute';

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
      const statsResponse = await fetch('http://192.168.10.115:5000/api/moderation/admin/stats', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch recent reports
      const reportsResponse = await fetch('http://192.168.10.115:5000/api/moderation/admin/reports?limit=5', {
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
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.totalReports || 0}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.pendingReports || 0}</Text>
            <Text style={styles.statLabel}>Pending Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.flaggedDiscussions || 0}</Text>
            <Text style={styles.statLabel}>Flagged Posts</Text>
          </View>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
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
              <Text style={styles.emptyStateText}>No reports to review</Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report._id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportReason}>{report.reason}</Text>
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
                  <Text style={styles.reviewButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
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
              <Text style={styles.actionButtonText}>Moderation Panel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
            >
              <Text style={styles.actionButtonText}>Send Announcement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e90ff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllButton: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewAllButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
  },
  reportCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportReason: {
    backgroundColor: '#ffefef',
    color: '#c00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  reportTime: {
    fontSize: 12,
    color: '#666',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  reviewButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
