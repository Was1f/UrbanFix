import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const NIDVerifyScreen = () => {
  const router = useRouter();

  const handleStartVerification = () => {
    router.push('/UploadScanNID');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NID Verification</Text>
        <Text style={styles.description}>
          Scan both sides of your NID card. Ensure the images are clear and readable.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleStartVerification}>
          <Text style={styles.buttonText}>Start NID Verification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  content: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  description: { fontSize: 16, marginBottom: 20, color: '#555', textAlign: 'center' },
  button: { backgroundColor: '#6b48ff', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default NIDVerifyScreen;
