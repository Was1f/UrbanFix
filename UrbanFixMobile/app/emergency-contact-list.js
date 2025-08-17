import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function EmergencyContactList() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  
  const [contacts, setContacts] = useState(getDummyContactsByCategory(category));

  const categoryConfig = {
    'Fire Brigade': { 
      title: 'Fire Brigade', 
      icon: 'flame', 
      color: '#ff4444',
      description: 'Emergency fire services and rescue operations'
    },
    'Police Station': { 
      title: 'Police Station', 
      icon: 'shield', 
      color: '#4444ff',
      description: 'Law enforcement and emergency police services'
    },
    'Emergency': { 
      title: 'Emergency Services', 
      icon: 'warning', 
      color: '#ffaa00',
      description: 'General emergency and civil defense services'
    },
    'Hospital': { 
      title: 'Hospitals', 
      icon: 'medical', 
      color: '#44ff44',
      description: 'Medical emergency and healthcare services'
    },
  };

  const config = categoryConfig[category] || categoryConfig['Emergency'];

  function getDummyContactsByCategory(category) {
    const allContacts = {
      'Fire Brigade': [
        {
          name: 'Dhaka Central Fire Station',
          phoneNumber: '16163',
          address: 'Dhaka Central Fire Station, Dhaka-1000',
          description: '24/7 Fire Emergency Service - Main Station',
          distance: '0.5 km',
          rating: '4.8',
          isNearest: true
        },
        {
          name: 'Gulshan Fire Station',
          phoneNumber: '+880-2-988-1234',
          address: 'Gulshan-1, Dhaka-1212',
          description: 'Local Fire Station - Gulshan Area',
          distance: '2.1 km',
          rating: '4.6',
          isNearest: false
        },
        {
          name: 'Dhanmondi Fire Station',
          phoneNumber: '+880-2-912-3456',
          address: 'Dhanmondi-27, Dhaka-1209',
          description: 'Fire Station - Dhanmondi Area',
          distance: '3.2 km',
          rating: '4.5',
          isNearest: false
        },
        {
          name: 'Banani Fire Station',
          phoneNumber: '+880-2-988-7890',
          address: 'Banani-11, Dhaka-1213',
          description: 'Fire Station - Banani Area',
          distance: '4.5 km',
          rating: '4.4',
          isNearest: false
        },
        {
          name: 'Mirpur Fire Station',
          phoneNumber: '+880-2-900-1234',
          address: 'Mirpur-10, Dhaka-1216',
          description: 'Fire Station - Mirpur Area',
          distance: '6.8 km',
          rating: '4.3',
          isNearest: false
        }
      ],
      'Police Station': [
        {
          name: 'Dhaka Metropolitan Police (DMP)',
          phoneNumber: '999',
          address: 'DMP Headquarters, Dhaka-1000',
          description: 'Emergency Police Service - Main Control',
          distance: '0.8 km',
          rating: '4.7',
          isNearest: true
        },
        {
          name: 'Gulshan Police Station',
          phoneNumber: '+880-2-988-5678',
          address: 'Gulshan-2, Dhaka-1212',
          description: 'Local Police Station - Gulshan Area',
          distance: '1.9 km',
          rating: '4.5',
          isNearest: false
        },
        {
          name: 'Dhanmondi Police Station',
          phoneNumber: '+880-2-912-6789',
          address: 'Dhanmondi-27, Dhaka-1209',
          description: 'Police Station - Dhanmondi Area',
          distance: '2.8 km',
          rating: '4.4',
          isNearest: false
        },
        {
          name: 'Banani Police Station',
          phoneNumber: '+880-2-988-9012',
          address: 'Banani-11, Dhaka-1213',
          description: 'Police Station - Banani Area',
          distance: '3.7 km',
          rating: '4.3',
          isNearest: false
        },
        {
          name: 'Mirpur Police Station',
          phoneNumber: '+880-2-900-3456',
          address: 'Mirpur-10, Dhaka-1216',
          description: 'Police Station - Mirpur Area',
          distance: '5.2 km',
          rating: '4.2',
          isNearest: false
        }
      ],
      'Emergency': [
        {
          name: 'National Emergency Service',
          phoneNumber: '999',
          address: 'Emergency Control Room, Dhaka-1000',
          description: 'General Emergency Service - 24/7',
          distance: '0.3 km',
          rating: '4.9',
          isNearest: true
        },
        {
          name: 'Civil Defense Headquarters',
          phoneNumber: '+880-2-955-4321',
          address: 'Civil Defense HQ, Dhaka-1000',
          description: 'Civil Defense Emergency Services',
          distance: '1.2 km',
          rating: '4.6',
          isNearest: false
        },
        {
          name: 'Bangladesh Red Crescent Society',
          phoneNumber: '+880-2-955-1234',
          address: 'Red Crescent HQ, Dhaka-1000',
          description: 'Emergency Relief and Rescue Services',
          distance: '2.1 km',
          rating: '4.5',
          isNearest: false
        },
        {
          name: 'Fire Service & Civil Defense',
          phoneNumber: '+880-2-955-5678',
          address: 'Fire Service HQ, Dhaka-1000',
          description: 'Fire and Civil Defense Services',
          distance: '2.8 km',
          rating: '4.4',
          isNearest: false
        },
        {
          name: 'Emergency Response Unit',
          phoneNumber: '+880-2-955-9012',
          address: 'Emergency Response Center, Dhaka-1000',
          description: 'Specialized Emergency Response',
          distance: '3.5 km',
          rating: '4.3',
          isNearest: false
        }
      ],
      'Hospital': [
        {
          name: 'Dhaka Medical College Hospital',
          phoneNumber: '+880-2-966-1551',
          address: 'Dhaka Medical College, Dhaka-1000',
          description: 'Emergency Medical Service - 24/7',
          distance: '0.7 km',
          rating: '4.8',
          isNearest: true
        },
        {
          name: 'Square Hospital',
          phoneNumber: '+880-2-814-2431',
          address: 'Square Hospital, Dhaka-1212',
          description: 'Private Hospital Emergency Service',
          distance: '1.8 km',
          rating: '4.7',
          isNearest: false
        },
        {
          name: 'Apollo Hospitals Dhaka',
          phoneNumber: '+880-2-814-2431',
          address: 'Apollo Hospitals, Dhaka-1212',
          description: 'International Standard Hospital',
          distance: '2.3 km',
          rating: '4.6',
          isNearest: false
        },
        {
          name: 'United Hospital Limited',
          phoneNumber: '+880-2-883-6444',
          address: 'United Hospital, Dhaka-1212',
          description: 'Multi-specialty Hospital',
          distance: '3.1 km',
          rating: '4.5',
          isNearest: false
        },
        {
          name: 'Popular Medical Centre',
          phoneNumber: '+880-2-912-3456',
          address: 'Popular Medical Centre, Dhaka-1209',
          description: 'General Hospital Emergency',
          distance: '3.8 km',
          rating: '4.4',
          isNearest: false
        }
      ]
    };

    return allContacts[category] || [];
  }

  const handleCall = (contact) => {
    const cleanNumber = contact.phoneNumber.replace(/[^0-9+]/g, '');
    Alert.alert(
      'Make Emergency Call',
      `Call ${contact.name}?\n${contact.phoneNumber}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          style: 'default',
          onPress: () => {
            Linking.openURL(`tel:${cleanNumber}`);
          }
        }
      ]
    );
  };

  const handleGetDirections = (contact) => {
    Alert.alert(
      'Get Directions',
      `Open map directions to ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Map', 
          onPress: () => {
            const address = encodeURIComponent(contact.address);
            Linking.openURL(`https://maps.google.com/?q=${address}`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: config.color }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Description */}
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIcon, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon} size={32} color="#fff" />
          </View>
          <Text style={styles.categoryDescription}>{config.description}</Text>
        </View>

        {/* Nearest Contact Highlight */}
        {contacts.length > 0 && contacts[0].isNearest && (
          <View style={styles.nearestSection}>
            <Text style={styles.nearestTitle}>🚨 Nearest {config.title}</Text>
            <Pressable 
              style={[styles.nearestContact, { borderColor: config.color }]}
              onPress={() => handleCall(contacts[0])}
            >
              <View style={styles.nearestContactInfo}>
                <Text style={styles.nearestContactName}>{contacts[0].name}</Text>
                <Text style={styles.nearestContactPhone}>{contacts[0].phoneNumber}</Text>
                <Text style={styles.nearestContactDistance}>{contacts[0].distance} away</Text>
              </View>
              <View style={[styles.callButton, { backgroundColor: config.color }]}>
                <Ionicons name="call" size={24} color="#fff" />
              </View>
            </Pressable>
          </View>
        )}

        {/* All Contacts List */}
        <Text style={styles.sectionTitle}>All {config.title} Contacts</Text>
        <View style={styles.contactsList}>
          {contacts.map((contact, index) => (
            <View key={index} style={styles.contactItem}>
              <View style={styles.contactInfo}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.isNearest && (
                    <View style={styles.nearestBadge}>
                      <Text style={styles.nearestBadgeText}>Nearest</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                <Text style={styles.contactAddress}>{contact.address}</Text>
                <Text style={styles.contactDescription}>{contact.description}</Text>
                <View style={styles.contactMeta}>
                  <Text style={styles.contactDistance}>📍 {contact.distance}</Text>
                  <Text style={styles.contactRating}>⭐ {contact.rating}</Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: config.color }]}
                  onPress={() => handleCall(contact)}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                </Pressable>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => handleGetDirections(contact)}
                >
                  <Ionicons name="location" size={20} color="#666" />
                </Pressable>
              </View>
            </View>
          ))}
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
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryDescription: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  nearestSection: {
    marginBottom: 24,
  },
  nearestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  nearestContact: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  nearestContactInfo: {
    flex: 1,
  },
  nearestContactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  nearestContactPhone: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  nearestContactDistance: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  nearestBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  nearestBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  contactAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  contactMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  contactDistance: {
    fontSize: 12,
    color: '#666',
  },
  contactRating: {
    fontSize: 12,
    color: '#666',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

