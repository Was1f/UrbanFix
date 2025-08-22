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
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [selectedReportForBan, setSelectedReportForBan] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('temporary');
  const [banningUser, setBanningUser] = useState(false);

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

  const showBanUserModal = (report) => {
    setSelectedReportForBan(report);
    setBanReason('');
    setBanDuration('temporary');
    setBanModalVisible(true);
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the ban');
      return;
    }

    if (!session?.token) {
      Alert.alert('Authentication Required', 'Please login again to perform this action.', [
        { text: 'OK', onPress: () => router.replace('/admin-login') }
      ]);
      return;
    }

    // If no reportedUserId, show manual user selection
    if (!selectedReportForBan?.reportedUserId) {
      Alert.alert(
        'Manual User Selection Required',
        'No specific user ID found in this report. Please manually identify the user to ban from the admin user management panel.',
        [{ text: 'OK' }]
      );
      setBanModalVisible(false);
      return;
    }

    setBanningUser(true);
    try {
      const response = await fetch(apiUrl(`/api/moderation/admin/reports/${selectedReportForBan._id}/ban-user`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banReason: banReason.trim(),
          banDuration: banDuration
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', `User banned successfully. ${data.message}`, [
          { text: 'OK', onPress: () => {
            setBanModalVisible(false);
            // Refresh the reports
            fetchReports(session.token);
          }}
        ]);
      } else if (response.status === 401) {
        await handleSessionExpired();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      Alert.alert('Error', 'Failed to ban user. Please try again.');
    } finally {
      setBanningUser(false);
    }
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
        return { backgroundColor: '#059669' };
      case 'rejected':
        return { backgroundColor: '#d97706' };
      case 'removed':
        return { backgroundColor: '#dc2626' };
      default:
        return { backgroundColor: '#3b82f6' };
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#059669';
      case 'rejected':
        return '#dc2626';
      case 'removed':
        return '#7c3aed';
      case 'resolved':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  const ModerationContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading reports...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we fetch the latest reports</Text>
          </View>
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
                    <View style={styles.reportReasonContainer}>
                      <Text style={styles.reportReason}>{report.reason}</Text>
                    </View>
                    <View style={styles.reportTimeContainer}>
                      <Text style={styles.reportTime}>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(report.status) }]} />
                    <Text style={styles.statusText}>{report.status}</Text>
                  </View>

                                  <View style={styles.reportContent}>
                    <Text style={styles.reportTitle}>
                      {report.discussionId?.title || 'Unknown Discussion'}
                    </Text>
                    
                    <Text style={styles.reportDescription}>
                      {report.discussionId?.description || 'No description available'}
                    </Text>

                    <View style={styles.authorSection}>
                      <Text style={styles.authorLabel}>Author:</Text>
                      <Text style={styles.reportAuthor}>
                        {report.discussionId?.author || 'Anonymous'}
                      </Text>
                    </View>

                    <View style={styles.reporterSection}>
                      <Text style={styles.reporterLabel}>Reported by:</Text>
                      <Text style={styles.reporterInfo}>
                        {report.reporterUsername || 'Anonymous'}
                      </Text>
                    </View>
                  </View>

                {/* User Information for Banning */}
                {report.reportedUserId && (
                  <View style={styles.userInfoSection}>
                    <Text style={styles.userInfoTitle}>User Information:</Text>
                    <Text style={styles.userInfoText}>
                      User ID: {report.reportedUserId}
                    </Text>
                    <Text style={styles.userInfoText}>
                      Username: {report.reportedUsername || report.discussionId?.author || 'Unknown'}
                    </Text>
                  </View>
                )}

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

                  {/* Ban User Button - Show for all reports */}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.banButton]}
                    onPress={() => showBanUserModal(report)}
                  >
                    <Text style={styles.banButtonText}>
                      🚫 Ban User
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

        {/* Ban User Modal */}
        {banModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ban User</Text>
              
                             <Text style={styles.modalSubtitle}>
                 Banning: {selectedReportForBan?.reportedUsername || selectedReportForBan?.discussionId?.author || 'Unknown User'}
               </Text>
               
               {!selectedReportForBan?.reportedUserId && (
                 <Text style={styles.modalWarning}>
                   ⚠️ Note: No specific user ID found. You'll need to manually identify the user to ban.
                 </Text>
               )}

              <Text style={styles.inputLabel}>Ban Reason:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter reason for ban..."
                value={banReason}
                onChangeText={setBanReason}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Ban Duration:</Text>
              <View style={styles.durationButtons}>
                <TouchableOpacity
                  style={[
                    styles.durationButton,
                    banDuration === 'temporary' && styles.durationButtonActive
                  ]}
                  onPress={() => setBanDuration('temporary')}
                >
                  <Text style={[
                    styles.durationButtonText,
                    banDuration === 'temporary' && styles.durationButtonTextActive
                  ]}>
                    Temporary (7 days)
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.durationButton,
                    banDuration === 'permanent' && styles.durationButtonActive
                  ]}
                  onPress={() => setBanDuration('permanent')}
                >
                  <Text style={[
                    styles.durationButtonText,
                    banDuration === 'permanent' && styles.durationButtonTextActive
                  ]}>
                    Permanent
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setBanModalVisible(false)}
                  disabled={banningUser}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleBanUser}
                  disabled={banningUser}
                >
                  {banningUser ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Ban User</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
    textAlign: 'center',
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '600',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reportReasonContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  reportReason: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  reportTimeContainer: {
    alignItems: 'flex-end',
  },
  reportTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
  },
  reportContent: {
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 24,
  },
  reportDescription: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 22,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  authorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportAuthor: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  reporterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fef7f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  reporterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginRight: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reporterInfo: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  banButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  banButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // User info section styles
  userInfoSection: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  userInfoTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#0369a1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userInfoText: {
    fontSize: 13,
    color: '#0c4a6e',
    marginBottom: 4,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#dc2626',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 24,
    color: '#475569',
    fontWeight: '500',
  },
  modalWarning: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    fontSize: 15,
    minHeight: 100,
    color: '#1e293b',
    textAlignVertical: 'top',
  },
  durationButtons: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  durationButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  durationButtonActive: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  durationButtonTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#64748b',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
