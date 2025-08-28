import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiUrl } from '../constants/api';
import { Ionicons } from '@expo/vector-icons';
import SessionManager from '../utils/sessionManager';

export default function AdminTickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    checkSessionAndLoadData();
  }, []);

  useEffect(() => {
    if (session?.token) {
      fetchTickets(session.token);
      fetchStats(session.token);
    }
  }, [session?.token]);

  useFocusEffect(
    React.useCallback(() => {
      if (session?.token) {
        fetchTickets(session.token);
        fetchStats(session.token);
      } else {
        // If no session, try to check and load it
        checkSessionAndLoadData();
      }
    }, [session?.token])
  );

  const checkSessionAndLoadData = async () => {
    try {
      const adminSession = await SessionManager.getAdminSession();
      
      if (adminSession && adminSession.token) {
        setSession(adminSession);
        // Fetch data immediately without delay
        await fetchTickets(adminSession.token);
        await fetchStats(adminSession.token);
      } else {
        // Debug: check what's in AsyncStorage
        const debugInfo = await SessionManager.debugAdminSession();
        console.log('Debug session info:', debugInfo);
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Session check error:', error);
      router.replace('/admin-login');
    }
  };

  const fetchTickets = async (authToken) => {
    try {
      setLoading(true);
      
      if (!authToken) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        search: searchQuery,
        sort: sortBy,
        order: sortOrder,
      });

      const url = apiUrl(`/api/tickets/admin/all?${params}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else if (response.status === 401) {
        // Token expired or invalid
        await handleSessionExpired();
        return;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (authToken) => {
    try {
      if (!authToken) {
        return;
      }

      const response = await fetch(apiUrl('/api/tickets/admin/stats'), {
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
      }
    } catch (error) {
      // Silent error handling for stats
    }
  };

  const handleSessionExpired = async () => {
    await SessionManager.clearAdminSession();
    Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
      { text: 'OK', onPress: () => router.replace('/admin-login') }
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (session?.token) {
      await Promise.all([fetchTickets(session.token), fetchStats(session.token)]);
    }
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (session?.token) {
      // Create params with current filters
      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        search: searchQuery,
        sort: sortBy,
        order: sortOrder,
      });
      
      const url = apiUrl(`/api/tickets/admin/all?${params}`);
      
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(data => {
        setTickets(data.tickets || []);
      })
      .catch(error => {
        Alert.alert('Error', 'Failed to search tickets. Please try again.');
      });
    }
  };

  const openFilterModal = () => {
    setShowFilterModal(true);
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
  };

  const handleTicketPress = (ticket) => {
    router.push({
      pathname: '/ticket-detail',
      params: { ticketId: ticket._id }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return 'ellipse-outline';
      case 'in_progress':
        return 'time-outline';
      case 'resolved':
        return 'checkmark-circle-outline';
      case 'closed':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#2196F3';
      case 'in_progress': return '#FF9800';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#666';
    }
  };

  const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  const categoryLabels = {
    general: 'General',
    technical: 'Technical',
    complaint: 'Complaint',
    suggestion: 'Suggestion',
    bug_report: 'Bug Report',
    other: 'Other',
  };

  const renderTicket = (ticket) => (
    <TouchableOpacity
      key={ticket._id}
      style={styles.ticketCard}
      onPress={() => handleTicketPress(ticket)}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketTitleRow}>
          <Text style={styles.ticketSubject} numberOfLines={1}>
            {ticket.subject}
          </Text>
          <View style={styles.ticketStatus}>
            <Ionicons
              name={getStatusIcon(ticket.status)}
              size={16}
              color={getStatusColor(ticket.status)}
            />
            <Text style={[
              styles.statusText,
              { color: getStatusColor(ticket.status) }
            ]}>
              {ticket.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.ticketMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Priority:</Text>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(ticket.priority) }
            ]}>
              <Text style={styles.priorityText}>
                {priorityLabels[ticket.priority]}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Category:</Text>
            <Text style={styles.categoryText}>
              {categoryLabels[ticket.category]}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.ticketDescription} numberOfLines={2}>
        {ticket.description}
      </Text>

      <View style={styles.ticketFooter}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {ticket.user?.fname} {ticket.user?.lname}
          </Text>
          <Text style={styles.userContact}>
            {ticket.user?.phone} • {ticket.user?.email}
          </Text>
        </View>
        
        <View style={styles.ticketInfo}>
          <Text style={styles.dateText}>
            Created {formatDate(ticket.createdAt)}
          </Text>
          
          {ticket.messages && ticket.messages.length > 1 && (
            <Text style={styles.messageCount}>
              {ticket.messages.length - 1} {ticket.messages.length === 2 ? 'reply' : 'replies'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6b48ff" />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket Management</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}



      {/* Search and Filter Button */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
          {[
            { value: 'all', label: 'All', color: '#666' },
            { value: 'open', label: 'Open', color: '#2196F3' },
            { value: 'in_progress', label: 'In Progress', color: '#FF9800' },
            { value: 'resolved', label: 'Resolved', color: '#4CAF50' },
            { value: 'closed', label: 'Closed', color: '#9E9E9E' },
          ].map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.statusBtn,
                statusFilter === status.value && styles.statusBtnActive,
                { borderColor: status.color }
              ]}
                             onPress={() => {
                 setStatusFilter(status.value);
                 if (session?.token) {
                   fetchTickets(session.token);
                 }
               }}
            >
              <Text style={[
                styles.statusBtnText,
                statusFilter === status.value && styles.statusBtnTextActive,
                { color: statusFilter === status.value ? 'white' : status.color }
              ]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filter Button */}
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Ionicons name="filter" size={20} color="white" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      <ScrollView
        style={styles.ticketsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'all' 
                ? 'No tickets match your current filters.'
                : `No ${statusFilter} tickets found.`
              }
            </Text>
          </View>
        ) : (
          tickets.map(renderTicket)
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={closeFilterModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Priority Filter */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Priority</Text>
              <View style={styles.modalOptions}>
                {[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ].map((priority) => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[
                      styles.modalOption,
                      priorityFilter === priority.value && styles.modalOptionActive
                    ]}
                                         onPress={() => {
                       setPriorityFilter(priority.value);
                     }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      priorityFilter === priority.value && styles.modalOptionTextActive
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Filter */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Category</Text>
              <View style={styles.modalOptions}>
                {[
                  { value: 'all', label: 'All Categories' },
                  { value: 'general', label: 'General' },
                  { value: 'technical', label: 'Technical' },
                  { value: 'complaint', label: 'Complaint' },
                  { value: 'suggestion', label: 'Suggestion' },
                  { value: 'bug_report', label: 'Bug Report' },
                  { value: 'other', label: 'Other' },
                ].map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.modalOption,
                      categoryFilter === category.value && styles.modalOptionActive
                    ]}
                                         onPress={() => {
                       setCategoryFilter(category.value);
                     }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      categoryFilter === category.value && styles.modalOptionTextActive
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Sort By</Text>
              <View style={styles.modalOptions}>
                {[
                  { value: 'createdAt', label: 'Date Created' },
                  { value: 'updatedAt', label: 'Last Updated' },
                  { value: 'priority', label: 'Priority' },
                  { value: 'subject', label: 'Subject' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      sortBy === option.value && styles.modalOptionActive
                    ]}
                                         onPress={() => {
                       setSortBy(option.value);
                     }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      sortBy === option.value && styles.modalOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Order */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Sort Order</Text>
              <View style={styles.modalOptions}>
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    sortOrder === 'asc' && styles.modalOptionActive
                  ]}
                                     onPress={() => {
                     setSortOrder('asc');
                   }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    sortOrder === 'asc' && styles.modalOptionTextActive
                  ]}>
                    Ascending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    sortOrder === 'desc' && styles.modalOptionActive
                  ]}
                                     onPress={() => {
                     setSortOrder('desc');
                   }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    sortOrder === 'desc' && styles.modalOptionTextActive
                  ]}>
                    Descending
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.resetButton} onPress={() => {
                setPriorityFilter('all');
                setCategoryFilter('all');
                setSortBy('createdAt');
                setSortOrder('desc');
              }}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
                             <TouchableOpacity style={styles.applyButton} onPress={() => {
                 closeFilterModal();
                 if (session?.token) {
                   // Create params with current filters
                   const params = new URLSearchParams({
                     status: statusFilter,
                     priority: priorityFilter,
                     category: categoryFilter,
                     search: searchQuery,
                     sort: sortBy,
                     order: sortOrder,
                   });
                   
                   const url = apiUrl(`/api/tickets/admin/all?${params}`);
                   
                   fetch(url, {
                     headers: {
                       'Authorization': `Bearer ${session.token}`,
                       'Content-Type': 'application/json',
                     },
                   })
                   .then(response => response.json())
                   .then(data => {
                     setTickets(data.tickets || []);
                   })
                   .catch(error => {
                     Alert.alert('Error', 'Failed to apply filters. Please try again.');
                   });
                 }
               }}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#6b48ff',
  },
  headerBtn: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b48ff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  searchBtn: {
    backgroundColor: '#6b48ff',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  filterButton: {
    backgroundColor: '#6b48ff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  filterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusFilter: {
    marginBottom: 16,
  },
  statusBtn: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: 'white',
  },
  statusBtnActive: {
    backgroundColor: '#6b48ff',
    borderColor: '#6b48ff',
  },
  statusBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBtnTextActive: {
    color: 'white',
  },
  filterRow: {
    marginBottom: 12,
  },
  priorityFilter: {
    marginBottom: 8,
  },
  categoryFilter: {
    marginBottom: 8,
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'white',
  },
  filterBtnActive: {
    backgroundColor: '#6b48ff',
    borderColor: '#6b48ff',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#666',
  },
  filterBtnTextActive: {
    color: 'white',
  },

  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  sortBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'white',
  },
  sortBtnActive: {
    backgroundColor: '#6b48ff',
    borderColor: '#6b48ff',
  },
  sortBtnText: {
    fontSize: 12,
    color: '#666',
  },
  sortBtnTextActive: {
    color: 'white',
  },
  orderBtn: {
    padding: 8,
    marginLeft: 8,
  },
  ticketsList: {
    flex: 1,
    padding: 16,
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 12,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  ticketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  ticketDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userContact: {
    fontSize: 12,
    color: '#666',
  },
  ticketInfo: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  messageCount: {
    fontSize: 12,
    color: '#6b48ff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '85%',
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    marginRight: 6,
    marginBottom: 6,
  },
  modalOptionActive: {
    backgroundColor: '#6b48ff',
    borderColor: '#6b48ff',
  },
  modalOptionText: {
    fontSize: 13,
    color: '#666',
  },
  modalOptionTextActive: {
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#6b48ff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
