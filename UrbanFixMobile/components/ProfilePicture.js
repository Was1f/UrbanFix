// ProfilePicture.js - Reusable component for user profile pictures
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { apiUrl } from '../constants/api';

const ProfilePicture = ({ 
  profilePicture, 
  name = 'Anonymous', 
  size = 32,
  style = {} 
}) => {
  // Helper function to get initials from name
  const getInitials = (fullName) => {
    if (!fullName || fullName === 'Anonymous') return 'A';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
      return apiUrl(imagePath);
    }
    
    if (!imagePath.startsWith('/')) {
      return apiUrl(`/uploads/profile/${imagePath}`);
    }
    
    return apiUrl(imagePath);
  };

  // Generate a consistent color based on the name
  const getBackgroundColor = (name) => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
      '#d946ef', '#ec4899', '#f43f5e'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const imageUrl = getImageUrl(profilePicture);
  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style
  };

  if (imageUrl) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Image 
          source={{ uri: imageUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={(error) => {
            console.log('Profile picture load error:', error.nativeEvent.error);
          }}
        />
      </View>
    );
  }

  // Fallback to initials with colored background
  return (
    <View style={[
      styles.container, 
      containerStyle,
      { backgroundColor }
    ]}>
      <Text style={[
        styles.initials, 
        { 
          fontSize: size * 0.4,
          lineHeight: size * 0.4
        }
      ]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfilePicture;