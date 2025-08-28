import React, { useState, useContext, useEffect, useRef } from 'react';
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
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../constants/api';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import SessionManager from '../utils/sessionManager';

export default function TicketDetail() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    checkUserType();
  }, [ticketId]);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId, isAdmin, adminSession]);



  const checkUserType = async () => {
    try {
      const adminSession = await SessionManager.getAdminSession();
      console.log('🔍 Admin session check:', { 
        hasSession: !!adminSession, 
        hasToken: !!adminSession?.token,
        tokenLength: adminSession?.token?.length 
      });
      if (adminSession) {
        setIsAdmin(true);
        setAdminSession(adminSession);
        console.log('✅ Admin session set successfully');
      }
    } catch (error) {
      console.log('❌ Not an admin session:', error);
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ticket:', { 
        ticketId, 
        isAdmin, 
        hasAdminSession: !!adminSession,
        hasToken: !!adminSession?.token 
      });
      
      if (isAdmin) {
        // Admin request - use JWT token
        console.log('🔍 Making admin request with token:', adminSession?.token?.substring(0, 20) + '...');
        const response = await axios.get(apiUrl(`/api/tickets/${ticketId}`), {
          headers: {
            'Authorization': `Bearer ${adminSession?.token}`,
          },
        });
        
        if (response.data.success) {
          setTicket(response.data.ticket);
          console.log('✅ Admin ticket fetch successful');
        }
      } else {
        // User request - pass userId as query parameter, no JWT token
        console.log('🔍 Making user request for userId:', user?._id);
        const response = await axios.get(apiUrl(`/api/tickets/${ticketId}?userId=${user._id}`));
        
        if (response.data.success) {
          setTicket(response.data.ticket);
          console.log('✅ User ticket fetch successful');
        }
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
          } else {
            Alert.alert('Error', 'Failed to upload image.');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setUploadingImage(false);
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

    // Check if ticket is resolved and user is not admin
    if (!isAdmin && ticket?.status === 'resolved') {
      Alert.alert('Ticket Resolved', 'This ticket has been resolved and is no longer accepting new messages.');
      return;
    }

    setSending(true);
    try {
      if (isAdmin) {
        // Admin message - use JWT token
        console.log('🔍 Sending admin message with token:', adminSession?.token?.substring(0, 20) + '...');
        const response = await axios.post(apiUrl(`/api/tickets/${ticketId}/messages`), {
          content: message.trim(),
          attachments
        }, {
          headers: {
            'Authorization': `Bearer ${adminSession?.token}`,
          },
        });
        
        if (response.data.success) {
          setMessage('');
          setAttachments([]);
          // Add the new message directly to the ticket without refreshing
          const newMessage = {
            sender: { username: adminSession?.username || 'Admin' },
            content: message.trim(),
            attachments: attachments,
            timestamp: new Date().toISOString(),
            senderModel: 'Admin' // Add this to fix sender display
          };
          setTicket(prev => ({
            ...prev,
            messages: [...(prev?.messages || []), newMessage]
          }));
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      } else {
        // User message - include userId in body, no JWT token
        const response = await axios.post(apiUrl(`/api/tickets/${ticketId}/messages`), {
          userId: user._id,
          content: message.trim(),
          attachments
        });
        
        if (response.data.success) {
          setMessage('');
          setAttachments([]);
          // Add the new message directly to the ticket without refreshing
          const newMessage = {
            sender: { fname: user.fname, lname: user.lname },
            content: message.trim(),
            attachments: attachments,
            timestamp: new Date().toISOString(),
            senderModel: 'User' // Add this to fix sender display
          };
          setTicket(prev => ({
            ...prev,
            messages: [...(prev?.messages || []), newMessage]
          }));
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (newStatus) => {
    if (!isAdmin) return;

    try {
      const response = await axios.patch(apiUrl(`/api/tickets/${ticketId}/status`), {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${adminSession?.token}`,
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
      Alert.alert('Error', 'Failed to update ticket status.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#2196F3';
      case 'in_progress': return '#FF9800';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6b48ff" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Ticket not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <View style={styles.headerActions}>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.statusBtn}
              onPress={() => {
                Alert.alert(
                  'Update Status',
                  'Select new status:',
                  [
                    { text: 'Open', onPress: () => updateTicketStatus('open') },
                    { text: 'In Progress', onPress: () => updateTicketStatus('in_progress') },
                    { text: 'Resolved', onPress: () => updateTicketStatus('resolved') },
                    { text: 'Closed', onPress: () => updateTicketStatus('closed') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={styles.statusBtnText}>Status</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* Ticket Info */}
      <View style={styles.ticketInfo}>
        <View style={styles.ticketMeta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
              <Text style={styles.statusBadgeText}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Priority:</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
              <Text style={styles.priorityBadgeText}>
                {ticket.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Category:</Text>
            <Text style={styles.categoryText}>
              {ticket.category.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.adminInfo}>
            <Text style={styles.adminLabel}>User: {ticket.user?.fname} {ticket.user?.lname}</Text>
            <Text style={styles.adminLabel}>Phone: {ticket.user?.phone}</Text>
            <Text style={styles.adminLabel}>Email: {ticket.user?.email}</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {ticket.messages?.map((msg, index) => (
          <View key={index} style={[
            styles.messageContainer,
            msg.senderModel === 'User' ? styles.userMessage : styles.adminMessage
          ]}>
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>
                {msg.senderModel === 'User' 
                  ? `${ticket.user?.fname} ${ticket.user?.lname}`
                  : `Admin ${msg.sender?.username || 'Support'}`
                }
              </Text>
              <Text style={styles.messageTime}>
                {formatDate(msg.timestamp)}
              </Text>
            </View>
            
            <Text style={styles.messageContent}>{msg.content}</Text>
            
            {msg.attachments && msg.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {msg.attachments.map((attachment, attIndex) => (
                  <Image
                    key={attIndex}
                    source={{ uri: `${apiUrl('')}${attachment.uri}` }}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsPreview}>
            <Text style={styles.attachmentsTitle}>Attachments:</Text>
            {attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentPreview}>
                <Image
                  source={{ uri: `${apiUrl('')}${attachment.uri}` }}
                  style={styles.attachmentPreviewImage}
                />
                <TouchableOpacity
                  style={styles.removeAttachmentBtn}
                  onPress={() => removeAttachment(index)}
                >
                  <Text style={styles.removeAttachmentText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Resolved Ticket Notice */}
        {!isAdmin && ticket?.status === 'resolved' && (
          <View style={styles.resolvedNotice}>
            <Text style={styles.resolvedNoticeText}>
              ⚠️ This ticket has been resolved and is no longer accepting new messages.
            </Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[styles.attachBtn, (!isAdmin && ticket?.status === 'resolved') && styles.disabledButton]}
            onPress={handleImageUpload}
            disabled={uploadingImage || (!isAdmin && ticket?.status === 'resolved')}
          >
            <Text style={[styles.attachBtnText, (!isAdmin && ticket?.status === 'resolved') && styles.disabledText]}>
              {uploadingImage ? '📤' : '📎'}
            </Text>
          </TouchableOpacity>
          
          <TextInput
            style={[styles.messageInput, (!isAdmin && ticket?.status === 'resolved') && styles.disabledInput]}
            value={message}
            onChangeText={setMessage}
            placeholder={(!isAdmin && ticket?.status === 'resolved') ? "Ticket resolved - no new messages allowed" : "Type your message..."}
            multiline
            maxLength={500}
            editable={isAdmin || ticket?.status !== 'resolved'}
          />
          
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() && attachments.length === 0) && styles.sendBtnDisabled, (!isAdmin && ticket?.status === 'resolved') && styles.disabledButton]}
            onPress={sendMessage}
            disabled={sending || (!message.trim() && attachments.length === 0) || (!isAdmin && ticket?.status === 'resolved')}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#6b48ff',
  },
  headerBtn: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaRow: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  adminInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  adminLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  adminMessage: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageContent: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  attachmentsPreview: {
    marginBottom: 12,
  },
  attachmentsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  attachmentPreview: {
    position: 'relative',
    marginBottom: 8,
  },
  attachmentPreviewImage: {
    width: 100,
    height: 75,
    borderRadius: 8,
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAttachmentText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachBtn: {
    padding: 12,
    marginRight: 8,
  },
  attachBtnText: {
    fontSize: 20,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#6b48ff',
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
    borderColor: '#ddd',
  },
  resolvedNotice: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  resolvedNoticeText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#6b48ff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
