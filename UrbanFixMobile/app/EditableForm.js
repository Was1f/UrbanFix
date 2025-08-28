import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EditableForm = ({ 
  extractedData, 
  onSave, 
  onCancel, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    nidNumber: '',
    address: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (extractedData) {
      setFormData({
        name: extractedData.name || '',
        dateOfBirth: extractedData.dateOfBirth || '',
        nidNumber: extractedData.nidNumber || '',
        address: extractedData.address || ''
      });
    }
  }, [extractedData]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Date of Birth validation
    if (!formData.dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    }

    // NID Number validation
    if (!formData.nidNumber.trim()) {
      newErrors.nidNumber = 'NID Number is required';
    } else if (!/^\d{10,17}$/.test(formData.nidNumber.trim())) {
      newErrors.nidNumber = 'NID Number must be 10-17 digits';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      Alert.alert(
        'Confirm Information',
        'Are you sure this information is correct?',
        [
          {
            text: 'Review Again',
            style: 'cancel',
          },
          {
            text: 'Confirm & Save',
            style: 'default',
            onPress: () => onSave(formData),
          },
        ]
      );
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const formatNIDNumber = (text) => {
    // Only allow digits and limit length
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned.slice(0, 17);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Edit Information</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Please review the extracted information and make corrections if needed
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name (English)</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Date of Birth Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={[styles.input, errors.dateOfBirth && styles.inputError]}
              value={formData.dateOfBirth}
              onChangeText={(text) => updateField('dateOfBirth', text)}
              placeholder="DD Mon YYYY (e.g., 25 Jul 1993)"
              placeholderTextColor="#999"
            />
            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            <Text style={styles.helperText}>Format: DD Mon YYYY (e.g., 25 Jul 1993)</Text>
          </View>

          {/* NID Number Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>NID Number</Text>
            <TextInput
              style={[styles.input, errors.nidNumber && styles.inputError]}
              value={formData.nidNumber}
              onChangeText={(text) => updateField('nidNumber', formatNIDNumber(text))}
              placeholder="Enter 10-17 digit NID number"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={17}
            />
            {errors.nidNumber && <Text style={styles.errorText}>{errors.nidNumber}</Text>}
            <Text style={styles.helperText}>
              {formData.nidNumber.length}/17 digits
            </Text>
          </View>

          {/* Address Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.address && styles.inputError]}
              value={formData.address}
              onChangeText={(text) => updateField('address', text)}
              placeholder="Enter your full address"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          {/* Data Source Info */}
          <View style={styles.sourceInfo}>
            <Ionicons name="document-text" size={16} color="#666" />
            <Text style={styles.sourceText}>
              Information extracted from NID card images
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.disabledButton]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.saveText}>Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.saveText}>Confirm & Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1976D2',
    flex: 1,
  },
  formContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 5,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  sourceText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default EditableForm;