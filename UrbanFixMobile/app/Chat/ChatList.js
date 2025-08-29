// app/Chat/ChatList.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import axios from 'axios';

const API_URL = 'http://YOUR_SERVER_IP:5000/api/chat';

export default function ChatList({ navigation, route }) {
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await axios.get(`${API_URL}/${userId}`);
        if (res.data.success) {
          // Build unique conversations
          const convMap = {};
          res.data.chats.forEach(chat => {
            const otherId = chat.senderId === userId ? chat.receiverId : chat.senderId;
            convMap[otherId] = chat;
          });
          setThreads(Object.values(convMap));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchThreads();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <FlatList
      data={threads}
      keyExtractor={item => item._id}
      renderItem={({ item }) => {
        const otherId = item.senderId === userId ? item.receiverId : item.senderId;
        return (
          <TouchableOpacity
            style={styles.thread}
            onPress={() => navigation.navigate('ChatRoom', { userId, receiver: otherId })}
          >
            <Text style={styles.name}>{otherId}</Text>
            <Text numberOfLines={1} style={styles.lastMessage}>{item.message}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  thread: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  name: { fontWeight: '700', marginBottom: 4 },
  lastMessage: { color: '#555' },
});
