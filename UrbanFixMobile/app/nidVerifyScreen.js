import { Camera } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as FileSystem from 'expo-file-system';

// Example function after taking a photo
const recognizeText = async (imageUri) => {
  try {
    const result = await TextRecognition.recognize(imageUri);
    console.log("Recognized Text:", result.text);
    return result.text;
  } catch (error) {
    console.log("OCR Error:", error);
    return "";
  }
};
