import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { apiUrl } from '../constants/api';
import uploadService from '../services/uploadService'; // Import our upload service

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Report');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [audioUri, setAudioUri] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Poll
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollPrivate, setPollPrivate] = useState(false);

  // Event
  const [eventDate, setEventDate] = useState(''); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(''); // HH:MM

  // Donation
  const [goalAmount, setGoalAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');

  // Volunteer
  const [volunteersNeeded, setVolunteersNeeded] = useState('');
  const [skills, setSkills] = useState('');

  const locations = [
    'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal',
    'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj', 'Gazipur', 'Bogra',
    'Jessore', 'Dinajpur', 'Pabna', 'Faridpur', 'Kushtia', 'Tangail',
    'Jamalpur', 'Narsingdi'
  ];

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to select images!');
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        Alert.alert('Success', 'Image selected successfully!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos!');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        Alert.alert('Success', 'Photo taken successfully!');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate file size (max 50MB)
        if (asset.size && asset.size > 50 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Audio file must be less than 50MB');
          return;
        }
        
        setAudioUri(asset.uri);
        Alert.alert('Success', 'Audio file selected successfully!');
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };
  const testUpload = async () => {
    try {
      // Test with a simple fetch first
      const testResponse = await fetch(apiUrl('/api/upload/single'), {
        method: 'GET', // Just to test connectivity
      });
      console.log('Server connectivity test:', testResponse.status);
      
      // Then test actual image picking and upload
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      
      if (!result.canceled) {
        console.log('Image picked:', result.assets[0]);
        const uploadResult = await uploadService.uploadFile(result.assets[0].uri, 'image');
        console.log('Upload result:', uploadResult);
      }
    } catch (error) {
      console.error('Test upload error:', error);
    }
  };
  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose an option to add an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImageFromGallery },
        { text: 'Remove Image', onPress: () => setImageUri(''), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const uploadFile = async (uri, fileType) => {
    try {
      // Validate file before upload
      await uploadService.validateFile(uri, fileType);
      
      // Set up progress tracking
      setUploadProgress(prev => ({ ...prev, [fileType]: 0 }));
      
      // Upload file using the service
      const result = await uploadService.uploadFile(uri, fileType);
      
      setUploadProgress(prev => ({ ...prev, [fileType]: 100 }));
      
      return result.url; // Return the uploaded file URL
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => ({ ...prev, [fileType]: undefined }));
      throw new Error(`Failed to upload ${fileType}: ${error.message}`);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    } else {
      Alert.alert('Limit Reached', 'You can add up to 6 poll options');
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title cannot be empty');
      return false;
    }
    if (!location) {
      Alert.alert('Validation Error', 'Please select a location');
      return false;
    }
    if (type === 'Poll') {
      const normalized = [...new Set(pollOptions.map(o => o.trim()).filter(Boolean))];
      if (normalized.length < 2) {
        Alert.alert('Validation Error', 'Poll must have at least 2 unique options');
        return false;
      }
    }
    if (type === 'Event') {
      if (!eventDate.trim()) {
        Alert.alert('Validation Error', 'Event date is required');
        return false;
      }
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(eventDate.trim())) {
        Alert.alert('Validation Error', 'Event date must be in YYYY-MM-DD format');
        return false;
      }
    }
    if (type === 'Donation') {
      if (goalAmount && isNaN(goalAmount)) {
        Alert.alert('Validation Error', 'Goal amount must be a valid number');
        return false;
      }
      if (currentAmount && isNaN(currentAmount)) {
        Alert.alert('Validation Error', 'Current amount must be a valid number');
        return false;
      }
    }
    if (type === 'Volunteer') {
      if (volunteersNeeded && isNaN(volunteersNeeded)) {
        Alert.alert('Validation Error', 'Number of volunteers must be a valid number');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsUploading(true);
      setUploadProgress({});

      // Upload files if they exist
      let uploadedImageUrl = '';
      let uploadedAudioUrl = '';

      if (imageUri) {
        try {
          uploadedImageUrl = await uploadFile(imageUri, 'image');
        } catch (error) {
          Alert.alert('Upload Error', `Image upload failed: ${error.message}`);
          return;
        }
      }

      if (audioUri) {
        try {
          uploadedAudioUrl = await uploadFile(audioUri, 'audio');
        } catch (error) {
          Alert.alert('Upload Error', `Audio upload failed: ${error.message}`);
          return;
        }
      }

      // Common fields
      const postData = {
        title: title.trim(),
        description: description.trim(),
        type,
        author: 'Anonymous', // In production, get from auth context
        location,
        ...(uploadedImageUrl && { image: uploadedImageUrl }),
        ...(uploadedAudioUrl && { audio: uploadedAudioUrl }),
      };

      // Type specifics
      if (type === 'Poll') {
        const validOptions = [...new Set(pollOptions.map(o => o.trim()).filter(Boolean))];
        postData.pollOptions = validOptions;
        postData.pollVotes = Object.fromEntries(validOptions.map(opt => [opt, 0]));
        postData.userVotes = {};
        postData.pollPrivate = !!pollPrivate;
      }

      if (type === 'Event') {
        postData.eventDate = eventDate.trim() ? new Date(eventDate.trim()) : null;
        postData.eventTime = eventTime.trim();
        postData.attendees = [];
        postData.attendeeCount = 0;
      }

      if (type === 'Donation') {
        postData.goalAmount = goalAmount ? parseFloat(goalAmount) : null;
        postData.currentAmount = currentAmount ? parseFloat(currentAmount) : 0;
        postData.donors = [];
      }

      if (type === 'Volunteer') {
        postData.volunteersNeeded = volunteersNeeded ? parseInt(volunteersNeeded, 10) : null;
        postData.skills = skills.trim();
        postData.volunteers = [];
        postData.volunteerCount = 0;
      }

      const res = await fetch(apiUrl('/api/discussions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create post');
      }

      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error('Error posting:', e);
      Alert.alert('Error', e.message || 'Network or server error');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const renderUploadProgress = (fileType) => {
    const progress = uploadProgress[fileType];
    if (progress === undefined) return null;
    
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Uploading {fileType}... {progress}%</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  const renderPollFields = () => {
    if (type !== 'Poll') return null;
    return (
      <View style={styles.typeSpecificSection}>
        <Text style={styles.sectionTitle}>Poll Options</Text>
        {pollOptions.map((option, index) => (
          <View key={index} style={styles.pollOptionContainer}>
            <TextInput
              style={[styles.input, styles.pollOptionInput]}
              placeholder={`Option ${index + 1}`}
              value={option}
              onChangeText={(value) => updatePollOption(index, value)}
            />
            {pollOptions.length > 2 && (
              <TouchableOpacity
                style={styles.removeOptionButton}
                onPress={() => removePollOption(index)}
              >
                <Text style={styles.removeOptionText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addOptionButton} onPress={addPollOption}>
          <Text style={styles.addOptionText}>+ Add Option</Text>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Keep results private</Text>
          <Switch
            value={pollPrivate}
            onValueChange={setPollPrivate}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={pollPrivate ? '#1e90ff' : '#f4f3f4'}
          />
        </View>
      </View>
    );
  };

  const renderEventFields = () => {
    if (type !== 'Event') return null;
    return (
      <View style={styles.typeSpecificSection}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Event Date (YYYY-MM-DD) *"
          value={eventDate}
          onChangeText={setEventDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Event Time (HH:MM)"
          value={eventTime}
          onChangeText={setEventTime}
        />
      </View>
    );
  };

  const renderDonationFields = () => {
    if (type !== 'Donation') return null;
    return (
      <View style={styles.typeSpecificSection}>
        <Text style={styles.sectionTitle}>Donation Campaign Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Goal Amount (BDT)"
          value={goalAmount}
          onChangeText={setGoalAmount}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Current Amount (BDT)"
          value={currentAmount}
          onChangeText={setCurrentAmount}
          keyboardType="numeric"
        />
      </View>
    );
  };

  const renderVolunteerFields = () => {
    if (type !== 'Volunteer') return null;
    return (
      <View style={styles.typeSpecificSection}>
        <Text style={styles.sectionTitle}>Volunteer Campaign Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Number of Volunteers Needed"
          value={volunteersNeeded}
          onChangeText={setVolunteersNeeded}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Required Skills/Qualifications"
          value={skills}
          onChangeText={setSkills}
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Create a New Post</Text>

      <TextInput
        style={styles.input}
        placeholder="Title *"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <View style={styles.pickerWrapper}>
        <Text style={styles.label}>Post Type: *</Text>
        <Picker
          selectedValue={type}
          style={styles.picker}
          onValueChange={(itemValue) => setType(itemValue)}
        >
          <Picker.Item label="Report" value="Report" />
          <Picker.Item label="Poll" value="Poll" />
          <Picker.Item label="Event" value="Event" />
          <Picker.Item label="Donation" value="Donation" />
          <Picker.Item label="Volunteer" value="Volunteer" />
        </Picker>
      </View>

      <View style={styles.pickerWrapper}>
        <Text style={styles.label}>Location: *</Text>
        <Picker
          selectedValue={location}
          style={styles.picker}
          onValueChange={(itemValue) => setLocation(itemValue)}
        >
          <Picker.Item label="Select a location" value="" />
          {locations.map((loc) => (
            <Picker.Item key={loc} label={loc} value={loc} />
          ))}
        </Picker>
      </View>

      {renderPollFields()}
      {renderEventFields()}
      {renderDonationFields()}
      {renderVolunteerFields()}

      {/* Image Section */}
      <View style={styles.mediaSection}>
        <Text style={styles.label}>Image (Optional)</Text>
        <TouchableOpacity style={styles.mediaButton} onPress={showImageOptions}>
          <Text style={styles.mediaButtonText}>📷 Select Image or GIF</Text>
        </TouchableOpacity>
        {imageUri ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeMediaButton} 
              onPress={() => setImageUri('')}
            >
              <Text style={styles.removeMediaText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {renderUploadProgress('image')}
      </View>

      {/* Audio Section */}
      <View style={styles.mediaSection}>
        <Text style={styles.label}>Audio (Optional)</Text>
        <TouchableOpacity style={styles.mediaButton} onPress={pickAudioFile}>
          <Text style={styles.mediaButtonText}>🎵 Select Audio File</Text>
        </TouchableOpacity>
        {audioUri ? (
          <View style={styles.audioPreview}>
            <Text style={styles.audioPreviewText}>🎵 Audio file selected</Text>
            <TouchableOpacity 
              style={styles.removeMediaButton} 
              onPress={() => setAudioUri('')}
            >
              <Text style={styles.removeMediaText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {renderUploadProgress('audio')}
      </View>

      <TouchableOpacity 
        style={[styles.button, isUploading && styles.buttonDisabled]} 
        onPress={handleSubmit}
        disabled={isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={[styles.buttonText, { marginLeft: 8 }]}>
              {Object.keys(uploadProgress).length > 0 ? 'Uploading files...' : 'Creating Post...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Submit Post</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>* Required fields</Text>
        <Text style={styles.footerText}>Supported: Images (JPG, PNG, GIF), Audio (MP3, WAV, M4A)</Text>
        <Text style={styles.footerText}>Max file size: 50MB</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    backgroundColor: '#f9f9f9', 
    flex: 1 
  },
  heading: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#4b4b4b', 
    textAlign: 'center' 
  },
  input: { 
    borderColor: '#ccc', 
    borderWidth: 1, 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15, 
    backgroundColor: 'white' 
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  pickerWrapper: { 
    marginBottom: 20 
  },
  label: { 
    marginBottom: 8, 
    fontWeight: '500', 
    color: '#333' 
  },
  picker: { 
    backgroundColor: 'white', 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 8, 
    height: 50 
  },
  typeSpecificSection: { 
    marginBottom: 20, 
    padding: 15, 
    backgroundColor: '#f0f8ff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#1e90ff' 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e90ff', 
    marginBottom: 10 
  },
  pollOptionContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  pollOptionInput: { 
    flex: 1, 
    marginBottom: 0, 
    marginRight: 10 
  },
  removeOptionButton: { 
    backgroundColor: '#ff4444', 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  removeOptionText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  addOptionButton: { 
    backgroundColor: '#1e90ff', 
    padding: 10, 
    borderRadius: 5, 
    alignItems: 'center', 
    marginBottom: 15 
  },
  addOptionText: { 
    color: 'white', 
    fontWeight: '500' 
  },
  switchContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  switchLabel: { 
    fontSize: 14, 
    color: '#333' 
  },
  mediaSection: {
    marginBottom: 20,
  },
  mediaButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1e90ff',
    borderStyle: 'dashed',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaButtonText: {
    color: '#1e90ff',
    fontWeight: '500',
    fontSize: 16,
  },
  imagePreview: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  audioPreview: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  audioPreviewText: {
    color: '#333',
    fontWeight: '500',
  },
  removeMediaButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  removeMediaText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e90ff',
    borderRadius: 2,
  },
  button: { 
    backgroundColor: '#1e90ff', 
    paddingVertical: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: { 
    color: 'white', 
    fontWeight: '600', 
    fontSize: 16 
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: { 
    alignItems: 'center', 
    paddingBottom: 20 
  },
  footerText: { 
    fontSize: 12, 
    color: '#666', 
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
});