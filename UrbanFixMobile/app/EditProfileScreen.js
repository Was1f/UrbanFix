import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import config from '../config';
import UserProtectedRoute from '../components/UserProtectedRoute';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen({ navigation, route }) {
  const { updateUser, user: contextUser } = useContext(AuthContext);

  // Determine userId from route params or context
  const userId = route?.params?.userId || contextUser?._id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  // Editable fields
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  // Convert image to base64
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

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setLoading(false);
        Alert.alert('Error', 'No user ID provided.');
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get(`${config.API_BASE_URL}/api/user/${userId}`);
        const userData = res.data;
        setUser(userData);

        setFname(userData.fname || '');
        setLname(userData.lname || '');
        setBio(userData.bio || '');
        setPhone(userData.phone || '');
        setEmail(userData.email || '');
        setAddress(userData.address || '');
        setProfession(userData.profession || '');
        setLocation(userData.location || '');
        if (userData.profilePic) setProfilePic(userData.profilePic);
      } catch (err) {
        console.error('Error fetching user:', err.message);
        Alert.alert('Error', 'Failed to load profile. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { fname, lname, name: `${fname} ${lname}`, bio, phone, email, address, profession, location };
      const res = await axios.put(`${config.API_BASE_URL}/api/user/${userId}`, updates);
      setUser(res.data);
      updateUser(res.data);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      console.error('Error saving user data:', err.message);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureUpload = async () => {
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
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingPic(true);
        const asset = result.assets[0];
        const base64Image = await convertImageToBase64(asset.uri);

        const uploadRes = await axios.post(`${config.API_BASE_URL}/api/upload/base64`, {
          imageBase64: base64Image,
          imageFileName: asset.fileName || 'profile.jpg',
          type: 'profile'
        });

        if (uploadRes.data.success) {
          const newProfilePic = { uri: uploadRes.data.filePath, type: 'image/jpeg', size: 0 };
          const updateRes = await axios.patch(`${config.API_BASE_URL}/api/user/${userId}/profile-pic`, { profilePic: newProfilePic });
          if (updateRes.data.success) {
            setProfilePic(newProfilePic);
            setUser(prev => ({ ...prev, profilePic: newProfilePic }));
            updateUser({ ...user, profilePic: newProfilePic });
            Alert.alert('Success', 'Profile picture updated successfully!');
          } else Alert.alert('Error', 'Failed to update profile picture.');
        } else Alert.alert('Error', 'Failed to upload image.');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPic(false);
    }
  };

  if (!userId) return (
    <UserProtectedRoute>
      <View style={styles.container}>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>
          No user ID provided. Cannot load profile.
        </Text>
      </View>
    </UserProtectedRoute>
  );

  if (loading) return (
    <UserProtectedRoute>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6b48ff" style={{ marginTop: 20 }} />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Loading profile...</Text>
      </View>
    </UserProtectedRoute>
  );

  if (!user) return (
    <UserProtectedRoute>
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>User not found</Text>
      </View>
    </UserProtectedRoute>
  );

  return (
    <UserProtectedRoute>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.headerBtn}>💾</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Profile Photo */}
          <TouchableOpacity style={styles.profilePhotoBtn} onPress={handleProfilePictureUpload} disabled={uploadingPic}>
            <Image 
              source={profilePic?.uri ? { uri: `${config.API_BASE_URL}${profilePic.uri}` } : require('../assets/profile.jpg')} 
              style={styles.profileImage} 
            />
            <Text style={styles.photoText}>{uploadingPic ? 'Uploading...' : 'Change Photo'}</Text>
            {uploadingPic && <ActivityIndicator size="small" color="#6b48ff" style={{ marginTop: 8 }} />}
          </TouchableOpacity>

          {/* Personal Info */}
          <Text style={styles.label}>First Name</Text>
          <TextInput style={styles.input} value={fname} onChangeText={setFname} />

          <Text style={styles.label}>Last Name</Text>
          <TextInput style={styles.input} value={lname} onChangeText={setLname} />

          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} multiline />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />

          <Text style={styles.label}>Profession</Text>
          <TextInput style={styles.input} value={profession} onChangeText={setProfession} />

          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} />

          {/* Verification */}
          <Text style={styles.sectionTitle}>Verification</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NIDVerifyScreen')}>
            <Text style={styles.buttonText}>Verify My Profile</Text>
          </TouchableOpacity>

          {/* Save Changes */}
          <TouchableOpacity style={[styles.button, { backgroundColor: '#4CAF50' }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </UserProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#6b48ff', padding: 10 },
  headerBtn: { color: 'white', fontSize: 20 },
  headerTitle: { color: 'white', fontSize: 20 },
  profilePhotoBtn: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  photoText: { color: '#666', marginTop: 8 },
  label: { marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 15 },
  sectionTitle: { fontWeight: 'bold', fontSize: 16, marginVertical: 10 },
  button: { backgroundColor: '#6b48ff', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
