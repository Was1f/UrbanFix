import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SessionManager from '../utils/sessionManager';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiUrl } from '../constants/api';

export default function ModerationPanel() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reportId = params.reportId;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  const [notes, setNotes] = useState('');
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSessionAndLoadData();
  }, [selectedStatus]);

  const checkSessionAndLoadData = async () => {
    try {
      console.log('🔍 Checking admin session in moderation panel...');
      const adminSession = await SessionManager.getAdminSession();
      
      if (adminSession) {
        console.log('✅ Valid session found, loading moderation data');
        setSession(adminSession);
        await fetchReports(adminSession.token);
        
        // If a specific reportId is provided, select it
        if (reportId) {
          console.log('🔍 ReportId received:', reportId);
          setSelectedReport(reportId);
        }
      } else {
        console.log('❌ No valid session found, redirecting to login');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
      router.replace('/admin-login');
    }
  };

  const fetchReports = async (authToken) => {
    try {
      const response = await fetch(apiUrl(`/api/moderation/admin/reports?status=${selectedStatus}`), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else if (response.status === 401) {
        await handleSessionExpired();
        return;
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to load reports');
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

  const takeAction = async (reportId, action) => {
    try {
      if (!session?.token) {
        Alert.alert('Authentication Required', 'Please login again to perform this action.', [
          { text: 'OK', onPress: () => router.replace('/admin-login') }
        ]);
        return;
      }

      const response = await fetch(apiUrl(`/api/moderation/admin/reports/${reportId}/action`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', `Report ${action} successfully`);
        setNotes('');
        await fetchReports(session.token);
      } else if (response.status === 401) {
        await handleSessionExpired();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to take action');
      }
    } catch (error) {
      console.error('Error taking action:', error);
      Alert.alert('Error', 'Failed to take action');
    }
  };

  const getActionButtonStyle = (action) => {
    switch (action) {
      case 'approved':
        return { backgroundColor: '#4CAF50' };
      case 'rejected':
        return { backgroundColor: '#FF9800' };
      case 'removed':
        return { backgroundColor: '#F44336' };
      default:
        return { backgroundColor: '#1e90ff' };
    }
  };

  const getActionButtonText = (action) => {
    switch (action) {
      case 'approved':
        return '✓ Approve';
      case 'rejected':
        return '✗ Reject';
      case 'removed':
        return '🗑️ Remove';
      default:
        return action;
    }
  };

  const ModerationContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Moderation Panel</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Status Tabs */}
        <View style={styles.tabs}>
          {['pending', 'flagged', 'urgent', 'resolved'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.tab, selectedStatus === status && styles.activeTab]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[styles.tabText, selectedStatus === status && styles.activeTabText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No {selectedStatus} reports</Text>
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
                
                <Text style={styles.reportDescription}>
                  {report.discussionId?.description || 'No description available'}
                </Text>

                <Text style={styles.reportAuthor}>
                  By {report.discussionId?.author || 'Anonymous'}
                </Text>

                <Text style={styles.reporterInfo}>
                  Reported by: {report.reporterUsername || 'Anonymous'}
                </Text>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, getActionButtonStyle('approved')]}
                    onPress={() => takeAction(report._id, 'approved')}
                  >
                    <Text style={styles.actionButtonText}>
                      {getActionButtonText('approved')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, getActionButtonStyle('rejected')]}
                    onPress={() => takeAction(report._id, 'rejected')}
                  >
                    <Text style={styles.actionButtonText}>
                      {getActionButtonText('rejected')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, getActionButtonStyle('removed')]}
                    onPress={() => takeAction(report._id, 'removed')}
                  >
                    <Text style={styles.actionButtonText}>
                      {getActionButtonText('removed')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Notes Input */}
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <ProtectedRoute>
      <ModerationContent />
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
  backButton: {
    fontSize: 16,
    color: '#1e90ff',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#1e90ff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 15,
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
  reportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  reportAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reporterInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
});
