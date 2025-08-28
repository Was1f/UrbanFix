import React from 'react';
import { View, Text, ScrollView, Button, StyleSheet } from 'react-native';

const NIDVerifyScreen = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NID Verification</Text>
        <Text style={styles.description}>
          Scan both sides of your NID card. Ensure the images are clear and readable.
        </Text>
        <Button
          title="Start NID Verification"
          onPress={() => navigation.navigate('UploadScanNID')} // Navigate to UploadScanNID screen
        />
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
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
    textAlign: 'center',
  },
});

export default NIDVerifyScreen;
