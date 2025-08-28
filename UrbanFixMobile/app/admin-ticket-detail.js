import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiUrl } from '../constants/api';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import SessionManager from '../utils/sessionManager';

export default function AdminTicketDetail() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    checkAdminSession();
  }, []);

  useEffect(() => {
    if (adminSession?.token && ticketId) {
      fetchTicket();
    }
  }, [adminSession, ticketId]);

  const checkAdminSession = async () => {
    try {
      const session = await SessionManager.getAdminSession();
      if (session?.token) {
        setAdminSession(session);
        console.log('✅ Admin session loaded successfully');
      } else {
        console.log('❌ No admin session found');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('❌ Error checking admin session:', error);
      router.replace('/admin-login');
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching admin ticket:', ticketId);
      
      const response = await axios.get(apiUrl(`/api/tickets/${ticketId}`), {
        headers: {
          'Authorization': `Bearer ${adminSession.token}`,
        },
      });
      
      if (response.data.success) {
        setTicket(response.data.ticket);
        console.log('✅ Admin ticket fetch successful');
      }
    } catch (error) {
      console.error('❌ Error fetching ticket:', error);
      Alert.alert('Error', 'Failed to load ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const convertImageToBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingImage(true);
        const asset = result.assets[0];
        
        try {
          const base64Image = await convertImageToBase64(asset.uri);
          
          const uploadRes = await axios.post(apiUrl('/api/upload/base64'), {
            imageBase64: base64Image,
            imageFileName: asset.fileName || 'ticket-attachment.jpg',
            type: 'ticket'
          });

          if (uploadRes.data.success) {
            const newAttachment = {
              uri: uploadRes.data.filePath,
              type: 'image/jpeg',
              size: 0,
              filename: asset.fileName || 'ticket-attachment.jpg'
            };
            setAttachments([...attachments, newAttachment]);
            Alert.alert('Success', 'Image attached successfully!');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
  };

  const sendMessage = async () => {
    if (!message.trim() && attachments.length === 0) {
      Alert.alert('Error', 'Please enter a message or attach an image.');
      return;
    }

    setSending(true);
    try {
      console.log('🔍 Sending admin message with token:', adminSession.token.substring(0, 20) + '...');
      
      const response = await axios.post(apiUrl(`/api/tickets/${ticketId}/messages`), {
        content: message.trim(),
        attachments
      }, {
        headers: {
          'Authorization': `Bearer ${adminSession.token}`,
        },
      });
      
      if (response.data.success) {
        setMessage('');
        setAttachments([]);
        // Add the new message directly to the ticket without refreshing
        const newMessage = {
          sender: { username: adminSession.username || 'Admin' },
          content: message.trim(),
          attachments: attachments,
          timestamp: new Date().toISOString(),
          senderModel: 'Admin'
        };
        setTicket(prev => ({
          ...prev,
          messages: [...(prev?.messages || []), newMessage]
        }));
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (newStatus) => {
    try {
      setStatusChanging(true);
      
      const response = await axios.patch(apiUrl(`/api/tickets/${ticketId}/status`), {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${adminSession.token}`,
        },
      });

      if (response.data.success) {
        // Update ticket status locally without refreshing
        setTicket(prev => ({
          ...prev,
          status: newStatus
        }));
        Alert.alert('Success', `Ticket status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      Alert.alert('Error', 'Failed to update ticket status. Please try again.');
    } finally {
      setStatusChanging(false);
    }
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Ticket not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
             {/* Header */}
       <View style={styles.header}>
         <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={24} color="#6366f1" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Ticket #{ticket._id.slice(-6)}</Text>
         <View style={styles.headerActions}>
           <TouchableOpacity 
             style={styles.infoButton}
             onPress={() => {
               Alert.alert(
                 'Ticket Information',
                 `Subject: ${ticket.subject}\n\nCategory: ${ticket.category}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nCreated: ${new Date(ticket.createdAt).toLocaleDateString()}`,
                 [{ text: 'OK' }]
               );
             }}
           >
             <Ionicons name="information-circle-outline" size={24} color="#6366f1" />
           </TouchableOpacity>
           <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
             <Text style={styles.statusText}>{ticket.status.replace('_', ' ').toUpperCase()}</Text>
           </View>
           <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
             <Text style={styles.priorityText}>{ticket.priority.toUpperCase()}</Text>
           </View>
         </View>
       </View>

       {/* Status Change Bar - Always Visible */}
       <View style={styles.statusBar}>
         <Text style={styles.statusBarLabel}>Status:</Text>
         <View style={styles.statusButtons}>
           {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
             <TouchableOpacity
               key={status}
               style={[
                 styles.statusButton,
                 ticket.status === status && styles.statusButtonActive
               ]}
               onPress={() => updateTicketStatus(status)}
               disabled={statusChanging}
             >
               <Text style={[
                 styles.statusButtonText,
                 ticket.status === status && styles.statusButtonTextActive
               ]}>
                 {status.replace('_', ' ').toUpperCase()}
               </Text>
             </TouchableOpacity>
           ))}
         </View>

       </View>

      <ScrollView style={styles.content} ref={scrollViewRef}>
        {/* Ticket Info - Compact Header */}
        <View style={styles.ticketInfo}>
          <Text style={styles.subject}>{ticket.subject}</Text>
          <View style={styles.ticketMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Category:</Text>
              <Text style={styles.metaValue}>{ticket.category}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created:</Text>
              <Text style={styles.metaValue}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
            </View>
            
          </View>
        </View>

        

        {/* Messages - Chat Style */}
        <View style={styles.messagesSection}>
          {ticket.messages?.map((msg, index) => (
            <View key={index} style={[
              styles.messageContainer,
              msg.senderModel === 'Admin' ? styles.adminMessage : styles.userMessage
            ]}>
              <View style={styles.messageHeader}>
                <Text style={[
                  styles.senderName,
                  { color: msg.senderModel === 'Admin' ? '#1e293b' : '#ffffff' }
                ]}>
                  {msg.senderModel === 'Admin' 
                    ? (msg.sender?.username || 'Admin')
                    : `${msg.sender?.fname || ''} ${msg.sender?.lname || ''}`.trim() || 'User'
                  }
                </Text>
                <Text style={[
                  styles.messageTime,
                  { color: msg.senderModel === 'Admin' ? '#64748b' : '#e2e8f0' }
                ]}>
                  {new Date(msg.timestamp).toLocaleString()}
                </Text>
              </View>
              <Text style={[
                styles.messageContent,
                { color: msg.senderModel === 'Admin' ? '#475569' : '#ffffff' }
              ]}>
                {msg.content}
              </Text>
              {msg.attachments && msg.attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {msg.attachments.map((attachment, attIndex) => (
                    <Image
                      key={attIndex}
                      source={{ uri: attachment.uri }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={handleImageUpload}>
            <Ionicons name="attach" size={24} color="#6366f1" />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type your message..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!message.trim() && attachments.length === 0) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={sending || (!message.trim() && attachments.length === 0)}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsPreview}>
            {attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentPreview}>
                <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => removeAttachment(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoButton: {
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusBar: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    minWidth: 50,
  },
  ticketInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subject: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 24,
  },
  category: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 4,
  },
  createdAt: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  assignedTo: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  ticketMeta: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },

  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  statusButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  statusButtonTextActive: {
    color: '#fff',
  },

  messagesSection: {
    padding: 16,
    marginBottom: 0,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    maxWidth: '85%',
  },
  adminMessage: {
    backgroundColor: '#f0f9ff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    backgroundColor: '#6366f1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  attachmentsContainer: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  attachmentPreview: {
    position: 'relative',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
});
