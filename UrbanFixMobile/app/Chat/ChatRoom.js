// app/Chat/ChatRoom.js
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import axios from 'axios';

const API_URL = 'http://YOUR_SERVER_IP:5000/api/chat';

export default function ChatRoom({ route }) {
  const { userId, receiver } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/${userId}`);
      if (res.data.success) {
        const convMessages = res.data.chats
          .filter(chat => chat.senderId === receiver || chat.receiverId === receiver)
          .map(chat => ({
            _id: chat._id,
            text: chat.message,
            createdAt: new Date(chat.createdAt),
            user: {
              _id: chat.senderId === userId ? 1 : 2,
              name: chat.senderId === userId ? 'You' : 'Them'
            }
          }))
          .reverse();
        setMessages(convMessages);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const onSend = useCallback(async (newMessages = []) => {
    const [message] = newMessages;
    setMessages(prev => GiftedChat.append(prev, message));

    try {
      await axios.post(API_URL, {
        senderId: userId,
        receiver,
        message: message.text
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to send message');
    }
  }, [userId, receiver]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={{ _id: 1 }}
      showUserAvatar
      alwaysShowSend
    />
  );
}
