// UrbanFixMobile/app/index.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { useRouter } from 'expo-router';

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
        const boardsRes = await fetch('http://192.168.56.1:5000/api/boards');
        const boardsData = await boardsRes.json();

        const discussionsRes = await fetch('http://192.168.56.1:5000/api/discussions');
        const discussionsData = await discussionsRes.json();

        setBoards(boardsData);
        setDiscussions(discussionsData);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Explore Boards</Text>

      <View style={styles.tags}>
        <Text style={styles.tag}>Nearby</Text>
        <Text style={styles.tag}>Trending 🔥</Text>
        <Text style={styles.tag}>New 🆕</Text>
        <Text style={styles.tag}>Your Boards ⭐</Text>
      </View>

      <Text style={styles.subheading}>Boards Near You</Text>
      <FlatList
        data={boards}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.boardCard}>
            {/* If your backend provides image URLs, use them. Otherwise, use a placeholder. */}
            <Image
              source={item.image ? { uri: item.image } : require('../assets/placeholder.png')}
              style={styles.boardImage}
            />
            <Text style={styles.boardTitle}>{item.title}</Text>
            <Text style={styles.boardPosts}>{item.posts} posts</Text>
          </View>
        )}
      />

      <Text style={styles.subheading}>Trending Discussions</Text>
      {discussions.map((d, index) => (
        <View style={styles.discussionCard} key={d._id || index}>
          <Text style={styles.typeTag}>{d.type}</Text>
          <Image
            source={d.image ? { uri: d.image } : require('../assets/placeholder.png')}
            style={styles.discussionImage}
          />
          <View style={styles.content}>
            <Text style={styles.discussionTitle}>{d.title}</Text>
            <Text style={styles.discussionAuthor}>
              By {d.author}, {d.time}
            </Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#4b4b4b',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  tag: {
    backgroundColor: '#eef1f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    color: '#333',
    fontWeight: '500',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  boardCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginRight: 15,
    padding: 10,
    width: 200,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  boardImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  boardTitle: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  boardPosts: {
    color: '#666',
    fontSize: 13,
  },
  discussionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  typeTag: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#ffefef',
    color: '#c00',
    padding: 6,
    alignSelf: 'flex-start',
    margin: 10,
    borderRadius: 20,
  },
  discussionImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  content: {
    padding: 10,
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  discussionAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    backgroundColor: '#1e90ff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
    right: 30,
    elevation: 6,
  },
  fabText: {
    fontSize: 30,
    color: 'white',
  },
});

export default CommunityHome;
