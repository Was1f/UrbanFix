import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { apiUrl } from '../constants/api';
import { AuthContext } from '../context/AuthContext';

export default function CreatePost() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Report');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('normal');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image', 'video', 'audio'
  const [isUploading, setIsUploading] = useState(false);
  const [recording, setRecording] = useState();
  const [isRecording, setIsRecording] = useState(false);

  // Poll
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollPrivate, setPollPrivate] = useState(false);

  // Event
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

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

  const postTypes = [
    { value: 'Report', label: 'Report Issue', emoji: '⚠️', description: 'Report community problems' },
    { value: 'Poll', label: 'Create Poll', emoji: '📊', description: 'Get community opinions' },
    { value: 'Event', label: 'Organize Event', emoji: '📅', description: 'Plan community events' },
    { value: 'Donation', label: 'Fundraise', emoji: '💰', description: 'Raise funds for causes' },
    { value: 'Volunteer', label: 'Find Volunteers', emoji: '🤝', description: 'Recruit helpers' },
  ];

  const priorities = [
    { value: 'low', label: 'Low Priority', color: '#22c55e', description: 'Can wait' },
    { value: 'normal', label: 'Normal', color: '#6b7280', description: 'Standard priority' },
    { value: 'medium', label: 'Medium Priority', color: '#eab308', description: 'Moderately urgent' },
    { value: 'high', label: 'High Priority', color: '#f97316', description: 'Needs attention soon' },
    { value: 'urgent', label: 'Urgent', color: '#ef4444', description: 'Immediate action needed' },
  ];

  // Helper function to get proper MIME type
  const getMimeType = (uri, mediaType) => {
    const extension = uri.split('.').pop().toLowerCase();
    
    switch (mediaType) {
      case 'image':
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          case 'gif':
            return 'image/gif';
          default:
            return 'image/jpeg';
        }
      case 'video':
        switch (extension) {
          case 'mp4':
            return 'video/mp4';
          case 'mov':
            return 'video/quicktime';
          case 'avi':
            return 'video/x-msvideo';
          default:
            return 'video/mp4';
        }
      case 'audio':
        switch (extension) {
          case 'm4a':
            return 'audio/mp4';
          case 'mp3':
            return 'audio/mpeg';
          case 'wav':
            return 'audio/wav';
          case 'webm':
            return 'audio/webm';
          default:
            return 'audio/mp4';
        }
      default:
        return 'application/octet-stream';
    }
  };

  // Helper function to get proper file extension
  const getFileExtension = (uri, mediaType) => {
    const extension = uri.split('.').pop().toLowerCase();
    
    // If extension exists and is valid, use it
    const validExtensions = {
      image: ['jpg', 'jpeg', 'png', 'gif'],
      video: ['mp4', 'mov', 'avi'],
      audio: ['m4a', 'mp3', 'wav', 'webm']
    };
    
    if (validExtensions[mediaType]?.includes(extension)) {
      return extension;
    }
    
    // Default extensions
    switch (mediaType) {
      case 'image':
        return 'jpg';
      case 'video':
        return 'mp4';
      case 'audio':
        return 'm4a';
      default:
        return 'bin';
    }
  };

  const handleMediaPicker = async (type) => {
    console.log(`Media picker called with type: ${type}`);
    
    try {
      let result;
      
      if (type === 'image') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert('Permission Required', 'Permission to access media library is required!');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.7,
        });
      } else if (type === 'video') {
        console.log('Requesting media library permissions for video...');
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
          console.log('Permission denied for media library');
          Alert.alert('Permission Required', 'Permission to access media library is required!');
          return;
        }

        console.log('Permission granted, launching video picker...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.5,
          videoMaxDuration: 30,
        });

        console.log('Video picker result:', result);
      } else if (type === 'audio') {
        result = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
          copyToCacheDirectory: true,
        });
      }

      console.log(`Full result object for ${type}:`, JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log(`Selected ${type} asset:`, asset);
        
        // Check file size (10MB limit)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          console.log('File too large:', asset.fileSize);
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
          return;
        }
        
        const mediaObject = {
          ...asset,
          name: asset.fileName || `${type}_${Date.now()}.${getFileExtension(asset.uri, type)}`,
          type: getMimeType(asset.uri, type)
        };

        console.log(`Setting selected media for ${type}:`, mediaObject);
        setSelectedMedia(mediaObject);
        setMediaType(type);
        
        console.log('State updated - selectedMedia and mediaType set');
      } else if (result.type === 'success') {
        // For DocumentPicker (audio)
        console.log('Document picker success:', result);
        if (result.size && result.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
          return;
        }
        
        setSelectedMedia({
          ...result,
          name: result.name || `audio_${Date.now()}.${getFileExtension(result.uri, 'audio')}`,
          type: getMimeType(result.uri, 'audio')
        });
        setMediaType(type);
      } else {
        console.log('Media selection cancelled or failed');
      }
    } catch (error) {
      console.error('Error in handleMediaPicker:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const startRecording = async () => {
    try {
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access microphone is required!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording.getURI();
      
      setSelectedMedia({
        uri,
        name: `recording_${Date.now()}.m4a`,
        type: 'audio/mp4',
        fileSize: null
      });
      setMediaType('audio');
      setRecording(undefined);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleRemoveMedia = () => {
    console.log('Removing selected media');
    setSelectedMedia(null);
    setMediaType(null);
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
      console.log('Starting upload process...');
      console.log('Selected media:', selectedMedia);
      console.log('Media type:', mediaType);

      let uploadedMediaUrl = '';

      if (selectedMedia) {
        try {
          console.log('Starting media upload...');
          console.log('Media details:', {
            name: selectedMedia.name,
            type: selectedMedia.type,
            size: selectedMedia.fileSize,
            uri: selectedMedia.uri
          });

          const response = await fetch(selectedMedia.uri);
          const blob = await response.blob();
          
          console.log('Blob created, size:', blob.size);
          
          // Check blob size
          if (blob.size > 10 * 1024 * 1024) {
            throw new Error('File size exceeds 10MB limit');
          }
          
          const base64Promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('Base64 conversion complete');
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          const base64Data = await base64Promise;
          
          const url = apiUrl('/api/upload/community');
          
          const uploadPayload = {
            mediaBase64: base64Data,
            mediaFileName: selectedMedia.name || `media-${Date.now()}.${getFileExtension(selectedMedia.uri, mediaType)}`,
            mediaType: mediaType
          };

          console.log('Sending upload request...');
          console.log('Payload size:', JSON.stringify(uploadPayload).length);
          
          const uploadResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(uploadPayload),
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload error response:', errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          uploadedMediaUrl = uploadResult.mediaUrl || uploadResult.imageUrl;
          
          console.log('Upload successful:', uploadedMediaUrl);
          
        } catch (mediaError) {
          console.error('Media upload failed:', mediaError);
          
          const continueWithoutMedia = await new Promise((resolve) => {
            Alert.alert(
              'Media Upload Failed',
              `${mediaError.message}\n\nWould you like to continue without the media?`,
              [
                { text: 'Cancel', onPress: () => resolve(false) },
                { text: 'Continue', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (!continueWithoutMedia) {
            return;
          }
          
          uploadedMediaUrl = '';
        }
      }

      const postData = {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        author: user ? user.phone : 'Anonymous',
        location,
        ...(uploadedMediaUrl && mediaType === 'image' && { image: uploadedMediaUrl }),
        ...(uploadedMediaUrl && mediaType === 'video' && { video: uploadedMediaUrl }),
        ...(uploadedMediaUrl && mediaType === 'audio' && { audio: uploadedMediaUrl }),
      };

      console.log('Post data being sent:', postData);

      // Type-specific data
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
        { text: 'OK', onPress: () => router.replace('/community') }
      ]);
    } catch (e) {
      console.error('Error posting:', e);
      Alert.alert('Error', e.message || 'Network or server error');
    } finally {
      setIsUploading(false);
    }
  };

  const renderMediaPreview = () => {
    console.log('renderMediaPreview called');
    console.log('selectedMedia:', selectedMedia);
    console.log('mediaType:', mediaType);
    
    if (!selectedMedia) {
      console.log('No selectedMedia, returning null');
      return null;
    }

    switch (mediaType) {
      case 'image':
        console.log('Rendering image preview');
        return (
          <View style={styles.mediaContainer}>
            <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} />
            <Text style={styles.mediaInfo}>Image selected: {selectedMedia.name}</Text>
          </View>
        );
        
      case 'video':
        console.log('Rendering video preview with URI:', selectedMedia.uri);
        return (
          <View style={styles.mediaContainer}>
            <View style={styles.videoPreviewContainer}>
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderIcon}>🎥</Text>
                <Text style={styles.videoPlaceholderText}>Video Ready</Text>
              </View>
              <View style={styles.videoInfoContainer}>
                <Text style={styles.mediaInfo}>
                  Video selected: {selectedMedia.name || 'video.mp4'}
                </Text>
                {selectedMedia.duration && (
                  <Text style={styles.videoDuration}>
                    Duration: {Math.round(selectedMedia.duration / 1000)}s
                  </Text>
                )}
                {selectedMedia.fileSize && (
                  <Text style={styles.videoFileSize}>
                    Size: {(selectedMedia.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
        
      case 'audio':
        console.log('Rendering audio preview');
        return (
          <View style={styles.mediaContainer}>
            <View style={styles.audioPlaceholder}>
              <Text style={styles.audioPlaceholderIcon}>🎵</Text>
              <Text style={styles.mediaInfo}>
                {selectedMedia.name || 'Audio recording'}
              </Text>
            </View>
          </View>
        );
        
      default:
        console.log('Unknown media type:', mediaType);
        return null;
    }
  };

  const renderMediaSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Add Media (Optional)</Text>
      
      {!selectedMedia ? (
        <>
          <Text style={styles.inputLabel}>Choose Media Type</Text>
          <View style={styles.mediaButtonsContainer}>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPicker('image')}>
              <Text style={styles.mediaButtonIcon}>📷</Text>
              <Text style={styles.mediaButtonText}>Image</Text>
            </Pressable>
            
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPicker('video')}>
              <Text style={styles.mediaButtonIcon}>🎥</Text>
              <Text style={styles.mediaButtonText}>Video</Text>
            </Pressable>
            
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPicker('audio')}>
              <Text style={styles.mediaButtonIcon}>🎵</Text>
              <Text style={styles.mediaButtonText}>Audio File</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.mediaButton, isRecording && styles.mediaButtonActive]} 
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.mediaButtonIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
              <Text style={styles.mediaButtonText}>
                {isRecording ? 'Stop Recording' : 'Record Audio'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.mediaPreviewContainer}>
          <Text style={styles.inputLabel}>Selected Media</Text>
          {renderMediaPreview()}
          <Pressable style={styles.removeMediaButton} onPress={handleRemoveMedia}>
            <Text style={styles.removeMediaIcon}>🗑️</Text>
            <Text style={styles.removeMediaText}>Remove Media</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'Poll':
        return (
          <View style={styles.typeSpecificSection}>
            <Text style={styles.sectionTitle}>📊 Poll Configuration</Text>
            <Text style={styles.sectionSubtitle}>Add options for people to vote on</Text>
            
            {pollOptions.map((option, index) => (
              <View key={index} style={styles.pollOptionContainer}>
                <TextInput
                  style={[styles.input, styles.pollOptionInput]}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChangeText={(value) => updatePollOption(index, value)}
                />
                {pollOptions.length > 2 && (
                  <Pressable
                    style={styles.removeOptionButton}
                    onPress={() => removePollOption(index)}
                  >
                    <Text style={styles.removeOptionText}>✕</Text>
                  </Pressable>
                )}
              </View>
            ))}
            
            <Pressable style={styles.addOptionButton} onPress={addPollOption}>
              <Text style={styles.addOptionText}>+ Add Option</Text>
            </Pressable>

            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Private Results</Text>
                <Text style={styles.switchDescription}>Hide results until poll ends</Text>
              </View>
              <Switch
                value={pollPrivate}
                onValueChange={setPollPrivate}
                trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                thumbColor={pollPrivate ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        );

      case 'Event':
        return (
          <View style={styles.typeSpecificSection}>
            <Text style={styles.sectionTitle}>📅 Event Details</Text>
            <Text style={styles.sectionSubtitle}>When and where is your event?</Text>
            
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

      case 'Donation':
        return (
          <View style={styles.typeSpecificSection}>
            <Text style={styles.sectionTitle}>💰 Fundraising Campaign</Text>
            <Text style={styles.sectionSubtitle}>Set your funding goals</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Goal Amount (BDT)"
              value={goalAmount}
              onChangeText={setGoalAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Starting Amount (BDT)"
              value={currentAmount}
              onChangeText={setCurrentAmount}
              keyboardType="numeric"
            />
          </View>
        );

      case 'Volunteer':
        return (
          <View style={styles.typeSpecificSection}>
            <Text style={styles.sectionTitle}>🤝 Volunteer Opportunity</Text>
            <Text style={styles.sectionSubtitle}>What help do you need?</Text>
            
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

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Post</Text>
          <Text style={styles.headerSubtitle}>Share with your community</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 What would you like to post?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.typeSelector}
          >
            {postTypes.map((postType) => (
              <Pressable
                key={postType.value}
                style={[
                  styles.typeCard,
                  type === postType.value && styles.typeCardActive
                ]}
                onPress={() => setType(postType.value)}
              >
                <Text style={styles.typeEmoji}>{postType.emoji}</Text>
                <Text style={[
                  styles.typeLabel,
                  type === postType.value && styles.typeLabelActive
                ]}>
                  {postType.label}
                </Text>
                <Text style={[
                  styles.typeDescription,
                  type === postType.value && styles.typeDescriptionActive
                ]}>
                  {postType.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide more details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={location}
                style={styles.picker}
                onValueChange={(itemValue) => setLocation(itemValue)}
              >
                <Picker.Item label="Select your location" value="" />
                {locations.map((loc) => (
                  <Picker.Item key={loc} label={loc} value={loc} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Priority Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Priority Level</Text>
          <Text style={styles.sectionSubtitle}>How urgent is this?</Text>
          
          <View style={styles.priorityGrid}>
            {priorities.map((priorityOption) => (
              <Pressable
                key={priorityOption.value}
                style={[
                  styles.priorityCard,
                  priority === priorityOption.value && styles.priorityCardActive,
                  { borderColor: priorityOption.color }
                ]}
                onPress={() => setPriority(priorityOption.value)}
              >
                <View style={[
                  styles.priorityIndicator,
                  { backgroundColor: priorityOption.color }
                ]} />
                <Text style={[
                  styles.priorityLabel,
                  priority === priorityOption.value && styles.priorityLabelActive
                ]}>
                  {priorityOption.label}
                </Text>
                <Text style={[
                  styles.priorityDesc,
                  priority === priorityOption.value && styles.priorityDescActive
                ]}>
                  {priorityOption.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}

        {/* Media Section */}
        {renderMediaSection()}

        {/* Submit Section */}
        <View style={styles.submitSection}>
          <Pressable 
            style={[
              styles.submitButton, 
              isUploading && styles.submitButtonDisabled,
              !title.trim() || !location ? styles.submitButtonDisabled : null
            ]} 
            onPress={handleSubmit}
            disabled={isUploading || !title.trim() || !location}
          >
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>
                  {selectedMedia ? 'Uploading...' : 'Creating...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>✨ Create Post</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>* Required fields</Text>
            <Text style={styles.footerText}>Supported: JPG, PNG, MP4, M4A • Max file size: 10MB</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#64748b',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },

  // Post Type Selection
  typeSelector: {
    marginHorizontal: -4,
  },
  typeCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    width: 140,
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f8ff',
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  typeLabelActive: {
    color: '#6366f1',
  },
  typeDescription: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  typeDescriptionActive: {
    color: '#6366f1',
  },

  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },

  // Priority Selection
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priorityCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  priorityCardActive: {
    backgroundColor: '#f0f8ff',
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  priorityLabelActive: {
    color: '#1e293b',
  },
  priorityDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  priorityDescActive: {
    color: '#64748b',
  },

  // Type-specific sections
  typeSpecificSection: {
    backgroundColor: '#f0f8ff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  pollOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollOptionInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  removeOptionButton: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeOptionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addOptionButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  switchDescription: {
    fontSize: 13,
    color: '#64748b',
  },

  // Media Section Styles
  mediaButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  mediaButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  mediaButtonActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  mediaButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  mediaButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  mediaPreviewContainer: {
    marginTop: 16,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  
  // Fixed Video Preview Styles
  videoPreviewContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    backgroundColor: '#e2e8f0',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  videoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  videoPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  videoInfoContainer: {
    padding: 12,
  },
  videoDuration: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  videoFileSize: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  
  audioPlaceholder: {
    backgroundColor: '#f8fafc',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  audioPlaceholderIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  mediaInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  removeMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
  },
  removeMediaIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  removeMediaText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Submit Section
  submitSection: {
    margin: 20,
    marginTop: 32,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
});