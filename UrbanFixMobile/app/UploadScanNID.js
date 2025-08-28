import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

const UploadScanNID = ({ navigation }) => {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const OCR_SPACE_API_KEY = 'K82691309388957';

  // Pick image from gallery
  const pickFromGallery = async (side) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission required', 'Media library permission needed.');

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8
      });

      if (!res.canceled && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        side === 'front' ? setFrontImage(uri) : setBackImage(uri);
      }
    } catch (err) { console.error(err); }
  };

  // Run OCR on uploaded images
  const runOCR = async () => {
    if (!frontImage && !backImage) return Alert.alert('Select Images', 'Upload at least one NID image.');

    setLoading(true);
    let combinedText = '';

    const processImage = async (uri) => {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
      formData.append('language', 'eng');
      formData.append('apikey', OCR_SPACE_API_KEY);

      const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
      const textResponse = await res.text();
      let data;
      try { data = JSON.parse(textResponse); } catch { return ''; }
      return data.ParsedResults?.[0]?.ParsedText || '';
    };

    try {
      if (frontImage) combinedText += await processImage(frontImage) + '\n';
      if (backImage) combinedText += await processImage(backImage) + '\n';

      const parsed = parseNID(combinedText);

      // Navigate to EditableForm with extracted data
      navigation.navigate('EditableForm', { extractedData: parsed });

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'OCR failed.');
    } finally {
      setLoading(false);
    }
  };

  // Parse NID text
  const parseNID = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    let name = '', dob = '', nid = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!name && /name/i.test(line)) {
        const idx = line.indexOf(':');
        name = idx !== -1 ? line.slice(idx + 1).trim() : lines[i + 1]?.trim() || '';
      }
      if (!dob && /date of birth|dob/i.test(line)) {
        const idx = line.indexOf(':');
        dob = idx !== -1 ? line.slice(idx + 1).trim() : lines[i + 1]?.trim() || '';
      }
      if (!nid) {
        const match = line.match(/(?:NID|ID NO)[:\s]*(\d{10,17})/i);
        if (match) nid = match[1];
      }
    }
    return { name, dob, nid };
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload NID Images</Text>

      {/* Front */}
      <TouchableOpacity style={styles.imageBlock} onPress={() => pickFromGallery('front')}>
        {frontImage ? <Image source={{ uri: frontImage }} style={styles.imagePreview} /> : <Text style={styles.blockText}>Front of NID</Text>}
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity style={styles.imageBlock} onPress={() => pickFromGallery('back')}>
        {backImage ? <Image source={{ uri: backImage }} style={styles.imagePreview} /> : <Text style={styles.blockText}>Back of NID</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.confirmButton} onPress={runOCR} disabled={loading}>
        {loading ? <Text style={styles.confirmText}>Scanning...</Text> : <Text style={styles.confirmText}>Scan</Text>}
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow:1, alignItems:'center', padding:20 },
  title: { fontSize:20, fontWeight:'600', marginBottom:20 },
  imageBlock: { width: width*0.9, height: width*0.5, borderWidth:2, borderColor:'#007AFF', borderRadius:10, marginVertical:10, justifyContent:'center', alignItems:'center', backgroundColor:'#f0f0f0' },
  blockText: { color:'#007AFF', fontSize:16 },
  imagePreview: { width:'100%', height:'100%', borderRadius:10 },
  confirmButton: { width: width*0.9, padding:15, backgroundColor:'#007AFF', borderRadius:10, justifyContent:'center', alignItems:'center', marginVertical:20 },
  confirmText: { color:'white', fontSize:18, fontWeight:'600' },
});

export default UploadScanNID;
