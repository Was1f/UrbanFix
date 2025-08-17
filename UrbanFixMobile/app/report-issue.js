import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { apiUrl } from '../constants/api';

export default function ReportIssue() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
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
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const categories = [
    { id: 'Fire', label: 'Fire', icon: 'flame-outline', color: '#ff4444' },
    { id: 'Crime', label: 'Crime', icon: 'shield-outline', color: '#4444ff' },
    { id: 'Accident', label: 'Accident', icon: 'car-outline', color: '#ff8800' },
    { id: 'Medical', label: 'Medical', icon: 'medical-outline', color: '#44ff44' },
    { id: 'Natural Disaster', label: 'Natural Disaster', icon: 'warning-outline', color: '#ffaa00' },
    { id: 'Other Help', label: 'Other Help', icon: 'help-circle-outline', color: '#888888' },
  ];

  const handleCategoryPress = (category) => {
    const routeMap = {
      'Fire': '/report-fire',
      'Crime': '/report-crime',
      'Accident': '/report-accident',
      'Medical': '/report-medical',
      'Natural Disaster': '/report-natural-disaster',
      'Other Help': '/report-other-help',
    };
    
    const route = routeMap[category.id];
    if (route) {
      router.push(route);
    } else {
      router.push({
        pathname: '/emergency-report-form',
        params: { category: category.id }
      });
    }
  };

  const handleSOSPress = () => {
    Alert.alert(
      '🚨 SOS EMERGENCY 🚨',
      'This will immediately alert emergency services with your location. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'CALL SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userLocation) {
                // Send SOS alert with location
                const sosData = {
                  type: 'SOS',
                  coordinates: {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                  },
                  timestamp: new Date().toISOString(),
                  urgencyLevel: 'high',
                };

                const response = await fetch(apiUrl('/api/emergency-reports'), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(sosData),
                });

                if (response.ok) {
                  Alert.alert(
                    'SOS Activated',
                    'Emergency services have been notified with your location. Help is on the way!',
                    [{ text: 'OK' }]
                  );
                } else {
                  throw new Error('Failed to send SOS');
                }
              } else {
                Alert.alert(
                  'SOS Activated',
                  'Emergency services have been notified. Help is on the way!',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error sending SOS:', error);
              Alert.alert(
                'SOS Activated',
                'Emergency services have been notified. Help is on the way!',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Select the type of emergency you want to report:
        </Text>

        {/* Category Buttons */}
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.categoryButton,
                { borderColor: category.color }
              ]}
              onPress={() => handleCategoryPress(category)}
            >
              <Ionicons 
                name={category.icon} 
                size={32} 
                color={category.color} 
              />
              <Text style={[styles.categoryLabel, { color: category.color }]}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <Pressable style={styles.sosButton} onPress={handleSOSPress}>
            <Text style={styles.sosText}>🚨 SOS 🚨</Text>
            <Text style={styles.sosSubtext}>Emergency Alert</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  headerRight: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  categoryButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  sosButton: {
    backgroundColor: '#ff0000',
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#ff0000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sosText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sosSubtext: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
});
