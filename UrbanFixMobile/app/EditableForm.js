import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocation, useRouter } from 'expo-router';

const EditableForm = () => {
  const location = useLocation();
  const router = useRouter();

  // Directly get object from state
  const extractedData = location.state?.extractedData || { name: '', dob: '', nid: '' };

  const [formData, setFormData] = useState({
    name: extractedData.name,
    dob: extractedData.dob,
    nid: extractedData.nid,
  });

  const handleSave = () => {
    console.log('Updated user data:', formData);
    Alert.alert('Success', 'NID verification completed!');
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Extracted Data</Text>

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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  saveButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  saveText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

export default EditableForm;
