// screens/CreatePostReport.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';
import API_URL from "../config/api";


const CreatePostReport = ({ navigation }) => {
  const { user: loggedInUser } = useContext(AuthContext);
  const [entryType, setEntryType] = useState('post'); // 'post' or 'report'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');


const userId = loggedInUser?._id;
  const userName = loggedInUser?.fname && loggedInUser?.lname
    ? `${loggedInUser.fname} ${loggedInUser.lname}`
    : loggedInUser?.name || 'User';

  const handleSave = async () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      const endpoint = entryType === 'post' ? '/api/posts' : '/api/reports';
      const res = await axios.post(`${API_URL}${endpoint}`, {
        userId,
        title,
        text: description,
      });

      console.log(`${entryType} created:`, res.data);
      Alert.alert('Success', `${entryType === 'post' ? 'Post' : 'Report'} created!`);

      // Reset fields
      setTitle('');
      setDescription('');
      navigation.goBack();
    } catch (err) {
      console.error('Save Error:', err.message);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {entryType === 'post' ? 'Create Post' : 'Create Report'}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerBtn, { color: '#1877f2' }]}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.userRow}>
        <Image
          source={require('../assets/profile.jpg')}
          style={styles.avatar}
        />
        <Text style={styles.userName}>{userName}</Text>
      </View>

      {/* Title Input */}
      <TextInput
        placeholder="Title (max 50 characters)"
        value={title}
        onChangeText={text => setTitle(text.slice(0, 50))}
        style={styles.titleInput}
        maxLength={50}
      />

      {/* Description Input */}
      <TextInput
        placeholder="Write something..."
        value={description}
        onChangeText={setDescription}
        style={styles.descriptionInput}
        multiline
      />

      {/* Toggle Buttons (Post/Report) */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'post' && styles.activeToggle]}
          onPress={() => setEntryType('post')}
        >
          <Text style={[styles.toggleText, entryType === 'post' && styles.activeText]}>
            Post
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, entryType === 'report' && styles.activeToggle]}
          onPress={() => setEntryType('report')}
        >
          <Text style={[styles.toggleText, entryType === 'report' && styles.activeText]}>
            Report
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreatePostReport;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 15, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerBtn: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 45, height: 45, borderRadius: 25, marginRight: 10 },
  userName: { fontSize: 16, fontWeight: '600' },
  titleInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15 },
  descriptionInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, minHeight: 120, textAlignVertical: 'top', marginBottom: 20 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center' },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 18, marginHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  activeToggle: { backgroundColor: '#1877f2' },
  toggleText: { fontWeight: '500', color: '#555' },
  activeText: { color: '#fff' },
});
