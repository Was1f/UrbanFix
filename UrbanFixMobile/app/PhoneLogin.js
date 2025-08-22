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

  const [identifier, setIdentifier] = useState(''); // can be phone or email
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

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
    if (!identifier) {
      setError('Please enter a valid phone number or email.');
      return;
    }
    setError('');
    setOtpLoading(true);

    // Determine if input is email or phone
    const isEmail = identifier.includes('@');

    try {
      const res = await fetch(apiUrl('/api/login-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEmail ? { email: identifier } : { phone: identifier }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Identifier not registered.');
      } else {
        setShowOtpInput(true);
                Alert.alert('OTP Sent', `Please check your ${isEmail ? 'email' : 'SMS'} for the OTP.`);
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      if (err.message.includes('Network request failed')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Server error. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 5) {
      setError('Please enter a valid 5-digit OTP.');
      return;
    }
    setError('');
    setLoading(true);

    const isEmail = identifier.includes('@');

    try {
      const res = await fetch(apiUrl('/api/login-verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEmail ? { email: identifier, otp } : { phone: identifier, otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user || !data.user._id) {
        setError(data.message || 'Invalid response from server.');
        return;
      }

      console.log('✅ OTP verified successfully for:', identifier);
      console.log('📄 User data received:', data.user);

      const loginSuccess = await login(data.user);
      if (loginSuccess) {
        Alert.alert(
          'Login Successful! 🎉',
          'Welcome to UrbanFix. Taking you to your dashboard...',
          [{ text: 'Continue', onPress: () => router.replace('/user-homepage') }]
        );
      }
    } catch (err) {
      console.error('Login failed:', err);
      if (err.message.includes('Network request failed')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
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
          placeholder="Phone or Email"
          style={styles.input}
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
        />
        {showOtpInput && (
          <TextInput
            placeholder="OTP"
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
          <TouchableOpacity 
            style={[styles.button, otpLoading && styles.buttonDisabled]} 
            onPress={handleSendOtp}
            disabled={otpLoading}
          >
            <Text style={styles.buttonText}>
              {otpLoading ? 'Sending OTP...' : 'Get OTP'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: bottomTextOpacity, marginTop: 30 }}>
        <TouchableOpacity onPress={() => router.push('/CreateAccount')}>
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
  buttonDisabled: { backgroundColor: '#9ca3af', opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  error: { color: 'red', marginBottom: 10 },
  bottomText: { color: '#6b48ff', fontWeight: 'bold', textAlign: 'center' },
});
