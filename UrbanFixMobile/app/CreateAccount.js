// app/CreateAccount.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { apiUrl } from '../constants/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

export default function CreateAccount() {
  const navigation = useNavigation();

  // ----------------------------
  // Form state
  // ----------------------------
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const [formData, setFormData] = useState({
    fname: '', lname: '', phone: '', email: '', username: '', password: '',
    address: '', dob: new Date(), gender: '', occupation: '', skills: '', languages: ['English (US)'],
    emergencyName: '', emergencyPhone: '', bloodGroup: '', medicalConditions: '', nid: '',
    profilePic: null, bio: '', helpType: ''
  });

  const occupations = ['Doctor', 'Engineer', 'Teacher', 'Volunteer', 'Other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

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
        if(!formData.address){
          setError('Address is required.');
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
    if(currentStep === 0) return;
    setCurrentStep(prev => prev - 1);
  };

  // ----------------------------
  // OTP functions
  // ----------------------------
  const sendOtp = async () => {
    try {
      setLoading(true);
      await axios.post(apiUrl('/api/send-otp'), { email: formData.email });
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
      const res = await axios.post(apiUrl('/api/verify-otp'), { email: formData.email, otp });
      if(res.data.success){
        // create user
        const createRes = await axios.post(apiUrl('/api/user'), formData);
        if(createRes.data && createRes.data._id){
          Alert.alert('Success', 'Account created successfully!', [
            { text: 'OK', onPress: () => navigation.replace('Home') }
          ]);
        } else throw new Error('Unexpected server response');
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
  // Step rendering
  // ----------------------------
  const renderStep = () => {
    switch(currentStep){
      case 0: // Basic Identity
        return (
          <View>
            <TextInput placeholder="First Name" style={styles.input} value={formData.fname} onChangeText={t => setFormData({...formData, fname: t})} />
            <TextInput placeholder="Last Name" style={styles.input} value={formData.lname} onChangeText={t => setFormData({...formData, lname: t})} />
            <TextInput placeholder="Phone Number" style={styles.input} value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad"/>
            <TextInput placeholder="Email" style={styles.input} value={formData.email} onChangeText={t => setFormData({...formData, email: t})} keyboardType="email-address"/>
            <TextInput placeholder="Username" style={styles.input} value={formData.username} onChangeText={t => setFormData({...formData, username: t})}/>
            <TextInput placeholder="Password" style={styles.input} secureTextEntry value={formData.password} onChangeText={t => setFormData({...formData, password: t})}/>
          </View>
        );
      case 1: // Location
        return (
          <TextInput placeholder="Address" style={styles.input} value={formData.address} onChangeText={t => setFormData({...formData, address: t})}/>
        );
      case 2: // Demographics
        return (
          <View>
            <Text>Date of Birth</Text>
            <DateTimePicker value={formData.dob} mode="date" display="default" onChange={(e, date) => date && setFormData({...formData, dob: date})}/>
            <TextInput placeholder="Gender" style={styles.input} value={formData.gender} onChangeText={t => setFormData({...formData, gender: t})}/>
            <Text>Occupation</Text>
            {occupations.map(o => (
              <TouchableOpacity key={o} onPress={() => setFormData({...formData, occupation: o})} style={[styles.dropdownItem, formData.occupation===o && {backgroundColor:'#22c55e'}]}>
                <Text style={{color: formData.occupation===o?'white':'black'}}>{o}</Text>
              </TouchableOpacity>
            ))}
            <TextInput placeholder="Skills (optional)" style={styles.input} value={formData.skills} onChangeText={t => setFormData({...formData, skills: t})}/>
            <TextInput placeholder="Preferred Languages (optional)" style={styles.input} value={formData.languages.join(', ')} onChangeText={t => setFormData({...formData, languages: t.split(',').map(s => s.trim())})}/>
          </View>
        );
      case 3: // Emergency & Safety
        return (
          <View>
            <TextInput placeholder="Emergency Contact Name" style={styles.input} value={formData.emergencyName} onChangeText={t => setFormData({...formData, emergencyName: t})}/>
            <TextInput placeholder="Emergency Contact Number" style={styles.input} value={formData.emergencyPhone} onChangeText={t => setFormData({...formData, emergencyPhone: t})}/>
            <Text>Blood Group</Text>
            {bloodGroups.map(bg => (
              <TouchableOpacity key={bg} onPress={() => setFormData({...formData, bloodGroup: bg})} style={[styles.dropdownItem, formData.bloodGroup===bg && {backgroundColor:'#22c55e'}]}>
                <Text style={{color: formData.bloodGroup===bg?'white':'black'}}>{bg}</Text>
              </TouchableOpacity>
            ))}
            <TextInput placeholder="Medical Conditions / Allergies (optional)" style={styles.input} value={formData.medicalConditions} onChangeText={t => setFormData({...formData, medicalConditions: t})}/>
            <TextInput placeholder="NID Verification (optional)" style={styles.input} value={formData.nid} onChangeText={t => setFormData({...formData, nid: t})}/>
          </View>
        );
      case 4: // Profile & Engagement
        return (
          <View>
            <TouchableOpacity onPress={pickImage} style={styles.button}><Text style={{color:'white'}}>Pick Profile Picture (optional)</Text></TouchableOpacity>
            {formData.profilePic && <Text>Selected: {formData.profilePic.uri}</Text>}
            <TextInput placeholder="Short Bio / About Me" style={styles.input} value={formData.bio} onChangeText={t => setFormData({...formData, bio: t})}/>
            <TextInput placeholder="Preferred Help Type (optional)" style={styles.input} value={formData.helpType} onChangeText={t => setFormData({...formData, helpType: t})}/>
          </View>
        );
      case 5: // OTP
        return (
          <TextInput placeholder="Enter OTP" style={styles.input} value={otp} onChangeText={setOtp} keyboardType="numeric"/>
        );
    }
  };

  // ----------------------------
  // Image picker
  // ----------------------------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if(!result.cancelled){
      setFormData({...formData, profilePic: result});
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      {renderStep()}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, {backgroundColor:'#ccc'}]} onPress={handlePrevious}>
          <Text>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNext} disabled={loading}>
          <Text>{loading ? 'Processing...' : (currentStep===5?'Verify OTP':'Next')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 },
  button: { backgroundColor: '#22c55e', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10, minWidth: 120 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  error: { color: 'red', marginBottom: 10 },
  dropdownItem: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginVertical: 4 }
});
