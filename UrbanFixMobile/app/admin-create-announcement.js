import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import SessionManager from '../utils/sessionManager';
import { apiUrl } from '../constants/api';

export default function AdminCreateAnnouncement() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Other',
    customType: '',
    time: '',
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(formData.expirationDate);

  const announcementTypes = [
    'Power Outage',
    'Government Declaration',
    'Flood Warning',
    'Emergency Alert',
    'Public Service',
    'Infrastructure',
    'Health Advisory',
    'Transportation',
    'Weather Alert',
    'Community Event',
    'Other',
  ];

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return false;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return false;
    }

    if (formData.type === 'Other' && !formData.customType.trim()) {
      Alert.alert('Validation Error', 'Custom type is required when "Other" is selected');
      return false;
    }

    if (formData.expirationDate <= new Date()) {
      Alert.alert('Validation Error', 'Expiration date must be in the future');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const session = await SessionManager.getAdminSession();
      if (!session) {
        Alert.alert('Authentication Error', 'Please login again');
        router.replace('/admin-login');
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('type', formData.type);
      
      if (formData.type === 'Other' && formData.customType.trim()) {
        formDataToSend.append('customType', formData.customType.trim());
      }
      
      if (formData.time.trim()) {
        formDataToSend.append('time', formData.time.trim());
      }
      
      formDataToSend.append('expirationDate', formData.expirationDate.toISOString());

      if (selectedImage) {
        try {
          // Convert image to base64 for reliable cross-device upload
          const response = await fetch(selectedImage.uri);
          const blob = await response.blob();
          
          // Convert blob to base64
          const base64Promise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          
          const base64Data = await base64Promise;
          
          // Send as base64 string instead of FormData
          formDataToSend.append('imageBase64', base64Data);
          formDataToSend.append('imageFileName', selectedImage.fileName || `announcement-${Date.now()}.jpg`);
          
        } catch (imageError) {
          Alert.alert('Image Error', 'Failed to process image. Continuing without image.');
        }
      }

      const url = apiUrl('/api/announcements/admin');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.message || 'Failed to create announcement');
      }

      const createdAnnouncement = await response.json();

      Alert.alert(
        'Success',
        'Announcement created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', error.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const handleDateChange = (dateString) => {
    try {
      const newDate = new Date(dateString);
      if (!isNaN(newDate.getTime())) {
        setFormData(prev => ({ ...prev, expirationDate: newDate }));
      }
    } catch (error) {
      console.warn('Invalid date format');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Announcement</Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter announcement title"
              maxLength={200}
            />
          </View>

          {/* Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                style={styles.picker}
              >
                {announcementTypes.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Custom Type (when Other is selected) */}
          {formData.type === 'Other' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Custom Type *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.customType}
                onChangeText={(text) => setFormData(prev => ({ ...prev, customType: text }))}
                placeholder="Enter custom type"
                maxLength={50}
              />
            </View>
          )}

          {/* Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time</Text>
            <TextInput
              style={styles.textInput}
              value={formData.time}
              onChangeText={(text) => setFormData(prev => ({ ...prev, time: text }))}
              placeholder="e.g., 4 PM - 5 PM, July 15th 2024"
              maxLength={100}
            />
            <Text style={styles.helpText}>
              Optional: Specify when the event/situation will occur or duration
            </Text>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter detailed description of the announcement"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>
              {formData.description.length}/2000
            </Text>
          </View>

          {/* Expiration Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expiration Date *</Text>
            <TextInput
              style={styles.textInput}
              value={formatDateForInput(formData.expirationDate)}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.helpText}>
              Enter date in YYYY-MM-DD format (e.g., 2024-12-31). After this date, the announcement will be automatically archived.
            </Text>
          </View>

          {/* Image */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Image</Text>
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePicker}>
                <Ionicons name="camera-outline" size={32} color="#6b7280" />
                <Text style={styles.imagePickerText}>Add Image</Text>
                <Text style={styles.imagePickerSubtext}>Optional: Add an image to your announcement</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },

  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  imagePickerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
