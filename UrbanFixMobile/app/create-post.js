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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { apiUrl } from '../constants/api';

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Report');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState('');
  const [audio, setAudio] = useState('');

  // Poll-specific fields
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollPrivate, setPollPrivate] = useState(false);

  // Event-specific fields
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

  // Donation-specific fields
  const [goalAmount, setGoalAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');

  // Volunteer-specific fields
  const [volunteersNeeded, setVolunteersNeeded] = useState('');
  const [skills, setSkills] = useState('');

  // Common Bangladesh locations
  const locations = [
    'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal',
    'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj', 'Gazipur', 'Bogra',
    'Jessore', 'Dinajpur', 'Pabna', 'Faridpur', 'Kushtia', 'Tangail',
    'Jamalpur', 'Narsingdi'
  ];

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

    // Type-specific validations
    if (type === 'Poll') {
      const validOptions = pollOptions.filter(option => option.trim());
      if (validOptions.length < 2) {
        Alert.alert('Validation Error', 'Poll must have at least 2 options');
        return false;
      }
    }

    if (type === 'Event') {
      if (!eventDate.trim()) {
        Alert.alert('Validation Error', 'Event date is required');
        return false;
      }
    }

    if (type === 'Donation') {
      if (goalAmount && isNaN(goalAmount)) {
        Alert.alert('Validation Error', 'Goal amount must be a valid number');
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

    let postData = {
      title: title.trim(),
      description: description.trim(),
      type,
      author: 'Anonymous',
      location,
      ...(image.trim() && { image: image.trim() }),
      ...(audio.trim() && { audio: audio.trim() }),
    };

    // Add type-specific data
    if (type === 'Poll') {
      const validOptions = pollOptions.filter(option => option.trim());
      postData.pollOptions = validOptions;
      postData.pollPrivate = pollPrivate;
      postData.pollVotes = {}; // Initialize empty votes object
      validOptions.forEach(option => {
        postData.pollVotes[option] = 0;
      });
    }

    if (type === 'Event') {
      postData.eventDate = eventDate.trim();
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
      postData.volunteersNeeded = volunteersNeeded ? parseInt(volunteersNeeded) : null;
      postData.skills = skills.trim();
      postData.volunteers = [];
      postData.volunteerCount = 0;
    }

    try {
      const response = await fetch(apiUrl('/api/discussions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Post created successfully');
        router.back();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error posting:', error);
      Alert.alert('Error', 'Network or server error');
    }
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

      <TextInput
        style={styles.input}
        placeholder="Image URL (optional)"
        value={image}
        onChangeText={setImage}
      />

      <TextInput
        style={styles.input}
        placeholder="Audio URL (optional)"
        value={audio}
        onChangeText={setAudio}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit Post</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>* Required fields</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4b4b4b',
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
  },
  picker: {
    backgroundColor: 'white',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
  },
  typeSpecificSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e90ff',
    marginBottom: 10,
  },
  pollOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pollOptionInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  removeOptionButton: {
    backgroundColor: '#ff4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeOptionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addOptionButton: {
    backgroundColor: '#1e90ff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  addOptionText: {
    color: 'white',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});