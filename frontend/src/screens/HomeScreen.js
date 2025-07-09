import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Card, Title, Paragraph, Chip, FAB, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { issueAPI } from '../services/api';
import { showMessage } from 'react-native-flash-message';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issueAPI.getAll({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
      setIssues(response.data.issues);
    } catch (error) {
      console.error('Error fetching issues:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to load issues',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIssues();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported':
        return '#FF9800';
      case 'under_review':
        return '#2196F3';
      case 'in_progress':
        return '#9C27B0';
      case 'resolved':
        return '#4CAF50';
      case 'closed':
        return '#757575';
      default:
        return '#757575';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'pothole':
        return 'car-outline';
      case 'streetlight':
        return 'bulb-outline';
      case 'garbage':
        return 'trash-outline';
      case 'traffic_sign':
        return 'traffic-light-outline';
      case 'sidewalk':
        return 'walk-outline';
      case 'drainage':
        return 'water-outline';
      case 'tree_maintenance':
        return 'leaf-outline';
      case 'graffiti':
        return 'brush-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const renderIssueCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('IssueDetail', { issueId: item._id })}
    >
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.categoryContainer}>
              <Ionicons
                name={getCategoryIcon(item.category)}
                size={20}
                color="#2196F3"
              />
              <Text style={styles.categoryText}>
                {item.category.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <Chip
              mode="outlined"
              textStyle={{ color: getStatusColor(item.status) }}
              style={[styles.statusChip, { borderColor: getStatusColor(item.status) }]}
            >
              {item.status.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>

          <Title style={styles.issueTitle}>{item.title}</Title>
          <Paragraph style={styles.issueDescription} numberOfLines={2}>
            {item.description}
          </Paragraph>

          <View style={styles.cardFooter}>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location.address}
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Ionicons name="thumbs-up-outline" size={16} color="#4CAF50" />
                <Text style={styles.statText}>{item.upvotes?.length || 0}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={16} color="#2196F3" />
                <Text style={styles.statText}>{item.comments?.length || 0}</Text>
              </View>
            </View>
          </View>

          <View style={styles.reporterContainer}>
            <Text style={styles.reporterText}>
              Reported by {item.reporter?.username || 'Anonymous'}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading issues...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back, {user?.fullName || user?.username}!</Text>
        <Text style={styles.subtitleText}>Here are the latest issues in your area</Text>
      </View>

      <FlatList
        data={issues}
        renderItem={renderIssueCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No issues found</Text>
            <Text style={styles.emptySubtext}>Be the first to report an issue!</Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('Report')}
        label="Report Issue"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  card: {
    marginBottom: 15,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  issueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  issueDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  statText: {
    marginLeft: 3,
    fontSize: 12,
    color: '#666',
  },
  reporterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reporterText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});

export default HomeScreen; 