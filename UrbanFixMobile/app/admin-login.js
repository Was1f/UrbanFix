import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import SessionManager from '../utils/sessionManager';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Check if user is already logged in
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const isLoggedIn = await SessionManager.isAdminLoggedIn();
      if (isLoggedIn) {
        console.log('🔍 User already logged in, redirecting to dashboard');
        router.replace('/admin-dashboard');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
    }
  };

  const handleLogin = async () => {
    // Clear any previous error states
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter both username and password to continue.',
        [
          {
            text: 'OK',
            style: 'default',
          }
        ]
      );
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Attempting login with:', { username, password });
      
      const response = await fetch('http://192.168.10.115:5000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('📊 Response status:', response.status);
      const data = await response.json();
      console.log('📄 Response data:', data);

      if (response.ok) {
        // Success - reset failed attempts and store token
        setFailedAttempts(0);
        
        // Store the session data securely
        const sessionStored = await SessionManager.storeAdminSession(
          data.token,
          data.admin?.username || username,
          data.admin?.role || 'admin'
        );

        if (sessionStored) {
          console.log('✅ Login successful! Session stored securely');
          Alert.alert(
            'Login Successful! 🎉',
            'Welcome to the Admin Dashboard. You can now access moderation tools and manage content.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  // Navigate to admin dashboard without exposing token in URL
                  router.replace('/admin-dashboard');
                },
              }
            ]
          );
        } else {
          Alert.alert(
            'Login Error',
            'Failed to store session. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Increment failed attempts
        setFailedAttempts(prev => prev + 1);
        
        console.log('❌ Login failed with status:', response.status);
        console.log('❌ Error data:', data);
        
        // Handle different types of errors with specific messages
        let errorTitle = 'Login Failed';
        let errorMessage = 'Please check your credentials and try again.';

        switch (response.status) {
          case 400:
            errorTitle = 'Missing Information';
            errorMessage = 'Please provide both username and password.';
            break;
          case 401:
            if (data.error === 'INVALID_USERNAME') {
              errorTitle = 'Username Not Found ❌';
              errorMessage = 'The username you entered does not exist. Please check your username and try again.';
            } else if (data.error === 'INVALID_PASSWORD') {
              errorTitle = 'Incorrect Password ❌';
              errorMessage = 'The password you entered is incorrect. Please check your password and try again.';
            } else if (data.error === 'ACCOUNT_DEACTIVATED') {
              errorTitle = 'Account Deactivated';
              errorMessage = 'This admin account has been deactivated. Please contact the system administrator.';
            } else if (data.message === 'Invalid credentials') {
              errorTitle = 'Invalid Credentials ❌';
              errorMessage = 'The username or password you entered is incorrect. Please try again.';
            } else {
              errorTitle = 'Authentication Failed';
              errorMessage = 'Invalid username or password. Please check your credentials.';
            }
            break;
          case 500:
            errorTitle = 'Server Error';
            errorMessage = 'Something went wrong on our end. Please try again later.';
            break;
          default:
            errorTitle = 'Login Error';
            errorMessage = data.message || 'An unexpected error occurred. Please try again.';
        }

        Alert.alert(
          errorTitle,
          errorMessage,
          [
            {
              text: 'Try Again',
              style: 'default',
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setFailedAttempts(prev => prev + 1);
      Alert.alert(
        'Connection Error 🌐',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            style: 'default',
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Clear failed attempts when user starts typing
  const handleUsernameChange = (text) => {
    if (failedAttempts > 0) {
      setFailedAttempts(0);
    }
    setUsername(text);
  };

  const handlePasswordChange = (text) => {
    if (failedAttempts > 0) {
      setFailedAttempts(0);
    }
    setPassword(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Access Admin Dashboard</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[
            styles.input,
            failedAttempts > 0 && styles.inputError
          ]}
          placeholder="Username"
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TextInput
          style={[
            styles.input,
            failedAttempts > 0 && styles.inputError
          ]}
          placeholder="Password"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {failedAttempts > 0 && (
          <Text style={styles.errorText}>
            {failedAttempts === 1 ? '1 failed attempt' : `${failedAttempts} failed attempts`}
          </Text>
        )}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  backButtonText: {
    color: '#1e90ff',
    fontSize: 16,
  },
});
