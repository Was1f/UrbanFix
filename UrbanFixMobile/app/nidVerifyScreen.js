import React, { useState } from 'react';
import { View, Text, ScrollView, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import CameraCapture from './CameraCapture';
import ImagePreview from './ImagePreview';
import OCRService from './OCRService';
import EditableForm from './EditableForm';

const NIDVerifyScreen = () => {
  const [step, setStep] = useState('intro'); // intro, camera, preview, form
  const [currentSide, setCurrentSide] = useState('front');
  const [capturedImages, setCapturedImages] = useState({ front: null, back: null });
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Capture callback from CameraCapture
  const handleCapture = (uri, side) => {
    setCapturedImages(prev => ({ ...prev, [side]: uri }));

    if (side === 'front') {
      setCurrentSide('back');
      setStep('camera'); // Move to capture back side
    } else {
      setStep('preview'); // Both images captured, show preview
    }
  };

  // Retake callback
  const handleRetake = (side) => {
    setCapturedImages(prev => ({ ...prev, [side]: null }));
    setCurrentSide(side);
    setStep('camera');
  };

  // Confirm preview callback
  const handleConfirmPreview = async () => {
    setLoading(true);
    try {
      const frontOCR = await OCRService.processNIDImage(capturedImages.front);
      const backOCR = await OCRService.processNIDImage(capturedImages.back);

      const mergedData = {
        name: frontOCR.data.name || backOCR.data.name || '',
        dateOfBirth: frontOCR.data.dateOfBirth || backOCR.data.dateOfBirth || '',
        nidNumber: frontOCR.data.nidNumber || backOCR.data.nidNumber || '',
        address: frontOCR.data.address || backOCR.data.address || ''
      };

      setOcrResult({ ...mergedData, rawText: frontOCR.rawText + '\n' + backOCR.rawText });
      setStep('form');
    } catch (err) {
      Alert.alert('OCR Error', 'Failed to extract NID data. Please retake images.');
      setCapturedImages({ front: null, back: null });
      setCurrentSide('front');
      setStep('camera');
    } finally {
      setLoading(false);
    }
  };

  // Save callback
  const handleSave = (formData) => {
    Alert.alert('Success', 'NID verification completed successfully!');
    console.log('Verified NID Data:', formData);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        {step === 'intro' && (
          <View>
            <Text style={styles.title}>NID Verification</Text>
            <Text style={styles.description}>
              Scan both sides of your NID card. Ensure the images are clear and readable.
            </Text>
            <Button title="Start Verification" onPress={() => setStep('camera')} />
          </View>
        )}

        {step === 'camera' && (
          <CameraCapture
            onCapture={handleCapture}
            onClose={() => setStep('intro')}
            side={currentSide}
          />
        )}

        {step === 'preview' && (
          <View>
            <ImagePreview
              imageUri={capturedImages.front}
              side="front"
              onRetake={() => handleRetake('front')}
              onConfirm={handleConfirmPreview}
              isProcessing={loading}
            />
            <ImagePreview
              imageUri={capturedImages.back}
              side="back"
              onRetake={() => handleRetake('back')}
              onConfirm={handleConfirmPreview}
              isProcessing={loading}
            />
          </View>
        )}

        {step === 'form' && ocrResult && (
          <EditableForm
            extractedData={ocrResult}
            onSave={handleSave}
            onCancel={() => {
              setStep('camera');
              setCurrentSide('front');
              setCapturedImages({ front: null, back: null });
            }}
            isLoading={loading}
          />
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  description: { fontSize: 16, marginBottom: 20, color: '#555' },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});

export default NIDVerifyScreen;
