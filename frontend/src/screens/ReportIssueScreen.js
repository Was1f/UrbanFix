import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const ReportIssueScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="add-circle-outline" size={80} color="#ccc" />
        <Title style={styles.title}>Report Issue</Title>
        <Paragraph style={styles.subtitle}>
          Report infrastructure problems in your community
        </Paragraph>
        <Paragraph style={styles.description}>
          This screen will allow users to report new issues with photos,
          location, description, and category selection. Users can take
          photos, select location on map, and provide detailed information
          about the problem.
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

export default ReportIssueScreen; 