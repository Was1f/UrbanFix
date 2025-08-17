import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiUrl } from '../constants/api';

export default function EmergencyContacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'Fire Brigade', label: 'Fire Brigade', icon: 'flame-outline', color: '#ff4444' },
    { id: 'Police Station', label: 'Police Station', icon: 'shield-outline', color: '#4444ff' },
    { id: 'Emergency', label: 'Emergency', icon: 'warning-outline', color: '#ffaa00' },
    { id: 'Hospital', label: 'Hospital', icon: 'medical-outline', color: '#44ff44' },
  ];

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await fetch(apiUrl('/api/emergency-contacts'));
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      } else {
        // Fallback to dummy data if API fails
        setContacts(getDummyContacts());
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Fallback to dummy data
      setContacts(getDummyContacts());
    } finally {
      setLoading(false);
    }
  };

  const getDummyContacts = () => {
    return [
      // Fire Brigade Contacts
      {
        category: 'Fire Brigade',
        name: 'Dhaka Central Fire Station',
        phoneNumber: '16163',
        address: 'Dhaka Central Fire Station, Dhaka-1000',
        description: '24/7 Fire Emergency Service - Main Station'
      },
      {
        category: 'Fire Brigade',
        name: 'Gulshan Fire Station',
        phoneNumber: '+880-2-988-1234',
        address: 'Gulshan-1, Dhaka-1212',
        description: 'Local Fire Station - Gulshan Area'
      },
      {
        category: 'Fire Brigade',
        name: 'Dhanmondi Fire Station',
        phoneNumber: '+880-2-912-3456',
        address: 'Dhanmondi-27, Dhaka-1209',
        description: 'Fire Station - Dhanmondi Area'
      },
      {
        category: 'Fire Brigade',
        name: 'Banani Fire Station',
        phoneNumber: '+880-2-988-7890',
        address: 'Banani-11, Dhaka-1213',
        description: 'Fire Station - Banani Area'
      },
      {
        category: 'Fire Brigade',
        name: 'Mirpur Fire Station',
        phoneNumber: '+880-2-900-1234',
        address: 'Mirpur-10, Dhaka-1216',
        description: 'Fire Station - Mirpur Area'
      },
      
      // Police Station Contacts
      {
        category: 'Police Station',
        name: 'Dhaka Metropolitan Police (DMP)',
        phoneNumber: '999',
        address: 'DMP Headquarters, Dhaka-1000',
        description: 'Emergency Police Service - Main Control'
      },
      {
        category: 'Police Station',
        name: 'Gulshan Police Station',
        phoneNumber: '+880-2-988-5678',
        address: 'Gulshan-2, Dhaka-1212',
        description: 'Local Police Station - Gulshan Area'
      },
      {
        category: 'Police Station',
        name: 'Dhanmondi Police Station',
        phoneNumber: '+880-2-912-6789',
        address: 'Dhanmondi-27, Dhaka-1209',
        description: 'Police Station - Dhanmondi Area'
      },
      {
        category: 'Police Station',
        name: 'Banani Police Station',
        phoneNumber: '+880-2-988-9012',
        address: 'Banani-11, Dhaka-1213',
        description: 'Police Station - Banani Area'
      },
      {
        category: 'Police Station',
        name: 'Mirpur Police Station',
        phoneNumber: '+880-2-900-3456',
        address: 'Mirpur-10, Dhaka-1216',
        description: 'Police Station - Mirpur Area'
      },
      
      // Emergency Services Contacts
      {
        category: 'Emergency',
        name: 'National Emergency Service',
        phoneNumber: '999',
        address: 'Emergency Control Room, Dhaka-1000',
        description: 'General Emergency Service - 24/7'
      },
      {
        category: 'Emergency',
        name: 'Civil Defense Headquarters',
        phoneNumber: '+880-2-955-4321',
        address: 'Civil Defense HQ, Dhaka-1000',
        description: 'Civil Defense Emergency Services'
      },
      {
        category: 'Emergency',
        name: 'Bangladesh Red Crescent Society',
        phoneNumber: '+880-2-955-1234',
        address: 'Red Crescent HQ, Dhaka-1000',
        description: 'Emergency Relief and Rescue Services'
      },
      {
        category: 'Emergency',
        name: 'Fire Service & Civil Defense',
        phoneNumber: '+880-2-955-5678',
        address: 'Fire Service HQ, Dhaka-1000',
        description: 'Fire and Civil Defense Services'
      },
      {
        category: 'Emergency',
        name: 'Emergency Response Unit',
        phoneNumber: '+880-2-955-9012',
        address: 'Emergency Response Center, Dhaka-1000',
        description: 'Specialized Emergency Response'
      },
      
      // Hospital Contacts
      {
        category: 'Hospital',
        name: 'Dhaka Medical College Hospital',
        phoneNumber: '+880-2-966-1551',
        address: 'Dhaka Medical College, Dhaka-1000',
        description: 'Emergency Medical Service - 24/7'
      },
      {
        category: 'Hospital',
        name: 'Square Hospital',
        phoneNumber: '+880-2-814-2431',
        address: 'Square Hospital, Dhaka-1212',
        description: 'Private Hospital Emergency Service'
      },
      {
        category: 'Hospital',
        name: 'Apollo Hospitals Dhaka',
        phoneNumber: '+880-2-814-2431',
        address: 'Apollo Hospitals, Dhaka-1212',
        description: 'International Standard Hospital'
      },
      {
        category: 'Hospital',
        name: 'United Hospital Limited',
        phoneNumber: '+880-2-883-6444',
        address: 'United Hospital, Dhaka-1212',
        description: 'Multi-specialty Hospital'
      },
      {
        category: 'Hospital',
        name: 'Popular Medical Centre',
        phoneNumber: '+880-2-912-3456',
        address: 'Popular Medical Centre, Dhaka-1209',
        description: 'General Hospital Emergency'
      },
      
      // Additional Emergency Contacts
      {
        category: 'Emergency',
        name: 'Ambulance Service',
        phoneNumber: '+880-2-955-1111',
        address: 'Emergency Ambulance Service, Dhaka',
        description: '24/7 Ambulance Service'
      },
      {
        category: 'Emergency',
        name: 'Disaster Management',
        phoneNumber: '+880-2-955-2222',
        address: 'Disaster Management Bureau, Dhaka',
        description: 'Disaster Response and Management'
      },
      {
        category: 'Emergency',
        name: 'Search & Rescue',
        phoneNumber: '+880-2-955-3333',
        address: 'Search & Rescue Unit, Dhaka',
        description: 'Specialized Search and Rescue'
      },
      {
        category: 'Hospital',
        name: 'Emergency Blood Bank',
        phoneNumber: '+880-2-955-4444',
        address: 'Central Blood Bank, Dhaka',
        description: 'Emergency Blood Supply'
      },
      {
        category: 'Hospital',
        name: 'Poison Control Center',
        phoneNumber: '+880-2-955-5555',
        address: 'Poison Control Center, Dhaka',
        description: 'Poison Emergency Services'
      }
    ];
  };

  const getContactsByCategory = (category) => {
    return contacts.filter(contact => contact.category === category);
  };

  const handleCategoryPress = (category) => {
    router.push({
      pathname: '/emergency-contact-list',
      params: { category: category.id }
    });
  };

  const handleCall = (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Alert.alert(
      'Make Call',
      `Call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            Linking.openURL(`tel:${cleanNumber}`);
          }
        }
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
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Tap on any category to view emergency contacts:
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
              <Text style={styles.contactCount}>
                {getContactsByCategory(category.id).length} contacts
              </Text>
            </Pressable>
          ))}
        </View>

        {/* All Contacts List */}
        <Text style={styles.sectionTitle}>All Emergency Contacts</Text>
        <View style={styles.contactsList}>
          {loading ? (
            <Text style={styles.loadingText}>Loading contacts...</Text>
          ) : (
            contacts.map((contact, index) => (
              <Pressable
                key={index}
                style={styles.contactItem}
                onPress={() => handleCall(contact.phoneNumber)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                  <Text style={styles.contactDescription}>{contact.description}</Text>
                </View>
                <Ionicons name="call-outline" size={24} color="#007AFF" />
              </Pressable>
            ))
          )}
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
  contactCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  contactsList: {
    gap: 12,
  },
  contactItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});
