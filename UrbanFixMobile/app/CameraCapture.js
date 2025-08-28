import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Text, Alert } from 'react-native';
import { Camera } from 'expo-camera'; // Correct for SDK 53 + expo-camera 13.x
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const CameraCapture = ({ onCapture, onClose, side = 'front' }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestPermissionsAsync(); // SDK 53 uses requestPermissionsAsync
        setHasPermission(status === 'granted');
      } catch (err) {
        console.error('Camera permission error:', err);
        setHasPermission(false);
      }
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current) {
      console.warn('Camera ref is null!');
      return;
    }

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      onCapture(photo.uri, side);
    } catch (error) {
      console.error('Take picture error:', error);
      Alert.alert('Error', 'Failed to capture photo.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) return <ActivityIndicator size="large" color="#000" />;

  if (!hasPermission)
    return (
      <View style={styles.center}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={{ color: 'white' }}>Close</Text>
        </TouchableOpacity>
      </View>
    );

  // Use Camera.Constants.Type for SDK 53
  const cameraType =
    side === 'front' ? Camera.Constants.Type.front : Camera.Constants.Type.back;

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={cameraType} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.frame} />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCapture} style={styles.captureButton}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Ionicons name="camera" size={48} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame: {
    width: width * 0.8,
    height: height * 0.4,
    borderWidth: 2,
    borderColor: 'lime',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  captureButton: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 50 },
  closeButton: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default CameraCapture;
