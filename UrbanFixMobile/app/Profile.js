import React, { useContext, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import API_URL from "../config/api";

export default function Profile({ navigation }) {
  const { user: loggedInUser, updateUser } = useContext(AuthContext);

  // Fetch fresh user data on screen focus
  useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const fetchUser = async () => {
      if (!loggedInUser?._id) return;

      try {
        const res = await axios.get(`${API_URL}/api/user/${loggedInUser._id}`);
        if (isActive && res.data?._id) {
          updateUser(res.data); // update context
        }
      } catch (err) {
        console.error('Error fetching user:', err.message);
        if (isActive) {
          // fallback to previous context data, don't overwrite with empty/bad data
          updateUser(loggedInUser);
        }
      }
    };

    fetchUser();
    return () => { isActive = false; };
  }, [loggedInUser])
);

  if (!loggedInUser) return <Text style={{ textAlign: 'center', marginTop: 20 }}>User not found</Text>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => console.log('Open settings')}>
          <Text style={styles.headerBtn}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Profile Info */}
        <Image source={require('../assets/profile.jpg')} style={styles.profileImage} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.name}>
            {loggedInUser.fname && loggedInUser.lname
              ? `${loggedInUser.fname} ${loggedInUser.lname}`
              : loggedInUser.name}
          </Text>
          {loggedInUser.verificationBadge && (
            <Ionicons name="checkmark-circle" size={22} color="#1DA1F2" style={{ marginLeft: 6 }} />
          )}
        </View>
        <Text style={styles.profession}>{loggedInUser.profession}</Text>
        <Text style={styles.address}>{loggedInUser.address}</Text>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfileScreen', { userId: loggedInUser._id })}
        >
          <Text style={{ fontWeight: 'bold', color: 'white' }}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingVertical: 22
  },
  headerBtn: { color: 'white', fontSize: 22, marginTop: 28 },
  headerTitle: { color: 'white', fontSize: 20, marginTop: 28 },
  profileImage: { width: 120, height: 120, borderRadius: 80, marginBottom: 10, alignSelf: 'center' },
  name: { fontSize: 25, textAlign: 'center', marginBottom: 7, fontWeight: 'bold' },
  profession: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 2 },
  address: { color: '#666', textAlign: 'center', marginBottom: 2 },
  editBtn: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 25,
    marginVertical: 15,
    alignSelf: 'center',
    width: '50%',
    alignItems: 'center'
  },
});
