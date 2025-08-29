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
      let endpoint;
      if (selectedStatus === 'pending') {
        // For pending, fetch reports that need review
        endpoint = `/api/moderation/admin/reports?status=pending`;
      } else {
        // For approved/rejected/removed, fetch discussions with those statuses
        endpoint = `/api/admin/discussions?status=${selectedStatus}`;
      }

      const response = await fetch(apiUrl(endpoint), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (selectedStatus === 'pending') {
          setReports(data.reports || []);
        } else {
          // Convert discussions to report-like format for display
          const discussionReports = (data.discussions || []).map(discussion => ({
            _id: discussion._id,
            reason: discussion.adminNotes || 'No reason provided',
            status: discussion.status,
            createdAt: discussion.reviewedAt || discussion.createdAt,
            discussionId: discussion,
            reporterUsername: discussion.reviewedBy ? 'Admin' : 'System',
            reportedUserId: discussion.authorPhone,
            reportedUsername: discussion.author,
            context: discussion.reportContext // Include the report context
          }));
          setReports(discussionReports);
        }
      } else if (response.status === 401) {
        await handleSessionExpired();
        return;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
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
        return { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' };
      case 'rejected':
        return { backgroundColor: '#fef7f0', borderColor: '#fed7aa' };
      case 'removed':
        return { backgroundColor: '#fef2f2', borderColor: '#fecaca' };
      default:
        return { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' };
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

  const getActionButtonTextStyle = (action) => {
    switch (action) {
      case 'approved':
        return { color: '#10b981' };
      case 'rejected':
        return { color: '#f59e0b' };
      case 'removed':
        return { color: '#dc2626' };
      default:
        return { color: '#374151' };
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>
              {selectedStatus === 'pending' ? 'Moderation Panel' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Posts`}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Status Tabs */}
        <View style={styles.tabs}>
          {['pending', 'approved', 'rejected', 'removed'].map((status) => (
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
              <Text style={styles.emptyStateText}>
                {selectedStatus === 'pending' 
                  ? `No ${selectedStatus} reports` 
                  : `No ${selectedStatus} posts`
                }
              </Text>
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

                    {/* Additional Context Section */}
                    {report.context ? (
                      <View style={styles.contextSection}>
                        <Text style={styles.contextLabel}>Additional Context:</Text>
                        <Text style={styles.contextText}>
                          {report.context}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.noContextSection}>
                        <Text style={styles.noContextText}>No additional context provided</Text>
                      </View>
                    )}
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
                     <Text style={[styles.actionButtonText, getActionButtonTextStyle('approved')]}>
                       {getActionButtonText('approved')}
                     </Text>
                   </TouchableOpacity>

                   <TouchableOpacity
                     style={[styles.actionButton, getActionButtonStyle('rejected')]}
                     onPress={() => takeAction(report._id, 'rejected')}
                   >
                     <Text style={[styles.actionButtonText, getActionButtonTextStyle('rejected')]}>
                       {getActionButtonText('rejected')}
                     </Text>
                   </TouchableOpacity>

                   <TouchableOpacity
                     style={[styles.actionButton, getActionButtonStyle('removed')]}
                     onPress={() => takeAction(report._id, 'removed')}
                     >
                     <Text style={[styles.actionButtonText, getActionButtonTextStyle('removed')]}>
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
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
    textAlign: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSpacer: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeTab: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reportReasonContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  reportReason: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  reportTimeContainer: {
    alignItems: 'flex-end',
  },
  reportTime: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  reportContent: {
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  reportDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  authorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportAuthor: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    flex: 1,
  },
  reporterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fef7f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  reporterLabel: {
    fontSize: 11,
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
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  banButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  banButtonText: {
    color: '#dc2626',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // User info section styles
  userInfoSection: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  userInfoTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: '#0369a1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userInfoText: {
    fontSize: 12,
    color: '#0c4a6e',
    marginBottom: 4,
    fontWeight: '500',
  },
  // Context section styles
  contextSection: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // No context styles
  noContextSection: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  noContextText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#dc2626',
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalWarning: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14,
    minHeight: 80,
    color: '#111827',
    textAlignVertical: 'top',
  },
  durationButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  durationButtonActive: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  durationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  durationButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
