import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiUrl } from '../constants/api';

export default function ReportMedical() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    urgencyLevel: 'moderate',
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required to report incidents accurately.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);
      
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address.length > 0) {
        const addr = address[0];
        const locationString = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        setFormData(prev => ({ ...prev, location: locationString }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to record video.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaFiles(prev => [...prev, { type: 'video', uri: result.assets[0].uri }]);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  };

  const handleRecordAudio = async () => {
    Alert.alert('Audio Recording', 'Audio recording feature will be implemented soon.');
  };

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaFiles(prev => [...prev, { type: 'image', uri: result.assets[0].uri }]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        ...formData,
        category: 'Medical',
        urgencyLevel: formData.urgencyLevel,
        mediaFiles: mediaFiles,
        coordinates: userLocation ? {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        } : null,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(apiUrl('/api/emergency-reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Medical emergency report submitted successfully! Ambulance services have been notified.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/user-homepage'),
            },
          ]
        );
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: '#44ff44' },
    { value: 'moderate', label: 'Moderate', color: '#ffaa00' },
    { value: 'high', label: 'High', color: '#ff4444' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
                 <Pressable style={styles.backButton} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={24} color="#000" />
         </Pressable>
        <Text style={styles.headerTitle}>Report Medical Emergency</Text>
                 <Pressable style={styles.helpButton}>
           <Ionicons name="help-circle-outline" size={24} color="#000" />
         </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.locationContainer}>
          <TextInput
            style={styles.locationInput}
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Search for..."
            placeholderTextColor="#999"
          />
                     <Ionicons name="location" size={20} color="#000" />
        </View>

        <View style={styles.mapContainer}>
          <Text style={styles.mapText}>Map View</Text>
          <Text style={styles.mapSubtext}>Location: {formData.location || 'Detecting location...'}</Text>
        </View>

        <View style={styles.descriptionContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe Your Issues Here..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.evidenceSection}>
          <Text style={styles.sectionTitle}>Attach Evidence</Text>
          <View style={styles.evidenceButtons}>
                         <Pressable style={styles.evidenceButton} onPress={handleRecordVideo}>
               <Ionicons name="videocam" size={20} color="#000" />
               <Text style={styles.evidenceButtonText}>Record Video</Text>
             </Pressable>
                         <Pressable style={styles.evidenceButton} onPress={handleRecordAudio}>
               <Ionicons name="mic" size={20} color="#000" />
               <Text style={styles.evidenceButtonText}>Record Audio</Text>
             </Pressable>
                         <Pressable style={styles.evidenceButton} onPress={handleUploadImage}>
               <Ionicons name="image" size={20} color="#000" />
               <Text style={styles.evidenceButtonText}>Upload Image</Text>
             </Pressable>
          </View>
        </View>

        <View style={styles.urgencySection}>
          <Text style={styles.sectionTitle}>Urgency Level</Text>
          <View style={styles.urgencyButtons}>
            {urgencyLevels.map((level) => (
              <Pressable
                key={level.value}
                style={[
                  styles.urgencyButton,
                  formData.urgencyLevel === level.value && {
                    backgroundColor: level.color,
                    borderColor: level.color,
                  },
                ]}
                onPress={() => setFormData({ ...formData, urgencyLevel: level.value })}
              >
                <Text
                  style={[
                    styles.urgencyButtonText,
                    formData.urgencyLevel === level.value && styles.urgencyButtonTextSelected,
                  ]}
                >
                  {level.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {mediaFiles.length > 0 && (
          <View style={styles.mediaContainer}>
            <Text style={styles.sectionTitle}>Uploaded Media</Text>
            <View style={styles.mediaList}>
              {mediaFiles.map((file, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Ionicons 
                    name={file.type === 'video' ? 'videocam' : 'image'} 
                    size={20} 
                    color="#007AFF" 
                  />
                  <Text style={styles.mediaText}>{file.type} {index + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  helpButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
             locationContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  mapContainer: {
    backgroundColor: '#D2B48C',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 200,
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
             descriptionContainer: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
     descriptionInput: {
     fontSize: 16,
     color: '#000',
     minHeight: 120,
     textAlignVertical: 'top',
   },
  evidenceSection: {
    marginBottom: 16,
  },
     sectionTitle: {
     fontSize: 16,
     fontWeight: '700',
     color: '#000',
     marginBottom: 12,
   },
  evidenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
             evidenceButton: {
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
     evidenceButtonText: {
     fontSize: 14,
     fontWeight: '600',
     color: '#000',
   },
  urgencySection: {
    marginBottom: 16,
  },
  urgencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D2B48C',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D2B48C',
  },
  urgencyButtonTextSelected: {
    color: '#fff',
  },
  mediaContainer: {
    marginBottom: 16,
  },
  mediaList: {
    gap: 8,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D2B48C',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  mediaText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#ff0000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
