import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../constants/api';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function CreateTicket() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [attachments, setAttachments] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const priorities = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FF9800' },
    { value: 'high', label: 'High', color: '#F44336' },
  ];

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'other', label: 'Other' },
  ];

  const convertImageToBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingImage(true);
        const asset = result.assets[0];
        
        try {
          const base64Image = await convertImageToBase64(asset.uri);
          
          const uploadRes = await axios.post(apiUrl('/api/upload/base64'), {
            imageBase64: base64Image,
            imageFileName: asset.fileName || 'ticket-attachment.jpg',
            type: 'ticket'
          });

          if (uploadRes.data.success) {
            const newAttachment = {
              uri: uploadRes.data.filePath,
              type: 'image/jpeg',
              size: 0,
              filename: asset.fileName || 'ticket-attachment.jpg'
            };
            setAttachments([...attachments, newAttachment]);
            Alert.alert('Success', 'Image attached successfully!');
          } else {
            Alert.alert('Error', 'Failed to upload image.');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in both subject and description.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(apiUrl('/api/tickets'), {
        userId: user._id,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
        attachments
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Ticket created successfully! An admin will respond soon.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Support Ticket</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.headerBtn}>📤</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Subject */}
        <Text style={styles.label}>Subject *</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Brief description of your issue"
          maxLength={100}
        />

        {/* Priority */}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          {priorities.map((priorityItem) => (
            <TouchableOpacity
              key={priorityItem.value}
              style={[
                styles.priorityBtn,
                priority === priorityItem.value && styles.priorityBtnActive,
                { borderColor: priorityItem.color }
              ]}
              onPress={() => setPriority(priorityItem.value)}
            >
              <Text style={[
                styles.priorityText,
                priority === priorityItem.value && styles.priorityTextActive,
                { color: priority === priorityItem.value ? priorityItem.color : '#666' }
              ]}>
                {priorityItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {categories.map((categoryItem) => (
            <TouchableOpacity
              key={categoryItem.value}
              style={[
                styles.categoryBtn,
                category === categoryItem.value && styles.categoryBtnActive
              ]}
              onPress={() => setCategory(categoryItem.value)}
            >
              <Text style={[
                styles.categoryText,
                category === categoryItem.value && styles.categoryTextActive
              ]}>
                {categoryItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Please provide detailed information about your issue..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Attachments */}
        <Text style={styles.label}>Attachments</Text>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handleImageUpload}
          disabled={uploadingImage}
        >
          <Text style={styles.attachBtnText}>
            {uploadingImage ? 'Uploading...' : '📎 Attach Image'}
          </Text>
          {uploadingImage && <ActivityIndicator size="small" color="#6b48ff" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        {/* Display Attachments */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsTitle}>Attached Images:</Text>
            {attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentItem}>
                <Image
                  source={{ uri: `${apiUrl('')}${attachment.uri}` }}
                  style={styles.attachmentImage}
                />
                <TouchableOpacity
                  style={styles.removeAttachmentBtn}
                  onPress={() => removeAttachment(index)}
                >
                  <Text style={styles.removeAttachmentText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Create Ticket</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#6b48ff',
  },
  headerBtn: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priorityBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  priorityBtnActive: {
    backgroundColor: '#f0f0f0',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priorityTextActive: {
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    minWidth: '48%',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  categoryBtnActive: {
    backgroundColor: '#6b48ff',
    borderColor: '#6b48ff',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6b48ff',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f8f9ff',
  },
  attachBtnText: {
    fontSize: 16,
    color: '#6b48ff',
    fontWeight: '600',
  },
  attachmentsContainer: {
    marginTop: 16,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  attachmentItem: {
    position: 'relative',
    marginBottom: 12,
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAttachmentText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#6b48ff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
