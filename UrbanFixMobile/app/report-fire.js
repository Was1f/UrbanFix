import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  ScrollView,
  TextInput,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiUrl, API_BASE_URL } from '../constants/api';
import { WebView } from 'react-native-webview';

export default function ReportFire() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    urgencyLevel: 'moderate',
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);
  // Listen for messages from iframe when running on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'move' && data.center) {
          setMapCenter({ latitude: data.center.latitude, longitude: data.center.longitude });
        }
      } catch (_) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setMapCenter]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required to report incidents accurately.');
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
      
      // Get address from coordinates
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address.length > 0) {
        const addr = address[0];
        const locationString = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        setFormData(prev => ({ ...prev, location: locationString }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to record video.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaFiles(prev => [...prev, { type: 'video', uri: result.assets[0].uri }]);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  };

  const handleRecordAudio = async () => {
    Alert.alert('Audio Recording', 'Audio recording feature will be implemented soon.');
  };

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaFiles(prev => [...prev, { type: 'image', uri: result.assets[0].uri }]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const effectiveCoords = mapCenter || (userLocation ? {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      } : null);
      const reportData = {
        ...formData,
        category: 'Fire',
        urgencyLevel: formData.urgencyLevel,
        mediaFiles: mediaFiles,
        coordinates: effectiveCoords,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(apiUrl('/api/emergency-reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Fire report submitted successfully! Emergency services have been notified.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/user-homepage'),
            },
          ]
        );
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: '#44ff44' },
    { value: 'moderate', label: 'Moderate', color: '#ffaa00' },
    { value: 'high', label: 'High', color: '#ff4444' },
  ];

  const getLeafletHtml = (latitude, longitude) => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          .leaflet-container { background: #fff; }
          #placeholder { position: absolute; top: 8px; left: 8px; padding: 4px 8px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 4px; font-family: sans-serif; font-size: 12px; z-index: 9999; }
        </style>
      </head>
      <body>
        <div id="placeholder">Map loading...</div>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          (function(){
            function postToHost(type, payload){
              try {
                var msg = JSON.stringify({ type: type, payload: payload });
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(msg);
                } else if (window.parent && window.parent.postMessage) {
                  window.parent.postMessage({ type: type, payload: payload }, '*');
                }
              } catch (_) {}
            }
            // Bridge console logs and errors back to host
            (function(){
              var origLog = console.log, origWarn = console.warn, origError = console.error;
              console.log = function(){ try { postToHost('log', { level: 'log', args: Array.prototype.slice.call(arguments) }); } catch(_){}; origLog.apply(console, arguments); };
              console.warn = function(){ try { postToHost('log', { level: 'warn', args: Array.prototype.slice.call(arguments) }); } catch(_){}; origWarn.apply(console, arguments); };
              console.error = function(){ try { postToHost('log', { level: 'error', args: Array.prototype.slice.call(arguments) }); } catch(_){}; origError.apply(console, arguments); };
              window.onerror = function(message, source, lineno, colno, error){ postToHost('js_error', { message: String(message), source: source, line: lineno, col: colno }); };
              window.addEventListener('unhandledrejection', function(e){ postToHost('promise_rejection', { reason: String(e.reason || 'unknown') }); });
            })();
            // Quick connectivity probe to OSM tile server
            (function(){
              try {
                var testUrl = 'https://tile.openstreetmap.org/1/1/1.png';
                fetch(testUrl, { method: 'HEAD' }).then(function(r){ postToHost('tile_probe', { ok: r.ok, status: r.status }); }).catch(function(err){ postToHost('tile_probe', { ok: false, error: String(err) }); });
              } catch (err) { postToHost('tile_probe', { ok: false, error: String(err) }); }
            })();
            function init(){
              try {
                var lat = ${Number.isFinite(latitude) ? latitude : 23.8103};
                var lng = ${Number.isFinite(longitude) ? longitude : 90.4125};
                var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([lat, lng], 15);
                var errorTile = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApEBm0s0YH0AAAAASUVORK5CYII=';
                var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true, errorTileUrl: errorTile });
                tiles.on('tileerror', function(e){ try { postToHost('tile_error', { url: (e && e.tile && e.tile.src) || 'unknown' }); } catch(_){} });
                tiles.on('load', function(){ try { postToHost('tiles_loaded', {}); } catch(_){} });
                tiles.addTo(map);
                var marker = L.marker([lat, lng]).addTo(map);
                var placeholder = document.getElementById('placeholder');
                if (placeholder) placeholder.remove();
                function postCenter(){
                  var c = map.getCenter();
                  var payload = { type: 'move', center: { latitude: c.lat, longitude: c.lng } };
                  postToHost('move', payload);
                }
                map.on('moveend', postCenter);
                postToHost('ready', { message: 'Leaflet initialized' });
                postCenter();
              } catch (err) {
                postToHost('error', { message: String(err) });
              }
            }
            if (document.readyState === 'complete' || document.readyState === 'interactive') { init(); }
            else { document.addEventListener('DOMContentLoaded', init); }
          })();
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
                 <Pressable style={styles.backButton} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={24} color="#000" />
         </Pressable>
        <Text style={styles.headerTitle}>Report Fire</Text>
                 <Pressable style={styles.helpButton}>
           <Ionicons name="help-circle-outline" size={24} color="#000" />
         </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Location Input */}
        <View style={styles.locationContainer}>
          <TextInput
            style={styles.locationInput}
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Search for..."
            placeholderTextColor="#999"
          />
                     <Ionicons name="location" size={20} color="#000" />
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
              {(() => {
                const IFrame = 'iframe';
                return (
                  <IFrame
                    srcDoc={getLeafletHtml(
                      userLocation?.coords?.latitude,
                      userLocation?.coords?.longitude
                    )}
                    style={{ width: '100%', height: '100%', border: 0 }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                );
              })()}
            </View>
          ) : (
            <WebView
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              androidLayerType="hardware"
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              cacheEnabled
              incognito={false}
              thirdPartyCookiesEnabled
              userAgent="Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data?.type === 'move' && data?.payload?.center) {
                    setMapCenter({ latitude: data.payload.center.latitude, longitude: data.payload.center.longitude });
                  } else if (data?.type === 'ready') {
                    console.log('Leaflet ready:', data?.payload);
                  } else if (data?.type === 'tile_probe') {
                    console.log('Tile probe:', data?.payload);
                  } else if (data?.type === 'tile_error') {
                    console.warn('Tile error:', data?.payload);
                  } else if (data?.type === 'tiles_loaded') {
                    console.log('Tiles loaded');
                  } else if (data?.type === 'js_error') {
                    Alert.alert('Map JS Error', String(data?.payload?.message || 'Unknown'));
                  } else if (data?.type === 'promise_rejection') {
                    Alert.alert('Map Promise Rejection', String(data?.payload?.reason || 'Unknown'));
                  } else if (data?.type === 'error') {
                    Alert.alert('Map Error', String(data?.payload?.message || 'Unknown'));
                  } else if (data?.type === 'log') {
                    const level = data?.payload?.level || 'log';
                    console[level]('Leaflet(WebView):', ...(data?.payload?.args || []));
                  }
                } catch (e) {}
              }}
              onError={(e) => {
                try {
                  const desc = e?.nativeEvent?.description || 'Unknown error';
                  Alert.alert('Map Error', desc);
                } catch (_) {}
              }}
              onHttpError={(e) => {
                try {
                  const code = e?.nativeEvent?.statusCode;
                  Alert.alert('Map HTTP Error', String(code));
                } catch (_) {}
              }}
              source={{ html: getLeafletHtml(
                userLocation?.coords?.latitude,
                userLocation?.coords?.longitude
              ), baseUrl: 'https://tile.openstreetmap.org/' }}
              style={{ width: '100%', height: 220, backgroundColor: '#fff' }}
            />
          )}
        </View>

        {/* Description Input */}
        <View style={styles.descriptionContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe Your Issues Here..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Attach Evidence */}
        <View style={styles.evidenceSection}>
          <Text style={styles.sectionTitle}>Attach Evidence</Text>
          <View style={styles.evidenceButtons}>
                         <Pressable style={styles.evidenceButton} onPress={handleRecordVideo}>
               <Ionicons name="videocam" size={20} color="#000" />
               <Text style={styles.evidenceButtonText}>Record Video</Text>
             </Pressable>
                         <Pressable style={styles.evidenceButton} onPress={handleRecordAudio}>
               <Ionicons name="mic" size={20} color="#000" />
               <Text style={styles.evidenceButtonText}>Record Audio</Text>
             </Pressable>
                         <Pressable style={styles.evidenceButton} onPress={handleUploadImage}>
               <Ionicons name="image" size={20} color="#000" />
               <Text style={styles.evidenceButtonText}>Upload Image</Text>
             </Pressable>
          </View>
        </View>

        {/* Urgency Level */}
        <View style={styles.urgencySection}>
          <Text style={styles.sectionTitle}>Urgency Level</Text>
          <View style={styles.urgencyButtons}>
            {urgencyLevels.map((level) => (
              <Pressable
                key={level.value}
                style={[
                  styles.urgencyButton,
                  formData.urgencyLevel === level.value && {
                    backgroundColor: level.color,
                    borderColor: level.color,
                  },
                ]}
                onPress={() => setFormData({ ...formData, urgencyLevel: level.value })}
              >
                <Text
                  style={[
                    styles.urgencyButtonText,
                    formData.urgencyLevel === level.value && styles.urgencyButtonTextSelected,
                  ]}
                >
                  {level.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Media Upload Placeholder */}
        {mediaFiles.length > 0 && (
          <View style={styles.mediaContainer}>
            <Text style={styles.sectionTitle}>Uploaded Media</Text>
            <View style={styles.mediaList}>
              {mediaFiles.map((file, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Ionicons 
                    name={file.type === 'video' ? 'videocam' : 'image'} 
                    size={20} 
                    color="#007AFF" 
                  />
                  <Text style={styles.mediaText}>{file.type} {index + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
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
  helpButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
             locationContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  mapContainer: {
    backgroundColor: '#D2B48C',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 200,
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
             descriptionContainer: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
     descriptionInput: {
     fontSize: 16,
     color: '#000',
     minHeight: 120,
     textAlignVertical: 'top',
   },
  evidenceSection: {
    marginBottom: 16,
  },
     sectionTitle: {
     fontSize: 16,
     fontWeight: '700',
     color: '#000',
     marginBottom: 12,
   },
  evidenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
             evidenceButton: {
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
     evidenceButtonText: {
     fontSize: 14,
     fontWeight: '600',
     color: '#000',
   },
  urgencySection: {
    marginBottom: 16,
  },
  urgencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D2B48C',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D2B48C',
  },
  urgencyButtonTextSelected: {
    color: '#fff',
  },
  mediaContainer: {
    marginBottom: 16,
  },
  mediaList: {
    gap: 8,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D2B48C',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  mediaText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#ff0000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
