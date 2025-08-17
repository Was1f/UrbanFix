import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiUrl } from '../constants/api';

export default function EmergencyReportForm() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    contactNumber: '',
    priority: 'medium',
  });
  const [loading, setLoading] = useState(false);

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#44ff44' },
    { value: 'medium', label: 'Medium', color: '#ffaa00' },
    { value: 'high', label: 'High', color: '#ff4444' },
  ];

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/emergency-reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          category: category,
          status: 'pending',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Emergency report submitted successfully!',
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

  const getCategoryInfo = () => {
    const categoryMap = {
      'Fire': { icon: 'flame-outline', color: '#ff4444', label: 'Fire Emergency' },
      'Crime': { icon: 'shield-outline', color: '#4444ff', label: 'Crime Report' },
      'Accident': { icon: 'car-outline', color: '#ff8800', label: 'Accident Report' },
      'Medical': { icon: 'medical-outline', color: '#44ff44', label: 'Medical Emergency' },
      'Natural Disaster': { icon: 'warning-outline', color: '#ffaa00', label: 'Natural Disaster' },
      'Other Help': { icon: 'help-circle-outline', color: '#888888', label: 'Other Emergency' },
    };
    return categoryMap[category] || { icon: 'alert-circle-outline', color: '#666666', label: 'Emergency Report' };
  };

  const categoryInfo = getCategoryInfo();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
                 <Pressable style={styles.backButton} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={24} color="#000" />
         </Pressable>
        <Text style={styles.headerTitle}>{categoryInfo.label}</Text>
                 <Pressable style={styles.helpButton}>
           <Ionicons name="help-circle-outline" size={24} color="#000" />
         </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.categoryDisplay}>
          <Ionicons name={categoryInfo.icon} size={32} color={categoryInfo.color} />
          <Text style={[styles.categoryLabel, { color: categoryInfo.color }]}>
            {categoryInfo.label}
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Report Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Brief description of the emergency"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Detailed description of what happened"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="Address or location details"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={formData.contactNumber}
              onChangeText={(text) => setFormData({ ...formData, contactNumber: text })}
              placeholder="Your contact number (optional)"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority Level</Text>
            <View style={styles.priorityContainer}>
              {priorityOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.priorityButton,
                    formData.priority === option.value && {
                      backgroundColor: option.color,
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, priority: option.value })}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      formData.priority === option.value && styles.priorityTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Emergency Report'}
          </Text>
        </Pressable>

        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyInfoTitle}>🚨 Emergency Numbers</Text>
          <Text style={styles.emergencyInfoText}>
            • Police: 999{'\n'}
            • Fire Service: 16163{'\n'}
            • Ambulance: 999
          </Text>
        </View>
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
  categoryDisplay: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  priorityTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emergencyInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  emergencyInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  emergencyInfoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});
