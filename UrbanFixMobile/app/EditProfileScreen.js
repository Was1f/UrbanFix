import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, Switch, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import config from '../config'; // updated config with API_BASE_URL
import UserProtectedRoute from '../components/UserProtectedRoute';

export default function EditProfileScreen({ navigation, route }) {
  const { updateUser, user: contextUser } = useContext(AuthContext);
  const router = useRouter();
  const localParams = useLocalSearchParams();

  // Determine userId from route, params, or context
  const getUserId = () => {
    if (route?.params?.userId) return route.params.userId;
    if (localParams?.userId) return localParams.userId;
    if (contextUser?._id) return contextUser._id;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get('userId');
      if (urlUserId) return urlUserId;
    }
    return null;
  };
  const userId = getUserId();

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
  const [verifyProfile, setVerifyProfile] = useState(false);
  const [nid, setNid] = useState('');

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

        // Populate all fields
        setFname(userData.fname || '');
        setLname(userData.lname || '');
        setBio(userData.bio || '');
        setPhone(userData.phone || '');
        setEmail(userData.email || '');
        setAddress(userData.address || '');
        setProfession(userData.profession || '');
        setLocation(userData.location || '');
        setVerifyProfile(!!userData.verificationBadge);
        setNid(userData.nid || '');
      } catch (err) {
        console.error('Error fetching user:', err.message);
        Alert.alert('Error', 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        fname,
        lname,
        name: `${fname} ${lname}`,
        bio,
        phone,
        email,
        address,
        profession,
        location,
        verificationBadge: verifyProfile,
        nid
      };

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

  const handleUploadNID = async () => {
    try {
      const res = await axios.patch(`${config.API_BASE_URL}/api/user/${userId}/nid`, { nid });
      setUser(res.data.user);
      updateUser(res.data.user);
      Alert.alert('Success', 'NID uploaded successfully!');
    } catch (err) {
      console.error('Error uploading NID:', err.message);
      Alert.alert('Error', 'Failed to upload NID. Please try again.');
    }
  };

  if (!userId) {
    return (
      <UserProtectedRoute>
        <View style={styles.container}>
          <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>
            No user ID provided. Cannot load profile.
          </Text>
        </View>
      </UserProtectedRoute>
    );
  }

  if (loading) return (
    <UserProtectedRoute>
      <ActivityIndicator size="large" color="#6b48ff" style={{ marginTop: 20 }} />
    </UserProtectedRoute>
  );

  if (!user) return (
    <UserProtectedRoute>
      <Text style={{ textAlign: 'center', marginTop: 20 }}>User not found</Text>
    </UserProtectedRoute>
  );

  return (
    <UserProtectedRoute>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack ? navigation.goBack() : router?.back?.()}>
            <Text style={styles.headerBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.headerBtn}>💾</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Profile Photo */}
          <TouchableOpacity style={styles.profilePhotoBtn} onPress={() => console.log('Change photo')}>
            <Image source={require('../assets/profile.jpg')} style={styles.profileImage} />
            <Text style={styles.photoText}>Change Photo</Text>
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
          <View style={styles.toggleRow}>
            <Text>Verify my profile</Text>
            <Switch value={verifyProfile} onValueChange={setVerifyProfile} />
          </View>

          {verifyProfile && (
            <View style={styles.verificationInfo}>
              <Text>Your NID is securely stored and encrypted.</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter NID"
                value={nid}
                onChangeText={setNid}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.button} onPress={handleUploadNID}>
                <Text style={styles.buttonText}>Upload National ID</Text>
              </TouchableOpacity>
            </View>
          )}

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
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  verificationInfo: { backgroundColor: '#e0e0e0', padding: 10, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#6b48ff', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
