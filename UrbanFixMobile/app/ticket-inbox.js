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
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../constants/api';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function TicketInbox() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const statuses = [
    { value: 'all', label: 'All', color: '#666' },
    { value: 'open', label: 'Open', color: '#2196F3' },
    { value: 'in_progress', label: 'In Progress', color: '#FF9800' },
    { value: 'resolved', label: 'Resolved', color: '#4CAF50' },
    { value: 'closed', label: 'Closed', color: '#9E9E9E' },
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'priority', label: 'Priority' },
    { value: 'subject', label: 'Subject' },
  ];

  const priorityColors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
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

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, sortBy, sortOrder]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl(`/api/tickets/user/${user._id}`), {
        params: {
          status: statusFilter,
          search: searchQuery,
          sort: sortBy,
          order: sortOrder,
        },
      });

      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      Alert.alert('Error', 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  const handleSearch = () => {
    fetchTickets();
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
              color={statuses.find(s => s.value === ticket.status)?.color}
            />
            <Text style={[
              styles.statusText,
              { color: statuses.find(s => s.value === ticket.status)?.color }
            ]}>
              {statuses.find(s => s.value === ticket.status)?.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.ticketMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Priority:</Text>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors[ticket.priority] }
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
        <Text style={styles.dateText}>
          Created {formatDate(ticket.createdAt)}
        </Text>
        
        {ticket.messages && ticket.messages.length > 1 && (
          <Text style={styles.messageCount}>
            {ticket.messages.length - 1} {ticket.messages.length === 2 ? 'reply' : 'replies'}
          </Text>
        )}
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
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <TouchableOpacity onPress={() => router.push('/create-ticket')}>
          <Text style={styles.headerBtn}>➕</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
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
          {statuses.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.statusBtn,
                statusFilter === status.value && styles.statusBtnActive,
                { borderColor: status.color }
              ]}
              onPress={() => setStatusFilter(status.value)}
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

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortBtn,
                  sortBy === option.value && styles.sortBtnActive
                ]}
                onPress={() => setSortBy(option.value)}
              >
                <Text style={[
                  styles.sortBtnText,
                  sortBy === option.value && styles.sortBtnTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.orderBtn}
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={20}
              color="#6b48ff"
            />
          </TouchableOpacity>
        </View>
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
                ? 'You haven\'t created any support tickets yet.'
                : `No ${statusFilter} tickets found.`
              }
            </Text>
            <TouchableOpacity
              style={styles.createTicketBtn}
              onPress={() => router.push('/create-ticket')}
            >
              <Text style={styles.createTicketBtnText}>Create Your First Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tickets.map(renderTicket)
        )}
      </ScrollView>
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
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
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
  createTicketBtn: {
    backgroundColor: '#6b48ff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createTicketBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
