import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
  Alert,
} from 'react-native';

import { useRouter } from 'expo-router';
import { apiUrl } from '../constants/api';
const { width } = Dimensions.get("window");

const CommunityHome = () => {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Replace these URLs with your actual backend endpoints
        const boardsRes = await fetch(apiUrl('/api/boards'));
        const boardsData = await boardsRes.json();

        const discussionsRes = await fetch(apiUrl('/api/discussions'));
        const discussionsData = await discussionsRes.json();
        
        setBoards(boardsData);
        setDiscussions(discussionsData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh data when component becomes focused
    const unsubscribe = router.addListener?.('focus', fetchData);
    return unsubscribe;
  }, []);

  const handleReport = async (discussionId, title) => {
    try {
      const response = await fetch(apiUrl('/api/moderation/user/report'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discussionId,
          reason: 'Inappropriate Content',
          reporterUsername: 'Anonymous'
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Report submitted successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error reporting:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6c47ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable 
          style={styles.retryButton}
          onPress={retryFetch}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Explore Boards</Text>
        <TouchableOpacity 
          style={styles.adminButton} 
          onPress={() => router.push('/admin-login')}
        >
          <Text style={styles.adminButtonText}>Admin</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Navigation Tags */}
        <View style={styles.tagsRow}>
          {[
            { label: "All Posts", route: "/discussions" },
            { label: "Trending 🔥", route: "/trending" },
            { label: "Recent 🆕", route: "/recent" },
            { label: "My Area ⭐", route: "/my-area" },
          ].map((tag) => (
            <Pressable
              key={tag.label}
              style={({ pressed }) => [
                styles.tagButton,
                pressed && { backgroundColor: "#e9e4ff" },
              ]}
              onPress={() => router.push(tag.route)}
            >
              <Text style={styles.tagText}>{tag.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Location Boards */}
        <Text style={styles.sectionTitle}>Browse by Location</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={boards}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.boardCard,
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
              onPress={() => handleBoardPress(item)}
            >
              <View style={styles.boardImageContainer}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.boardImage}
                  />
                ) : (
                  <View style={[styles.boardImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>
                      {item.title.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.boardTitle}>{item.title}</Text>
              <Text style={styles.boardPosts}>
                {item.posts || 0} post{item.posts !== 1 ? 's' : ''}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No location boards available</Text>
            </View>
          }
        />

        {/* Recent Discussions */}
        <Text style={styles.sectionTitle}>Recent Discussions</Text>
        {discussions.length > 0 ? (
          discussions.slice(0, 10).map((discussion, idx) => (
            <View style={styles.discussionCard} key={discussion._id || idx}>
              <View style={styles.discussionHeader}>
                <View style={styles.typePill}>
                  <Text style={styles.typeText}>{discussion.type}</Text>
                </View>
                <Text style={styles.locationText}>📍 {discussion.location}</Text>
              </View>
              
              {discussion.image && (
                <Image
                  source={{ uri: discussion.image }}
                  style={styles.discussionImage}
                />
              )}
              
              {discussion.audio && (
                <View style={styles.audioIndicator}>
                  <Text style={styles.audioText}>🎵 Audio attached</Text>
                </View>
              )}
              
              <View style={styles.discussionContent}>
                <Text style={styles.discussionTitle}>{discussion.title}</Text>
                {discussion.description ? (
                  <Text style={styles.discussionDescription} numberOfLines={2}>
                    {discussion.description}
                  </Text>
                ) : null}
                <Text style={styles.discussionAuthor}>
                  By {discussion.author || "Anonymous"} • {formatTimeAgo(discussion.createdAt || discussion.time)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No discussions yet</Text>
            <Text style={styles.emptySubtext}>Be the first to start a conversation!</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && { backgroundColor: "#5a3ed6" },
        ]}
        onPress={() => router.push("/create-post")}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f8fb" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f8fb",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#6c47ff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 20,
    color: "#6c47ff",
  },
  tagsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  tagButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6c47ff",
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: "#6c47ff", fontWeight: "500" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    color: "#1e1e1e",
  },
  boardCard: {
    width: width * 0.4,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginLeft: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  boardImageContainer: {
    width: "100%",
    height: 80,
    marginBottom: 8,
  },
  boardImage: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 8 
  },
  placeholderImage: {
    backgroundColor: "#6c47ff",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  boardTitle: { 
    fontWeight: "600", 
    fontSize: 15,
    color: "#1e1e1e",
    marginBottom: 4,
  },
  boardPosts: { 
    fontSize: 12, 
    color: "#666" 
  },
  discussionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  discussionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    paddingBottom: 8,
  },
  typePill: {
    backgroundColor: "#e9e4ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: { 
    fontSize: 12, 
    color: "#6c47ff", 
    fontWeight: "600" 
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  discussionImage: { 
    width: "100%", 
    height: 120,
    resizeMode: "cover",
  },
  audioIndicator: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  audioText: {
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
  },
  discussionContent: {
    padding: 12,
  },
  discussionTitle: { 
    fontWeight: "600", 
    fontSize: 16,
    color: "#1e1e1e",
    marginBottom: 4,
  },
  discussionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  discussionAuthor: { 
    fontSize: 12, 
    color: "#999",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  reportButton: {
    backgroundColor: '#ffefef',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  reportButtonText: {
    color: '#c00',
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#6c47ff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { 
    fontSize: 28, 
    color: "#fff",
    fontWeight: "300",
  },
});

export default CommunityHome;