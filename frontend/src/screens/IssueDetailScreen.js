import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const IssueDetailScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="document-text-outline" size={80} color="#ccc" />
        <Title style={styles.title}>Issue Details</Title>
        <Paragraph style={styles.subtitle}>
          View detailed information about reported issues
        </Paragraph>
        <Paragraph style={styles.description}>
          This screen will display comprehensive information about a specific issue,
          including photos, location, status updates, comments, and voting options.
          Users can interact with the issue by voting, commenting, and tracking progress.
        </Paragraph>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default IssueDetailScreen; 