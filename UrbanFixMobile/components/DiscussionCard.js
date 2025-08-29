// components/DiscussionCard.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DiscussionCard({ discussion }) {
  return (
    <View style={styles.card}>
      {/* Title */}
      <Text style={styles.title}>{discussion.title}</Text>

      {/* Author & Meta */}
      <View style={styles.metaRow}>
        <Ionicons name="person-circle-outline" size={18} color="#6b7280" />
        <Text style={styles.metaText}>
          {discussion.author || 'Anonymous'} • {discussion.time || 'Just now'}
        </Text>
      </View>

      {/* Description */}
      {discussion.description ? (
        <Text style={styles.description}>{discussion.description}</Text>
      ) : null}

      {/* Image (if exists) */}
      {discussion.image ? (
        <Image source={{ uri: discussion.image }} style={styles.postImage} />
      ) : null}

      {/* Footer: Type + Likes + Comments */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="pricetag-outline" size={16} color="#6366f1" />
          <Text style={styles.footerText}>{discussion.type}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="heart-outline" size={16} color="#ef4444" />
          <Text style={styles.footerText}>{discussion.likeCount || 0}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
          <Text style={styles.footerText}>{discussion.comments?.length || 0}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#4b5563',
    marginLeft: 4,
  },
});
