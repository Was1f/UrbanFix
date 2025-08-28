import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import config from '../config'; // ✅ use API_BASE_URL

const { width } = Dimensions.get('window');
const OCR_SPACE_API_KEY = 'K82691309388957';

const UploadScanNID = ({ userId }) => {   // ✅ Expect userId as prop
  const router = useRouter();
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [formData, setFormData] = useState({ name: '', dob: '', nid: '' });

  const pickFromGallery = async (side) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission required', 'Media library permission needed.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        side === 'front' ? setFrontImage(uri) : setBackImage(uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const processImage = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const form = new FormData();
      form.append('base64Image', `data:image/jpeg;base64,${base64}`);
      form.append('language', 'eng');
      form.append('isOverlayRequired', 'true');
      form.append('apikey', OCR_SPACE_API_KEY);

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
      });

      const data = await response.json();
      if (data.IsErroredOnProcessing) {
        console.error('OCR Error:', data.ErrorMessage);
        return '';
      }

      return data.ParsedResults?.[0]?.ParsedText || '';
    } catch (err) {
      console.error('OCR fetch error:', err);
      return '';
    }
  };

  const parseNID = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

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
        const match = line.match(/(?:NID|ID NO|IDNUMBER|ID NUMBER)[:\s]*(\d{10,17})/i);
        if (match) nid = match[1];
      }
    }

    return { name, dob, nid };
  };

  const runOCR = async () => {
    if (!frontImage && !backImage) {
      return Alert.alert('Select Images', 'Upload at least one NID image.');
    }

    setLoading(true);
    try {
      let combinedText = '';
      if (frontImage) combinedText += await processImage(frontImage) + '\n';
      if (backImage) combinedText += await processImage(backImage) + '\n';

      const parsed = parseNID(combinedText);
      setExtractedData(parsed);
      setFormData(parsed);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'OCR failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nid) return Alert.alert('Error', 'NID is required');


    const text = await response.text();
console.log('Raw response:', text);

let data;
try {
  data = JSON.parse(text);
} catch {
  throw new Error('Invalid JSON from server');
}

    setLoading(true);
    try {
      // ✅ Send to backend with proper API_BASE_URL & userId
      const response = await fetch(`${config.API_BASE_URL}/api/user/${userId}/nid`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nid: formData.nid,
    dob: formData.dob,
  }),
});


      const data = await response.json();
      if (!response.ok) return Alert.alert('Error', data.message || 'Failed to update NID');

      Alert.alert('Success', 'NID and user info updated successfully!', [
        { text: 'OK', onPress: () => router.push('/EditProfileScreen') },
      ]);
    } catch (err) {
      console.error('Request error:', err);
      Alert.alert('Error', 'Something went wrong while updating NID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload NID Images</Text>

      <TouchableOpacity style={styles.imageBlock} onPress={() => pickFromGallery('front')}>
        {frontImage ? <Image source={{ uri: frontImage }} style={styles.imagePreview} /> : <Text style={styles.blockText}>Front of NID</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.imageBlock} onPress={() => pickFromGallery('back')}>
        {backImage ? <Image source={{ uri: backImage }} style={styles.imagePreview} /> : <Text style={styles.blockText}>Back of NID</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.confirmButton} onPress={runOCR} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Scan</Text>}
      </TouchableOpacity>

      {extractedData && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Edit Extracted Data</Text>

          <Text>Name:</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />

          <Text>Date of Birth:</Text>
          <TextInput
            style={styles.input}
            value={formData.dob}
            onChangeText={(text) => setFormData({ ...formData, dob: text })}
          />

          <Text>NID Number:</Text>
          <TextInput
            style={styles.input}
            value={formData.nid}
            onChangeText={(text) => setFormData({ ...formData, nid: text })}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Submit</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  imageBlock: {
    width: width * 0.9,
    height: width * 0.5,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  blockText: { color: '#007AFF', fontSize: 16 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 10 },
  confirmButton: {
    width: width * 0.9,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  confirmText: { color: 'white', fontSize: 18, fontWeight: '600' },
  formContainer: { width: '100%', marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 10 },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  saveButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

export default UploadScanNID;
