// app/CreateAccount.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native'; // ✅ hook for navigation
import { apiUrl } from '../constants/api';

export default function CreateAccount() {
  const navigation = useNavigation(); // ✅ get navigation object

  // ----------------------------
  // Form states
  // ----------------------------
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [gender, setGender] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ----------------------------
  // Animation refs
  // ----------------------------
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // ----------------------------
  // Fade-in animations
  // ----------------------------
  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // ----------------------------
  // Handle Create Account
  // ----------------------------
  const handleCreateAccount = async () => {
    setError('');
    if (!fname || !lname || !phone) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload = { fname, lname, phone, email, address, profession, gender };
      const res = await axios.post(apiUrl('/api/user'), payload);

      if (res.data && res.data._id) {
        Alert.alert('Success', 'Your account has been created successfully.', [
          { text: 'OK', onPress: () => navigation.replace('Home') } // ✅ go to Home safely
        ]);
      } else {
        throw new Error('Unexpected server response');
      }
    } catch (err) {
      console.error('[CreateAccount] API error:', err.message);
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
        Create Account
      </Animated.Text>

      <Animated.View style={{ width: '100%', opacity: formOpacity }}>
        <TextInput placeholder="First Name" style={styles.input} value={fname} onChangeText={setFname} />
        <TextInput placeholder="Last Name" style={styles.input} value={lname} onChangeText={setLname} />
        <TextInput placeholder="Phone Number" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput placeholder="Address" style={styles.input} value={address} onChangeText={setAddress} />
        <TextInput placeholder="Profession" style={styles.input} value={profession} onChangeText={setProfession} />
        <TextInput placeholder="Gender" style={styles.input} value={gender} onChangeText={setGender} />
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Animated.View style={{ width: '100%', opacity: buttonOpacity }}>
        <TouchableOpacity style={styles.button} onPress={handleCreateAccount} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 },
  button: { backgroundColor: '#22c55e', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  error: { color: 'red', marginBottom: 10 },
});
