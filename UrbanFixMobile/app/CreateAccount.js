// app/CreateAccount.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { apiUrl } from '../constants/api';
import * as ImagePicker from 'expo-image-picker';

export default function CreateAccount() {
  const router = useRouter();

  // ----------------------------
  // Form state
  // ----------------------------
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  // Dropdown states
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthdayInputText, setBirthdayInputText] = useState('');

  // Available options
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [locationSearch, setLocationSearch] = useState('');

  const [formData, setFormData] = useState({
    fname: '', lname: '', phone: '', email: '', username: '', password: '',
    address: '', location: '', dob: new Date(), gender: '', occupation: '', skills: '', languages: ['English (US)'],
    emergencyName: '', emergencyPhone: '', bloodGroup: '', medicalConditions: '', nid: '',
    profilePic: null, bio: '', helpType: ''
  });

  const occupations = ['Doctor', 'Engineer', 'Teacher', 'Volunteer', 'Student', 'Business Owner', 'Government Employee', 'Private Employee', 'Other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  // ----------------------------
  // Load locations on component mount
  // ----------------------------
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(apiUrl('/api/locations'));
      if (response.data.success) {
        setLocations(response.data.locations);
        setFilteredLocations(response.data.locations);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  // Filter locations based on search
  useEffect(() => {
    if (locationSearch.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location =>
        location.toLowerCase().includes(locationSearch.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [locationSearch, locations]);

  // ----------------------------
  // Step navigation
  // ----------------------------
  const handleNext = async () => {
    setError('');

    // validate current step
    switch(currentStep) {
      case 0: // Basic Identity
        if(!formData.fname || !formData.lname || !formData.phone || !formData.email || !formData.username || !formData.password){
          setError('Please fill all required fields.');
          return;
        }
        if(formData.password.length < 8){
          setError('Password must be at least 8 characters.');
          return;
        }
        break;
      case 1: // Location
        if(!formData.address || !formData.location){
          setError('Address and location are required.');
          return;
        }
        break;
      case 2: // Demographics
        if(!formData.dob || !formData.gender || !formData.occupation){
          setError('Please fill all mandatory fields.');
          return;
        }
        break;
      case 3: // Emergency & Safety
        if(!formData.bloodGroup){
          setError('Blood group is required.');
          return;
        }
        break;
      case 4: // Profile & Engagement
        // no mandatory
        break;
      case 5: // OTP step
        if(!otp){
          setError('Please enter OTP.');
          return;
        }
        await verifyOtp();
        return;
    }

    setCurrentStep(prev => prev + 1);

    // send OTP if going to last step
    if(currentStep === 4 && !otpSent){
      sendOtp();
    }
  };

  const handlePrevious = () => {
    if (currentStep === 0) return;
    setCurrentStep(prev => prev - 1);
  };

  // ----------------------------
  // OTP functions
  // ----------------------------
  const sendOtp = async () => {
    try {
      setLoading(true);
      await axios.post(apiUrl('/api/account/create'), formData);
      setOtpSent(true);
      Alert.alert('OTP Sent', 'An OTP has been sent to your email.');
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      
      let profilePicPath = null;
      
      // Upload profile picture if selected
      if (formData.profilePic && formData.profilePic.uri) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', {
            uri: formData.profilePic.uri,
            type: formData.profilePic.type || 'image/jpeg',
            name: formData.profilePic.fileName || 'profile.jpg'
          });
          formDataUpload.append('type', 'profile');
          
          const uploadRes = await axios.post(apiUrl('/api/upload'), formDataUpload, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          if (uploadRes.data.success) {
            profilePicPath = uploadRes.data.filePath;
            console.log('✅ Profile picture uploaded:', profilePicPath);
          } else {
            console.log('⚠️ Profile picture upload failed, continuing without it');
          }
        } catch (uploadError) {
          console.error('Profile picture upload error:', uploadError);
          // Continue without profile picture
        }
      }
      
      // Prepare data for backend - exclude profilePicInfo and profilePic, add profilePicPath
      const { profilePicInfo, profilePic, ...backendData } = formData;
      
      console.log('📤 Sending to backend:', {
        email: formData.email,
        hasOtp: !!otp,
        hasPassword: !!formData.password,
        profilePicPath: profilePicPath
      });
      
      const res = await axios.post(apiUrl('/api/account/verify'), { 
        email: formData.email, 
        otp,
        password: formData.password,
        profilePic: profilePicPath, // Send the file path instead of file object
        ...backendData
      });
      
      if(res.data.success){
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => router.replace('/user-homepage') }
        ]);
      } else {
        setError('Invalid OTP.');
      }
    } catch (err) {
      console.error(err);
      setError('OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Date picker functions
  // ----------------------------
  const openBirthdayModal = () => {
    setBirthdayInputText(formData.dob.toLocaleDateString('en-CA'));
    setShowDatePicker(true);
  };

  const closeBirthdayModal = () => {
    setShowDatePicker(false);
  };

  const handleBirthdayInputChange = (text) => {
    // Only allow digits and dashes
    if (/^[\d-]*$/.test(text)) {
      setBirthdayInputText(text);
      
      // Auto-format as user types
      if (text.length === 4 && !text.includes('-')) {
        setBirthdayInputText(text + '-');
      } else if (text.length === 7 && text.split('-').length === 2) {
        setBirthdayInputText(text + '-');
      }
    }
  };

  const confirmBirthday = () => {
    // Parse the date from the input text
    try {
      const newDate = new Date(birthdayInputText);
      
      // Validate the date
      if (isNaN(newDate.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
        return;
      }
      
      // Check if date is in the past (birthday should be in the past)
      if (newDate >= new Date()) {
        Alert.alert('Invalid Date', 'Birthday must be in the past.');
        return;
      }
      
      // Check if date is reasonable (not too far in the past)
      const minDate = new Date(1900, 0, 1);
      if (newDate < minDate) {
        Alert.alert('Invalid Date', 'Please enter a reasonable birth year (after 1900).');
        return;
      }
      
      setFormData(prev => ({ ...prev, dob: newDate }));
      closeBirthdayModal();
      
    } catch (error) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
    }
  };

  // ----------------------------
  // Image picker
  // ----------------------------
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        quality: 0.5
      });
      
      if(!result.canceled && result.assets && result.assets[0]){
        const asset = result.assets[0];
        // Store file info for upload
        setFormData({
          ...formData, 
          profilePic: asset, // Store the full asset object for upload
          profilePicInfo: { // Store display info separately
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'profile.jpg'
          }
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to pick image. Please try again.');
    }
  };

  // ----------------------------
  // Step rendering
  // ----------------------------
  const renderStep = () => {
    switch(currentStep){
      case 0: // Basic Identity
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <TextInput placeholder="First Name *" style={styles.input} value={formData.fname} onChangeText={t => setFormData({...formData, fname: t})} />
            <TextInput placeholder="Last Name *" style={styles.input} value={formData.lname} onChangeText={t => setFormData({...formData, lname: t})} />
            <TextInput placeholder="Phone Number *" style={styles.input} value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad"/>
            <TextInput placeholder="Email *" style={styles.input} value={formData.email} onChangeText={t => setFormData({...formData, email: t})} keyboardType="email-address"/>
            <TextInput placeholder="Username *" style={styles.input} value={formData.username} onChangeText={t => setFormData({...formData, username: t})}/>
            <TextInput placeholder="Password * (min 8 characters)" style={styles.input} secureTextEntry value={formData.password} onChangeText={t => setFormData({...formData, password: t})}/>
          </View>
        );
      case 1: // Location
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Location Information</Text>
            <TextInput placeholder="Address *" style={styles.input} value={formData.address} onChangeText={t => setFormData({...formData, address: t})}/>
            
            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={() => setShowLocationDropdown(true)}
            >
              <Text style={[styles.dropdownButtonText, !formData.location && styles.placeholderText]}>
                {formData.location || 'Select Location (City/Area) *'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        );
      case 2: // Demographics
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Demographics</Text>
            
            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={openBirthdayModal}
            >
              <Text style={styles.dropdownButtonText}>
                Date of Birth: {formData.dob.toLocaleDateString()}
              </Text>
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={() => setShowGenderDropdown(true)}
            >
              <Text style={[styles.dropdownButtonText, !formData.gender && styles.placeholderText]}>
                {formData.gender || 'Select Gender *'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Occupation *</Text>
            <View style={styles.optionsGrid}>
            {occupations.map(o => (
                <TouchableOpacity 
                  key={o} 
                  onPress={() => setFormData({...formData, occupation: o})} 
                  style={[styles.optionButton, formData.occupation===o && styles.optionButtonActive]}
                >
                  <Text style={[styles.optionButtonText, formData.occupation===o && styles.optionButtonTextActive]}>
                    {o}
                  </Text>
              </TouchableOpacity>
            ))}
            </View>

            <TextInput placeholder="Skills (optional)" style={styles.input} value={formData.skills} onChangeText={t => setFormData({...formData, skills: t})}/>
            <TextInput placeholder="Preferred Languages (optional)" style={styles.input} value={formData.languages.join(', ')} onChangeText={t => setFormData({...formData, languages: t.split(',').map(s => s.trim())})}/>
          </View>
        );
      case 3: // Emergency & Safety
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Emergency & Safety</Text>
            <TextInput placeholder="Emergency Contact Name" style={styles.input} value={formData.emergencyName} onChangeText={t => setFormData({...formData, emergencyName: t})}/>
            <TextInput placeholder="Emergency Contact Number" style={styles.input} value={formData.emergencyPhone} onChangeText={t => setFormData({...formData, emergencyPhone: t})}/>
            
            <Text style={styles.fieldLabel}>Blood Group *</Text>
            <View style={styles.optionsGrid}>
            {bloodGroups.map(bg => (
                <TouchableOpacity 
                  key={bg} 
                  onPress={() => setFormData({...formData, bloodGroup: bg})} 
                  style={[styles.optionButton, formData.bloodGroup===bg && styles.optionButtonActive]}
                >
                  <Text style={[styles.optionButtonText, formData.bloodGroup===bg && styles.optionButtonTextActive]}>
                    {bg}
                  </Text>
              </TouchableOpacity>
            ))}
            </View>

            <TextInput placeholder="Medical Conditions / Allergies (optional)" style={styles.input} value={formData.medicalConditions} onChangeText={t => setFormData({...formData, medicalConditions: t})}/>
            <TextInput placeholder="NID Verification (optional)" style={styles.input} value={formData.nid} onChangeText={t => setFormData({...formData, nid: t})}/>
          </View>
        );
      case 4: // Profile & Engagement
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Profile & Engagement</Text>
            <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
              <Text style={styles.imageButtonText}>📷 Pick Profile Picture (optional)</Text>
            </TouchableOpacity>
                         {formData.profilePic && (
               <View style={styles.imagePreviewContainer}>
                 <Text style={styles.imageUploadedText}>✅ Image uploaded successfully</Text>
                 <Text style={styles.imageDetailsText}>
                   {formData.profilePicInfo?.name || 'profile.jpg'} • {formData.profilePicInfo?.type || 'image/jpeg'}
                 </Text>
               </View>
             )}
            <TextInput placeholder="Short Bio / About Me" style={styles.input} value={formData.bio} onChangeText={t => setFormData({...formData, bio: t})}/>
            <TextInput placeholder="Preferred Help Type (optional)" style={styles.input} value={formData.helpType} onChangeText={t => setFormData({...formData, helpType: t})}/>
          </View>
        );
      case 5: // OTP
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Email Verification</Text>
            <Text style={styles.otpInfo}>We've sent a verification code to:</Text>
            <Text style={styles.emailText}>{formData.email}</Text>
                         <TextInput 
               placeholder="Enter 6-digit OTP" 
               style={styles.otpInput} 
               value={otp} 
               onChangeText={setOtp} 
               keyboardType="numeric"
               maxLength={6}
             />
             
             <TouchableOpacity 
               style={styles.resendOtpButton} 
               onPress={sendOtp}
               disabled={loading}
             >
               <Text style={styles.resendOtpButtonText}>
                 {loading ? 'Sending...' : 'Resend OTP'}
               </Text>
             </TouchableOpacity>
          </View>
        );
    }
  };

  // ----------------------------
  // Progress indicator
  // ----------------------------
  const renderProgress = () => {
    const steps = ['Basic Info', 'Location', 'Demographics', 'Emergency', 'Profile', 'Verify'];
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {currentStep + 1} of {steps.length}: {steps[currentStep]}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      <Text style={styles.title}>Create Account</Text>
      </View>
      
      {renderProgress()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderStep()}
      {error ? <Text style={styles.error}>{error}</Text> : null}
        
      <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.previousButton]} 
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <Text style={styles.previousButtonText}>Previous</Text>
        </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.nextButton]} 
            onPress={handleNext} 
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Processing...' : (currentStep === 5 ? 'Verify OTP' : 'Next')}
            </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

      {/* Gender Dropdown Modal */}
      <Modal
        visible={showGenderDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {genders.map(gender => (
              <TouchableOpacity
                key={gender}
                style={styles.modalOption}
                onPress={() => {
                  setFormData({...formData, gender});
                  setShowGenderDropdown(false);
                }}
              >
                <Text style={styles.modalOptionText}>{gender}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowGenderDropdown(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Dropdown Modal */}
      <Modal
        visible={showLocationDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search locations..."
              value={locationSearch}
              onChangeText={setLocationSearch}
            />
            <ScrollView style={styles.locationsList}>
              {filteredLocations.map(location => (
                <TouchableOpacity
                  key={location}
                  style={styles.modalOption}
                  onPress={() => {
                    setFormData({...formData, location});
                    setShowLocationDropdown(false);
                    setLocationSearch('');
                  }}
                >
                  <Text style={styles.modalOptionText}>{location}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowLocationDropdown(false);
                setLocationSearch('');
              }}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Birthday Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={closeBirthdayModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={closeBirthdayModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerLabel}>
                Enter your date of birth:
              </Text>
              
              <View style={styles.dateInputRow}>
                <Text style={styles.dateInputLabel}>Date:</Text>
                <TextInput
                  style={styles.dateInput}
                  value={birthdayInputText}
                  onChangeText={handleBirthdayInputChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              
              <Text style={styles.selectedDateText}>
                Current: {formData.dob.toLocaleDateString()}
              </Text>
              
              <Text style={styles.dateHelpText}>
                Enter date in YYYY-MM-DD format (e.g., 1990-05-15). Birthday must be in the past.
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeBirthdayModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmBirthday}>
                <Text style={styles.confirmButtonText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    width: '100%', 
    alignItems: 'center', 
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: { 
    alignSelf: 'flex-start', 
    marginLeft: 20,
    marginBottom: 15 
  },
  backButtonText: { color: '#6b48ff', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  progressContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  progressBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginBottom: 10
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  
  scrollView: { flex: 1 },
  stepContainer: { padding: 20 },
  stepTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#333',
    textAlign: 'center'
  },
  
  input: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 15, 
    marginBottom: 15, 
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: 'white'
  },
  
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: 'white'
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333'
  },
  placeholderText: {
    color: '#999'
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#666'
  },
  
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10
  },
  
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: 'white'
  },
  optionButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e'
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666'
  },
  optionButtonTextActive: {
    color: 'white',
    fontWeight: '600'
  },
  
  imageButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  imageButtonText: {
    fontSize: 16,
    color: '#666'
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9'
  },
  imageUploadedText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
    marginBottom: 4
  },
  imageDetailsText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic'
  },
  
  otpInfo: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10
  },
  emailText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20
  },
  otpInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#22c55e',
    padding: 20,
    borderRadius: 15,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 5,
    backgroundColor: 'white',
    marginBottom: 20
  },
  resendOtpButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  resendOtpButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600'
  },
  
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20,
  },
  button: { 
    flex: 1,
    paddingVertical: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    minHeight: 50
  },
  previousButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  previousButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  nextButton: {
    backgroundColor: '#22c55e'
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  
  error: { 
    color: 'red', 
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333'
  },
  modalCancelButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center'
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666'
  },
  
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16
  },
  locationsList: {
    maxHeight: 300
  },
  
  // New birthday picker styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  datePickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'center',
  },
  dateInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 15,
  },
  dateInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    borderWidth: 1,
    borderColor: '#d1d5db',
    width: 140,
    textAlign: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 15,
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    width: '100%',
  },
  dateHelpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    flex: 1,
    alignItems: 'center',
    marginRight: 7,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
