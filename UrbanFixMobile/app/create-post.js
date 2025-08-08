import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Picker } from "@react-native-picker/picker";

const { width } = Dimensions.get("window");
const postTypes = ["Report Problem", "Event", "Poll", "Donation Call"];
const locations = [
  "Dhanmondi", "Banani", "Gulshan", "Mohakhali", "Uttara", 
  "Mirpur", "Wari", "Old Dhaka", "Tejgaon", "Ramna"
];

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Report Problem");
  const [location, setLocation] = useState("Dhanmondi");
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Request permissions
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permission is required to select images');
      }
    })();
  }, []);

  const uploadFiles = async () => {
    if (!image && !audio) return {};
    
    setUploading(true);
    const formData = new FormData();
    
    if (image) {
      formData.append('image', {
        uri: image,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
    }
    
    if (audio) {
      formData.append('audio', {
        uri: audio,
        name: 'audio.m4a',
        type: 'audio/m4a',
      });
    }
    
    try {
      const response = await fetch('http://192.168.56.1:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    Alert.alert("Debug", "Submit pressed");
    if (!title.trim()) {
      Alert.alert("Validation Error", "Title cannot be empty");
      return;
    }

    if (!location) {
      Alert.alert("Validation Error", "Please select a location");
      return;
    }

    try {
      // Upload files first if any
      const uploadedFiles = await uploadFiles();

      // Create discussion
      const discussionData = {
        title: title.trim(),
        description: description.trim(),
        type,
        location,
        author: "Anonymous",
        image: uploadedFiles.image || null,
        audio: uploadedFiles.audio || null,
      };

      const response = await fetch("http://192.168.56.1:5000/api/discussions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discussionData),
      });

      if (response.ok) {
        Alert.alert("Success", "Post created successfully");
        router.back();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error posting:", error);
      Alert.alert("Error", "Network or server error");
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const pickAudio = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAudio(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick audio file");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.header}>Create New Post</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Post Type Tabs */}
        <View style={styles.tabRow}>
          {postTypes.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tab,
                type === t && { backgroundColor: "#6c47ff" },
              ]}
              onPress={() => setType(t)}
            >
              <Text
                style={[
                  styles.tabText,
                  type === t && { color: "#fff" },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Image Preview */}
        {image && (
          <View style={styles.mediaPreview}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => setImage(null)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Audio Preview */}
        {audio && (
          <View style={styles.mediaPreview}>
            <Text style={styles.audioText}>🎵 Audio selected</Text>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => setAudio(null)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Title Input */}
        <TextInput
          style={styles.input}
          placeholder="Enter title"
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write something..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Media Upload Buttons */}
        <View style={styles.mediaRow}>
          <TouchableOpacity 
            style={styles.mediaBtn}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.mediaBtnText}>Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mediaBtn}
            onPress={pickAudio}
            disabled={uploading}
          >
            <Text style={styles.mediaBtnText}>Audio</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mediaBtn}
            onPress={takePhoto}
            disabled={uploading}
          >
            <Text style={styles.mediaBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {/* Location Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Location:</Text>
          <Picker
            selectedValue={location}
            onValueChange={(itemValue) => setLocation(itemValue)}
            style={styles.picker}
          >
            {locations.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} />
            ))}
          </Picker>
        </View>

        {/* Bottom buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.previewBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.previewText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.submitBtn, (uploading || !title.trim()) && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={uploading || !title.trim()}
          >
            <Text style={styles.submitText}>
              {uploading ? "Uploading..." : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f8fb", padding: 16 },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6c47ff",
    textAlign: "center",
    marginBottom: 20,
  },
  tabRow: { flexDirection: "row", marginBottom: 16, flexWrap: "wrap" },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#6c47ff",
    marginRight: 8,
    marginBottom: 8,
  },
  tabText: { color: "#6c47ff", fontSize: 13, fontWeight: "500" },
  mediaPreview: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  audioText: {
    padding: 20,
    textAlign: "center",
    fontSize: 16,
    color: "#666",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  mediaRow: { flexDirection: "row", marginBottom: 16, flexWrap: "wrap" },
  mediaBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  mediaBtnText: { fontSize: 13, color: "#333" },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 16,
    padding: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  picker: {
    height: 50,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  previewBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  previewText: { color: "#333", fontWeight: "500" },
  submitBtn: {
    backgroundColor: "#6c47ff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  disabledBtn: {
    backgroundColor: "#ccc",
  },
  submitText: { color: "#fff", fontWeight: "600" },
});