import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, Animated, KeyboardAvoidingView, Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { apiUrl } from "../constants/api";

export default function PhoneLogin() {
  const { login } = useContext(AuthContext);
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const appNameOpacity = useRef(new Animated.Value(0)).current;
  const signInTextOpacity = useRef(new Animated.Value(0)).current;
  const inputOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const bottomTextOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(appNameOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(signInTextOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(inputOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(bottomTextOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendOtp = async () => {
    if (!phone) {
      setError('Please enter a valid phone number.');
      return;
    }
    setError('');

    try {
      const res = await fetch(apiUrl('/api/check-phone'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Phone number not registered.');
      } else {
        setShowOtpInput(true);
        Alert.alert('OTP Sent', 'Please check your SMS for the OTP.');
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Server error. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 5) {
      setError('Please enter a valid 5-digit OTP.');
      return;
    }

    setError('');

    try {
      const res = await fetch(apiUrl('/api/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || `Server error: ${res.status}`);
        return;
      }

      if (!data.success || !data.user || !data.user._id) {
        setError('Invalid response from server.');
        return;
      }

      console.log('✅ OTP verified successfully for:', phone);
      console.log('📄 User data received:', data.user);

      // ✅ Save user in context with session management and navigate
      try {
        const loginSuccess = await login(data.user);
        if (loginSuccess) {
          console.log('✅ User session stored successfully');
          
          // Show success alert and navigate to user dashboard
          Alert.alert(
            'Login Successful! 🎉',
            'Welcome to UrbanFix. Taking you to your dashboard...',
            [
              {
                text: 'Continue',
                onPress: () => {
                  console.log('🚀 Navigating to user dashboard...');
                  // Navigate to user-homepage explicitly
                  router.replace('/user-homepage');
                }
              }
            ]
          );
        }
      } catch (loginError) {
        console.error('❌ Failed to store user session:', loginError);
        setError('Failed to save login session. Please try again.');
        return;
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to log in.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.Image 
        source={require('../assets/appicon.png')} 
        style={[styles.appIcon, { opacity: logoOpacity }]} 
      />
      <Animated.Text style={[styles.appName, { opacity: appNameOpacity }]}>UrbanFix</Animated.Text>
      <Animated.Text style={[styles.title, { opacity: signInTextOpacity }]}>Sign in via OTP</Animated.Text>

      <Animated.View style={{ width: '100%', opacity: inputOpacity }}>
        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        {showOtpInput && (
          <TextInput
            placeholder="OTP from SMS"
            style={styles.input}
            keyboardType="numeric"
            value={otp}
            onChangeText={setOtp}
            maxLength={5}
          />
        )}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Animated.View style={{ width: '100%', opacity: buttonOpacity }}>
        {!showOtpInput ? (
          <TouchableOpacity style={styles.button} onPress={handleSendOtp}>
            <Text style={styles.buttonText}>Get OTP</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: bottomTextOpacity, marginTop: 30 }}>
        <TouchableOpacity onPress={() => navigation.navigate('AccountCreation')}>
          <Text style={styles.bottomText}>Don't have an account? Create an account</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 20 },
  appIcon: { width: 200, height: 200, marginBottom: -20, marginTop: -250 },
  appName: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
  title: { fontSize: 20, marginBottom: 20, color: '#333' },
  input: { fontSize: 17, width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 15, marginBottom: 12, borderRadius: 10 },
  button: { backgroundColor: '#22c55e', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  error: { color: 'red', marginBottom: 10 },
  bottomText: { color: '#6b48ff', fontWeight: 'bold', textAlign: 'center' },
});
