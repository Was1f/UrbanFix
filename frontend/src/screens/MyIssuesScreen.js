import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const MyIssuesScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="list-outline" size={80} color="#ccc" />
        <Title style={styles.title}>My Issues</Title>
        <Paragraph style={styles.subtitle}>
          Track issues you've reported
        </Paragraph>
        <Paragraph style={styles.description}>
          This screen will display all issues reported by the current user,
          showing their status, progress updates, and allowing users to
          manage and update their reported issues.
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

export default MyIssuesScreen; 