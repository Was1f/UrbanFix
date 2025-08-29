import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BanModal = ({
  visible,
  onClose,
  selectedUser,
  banType,
  setBanType,
  banExpiryDate,
  setBanExpiryDate,
  banReason,
  setBanReason,
  onBanUser,
  banLoading,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ban User</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Banning: {selectedUser?.fname} {selectedUser?.lname}
          </Text>
          
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Ban Type</Text>
            <View style={styles.banTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.banTypeButton,
                  banType === 'permanent' && styles.banTypeButtonActive
                ]}
                onPress={() => setBanType('permanent')}
              >
                <Text style={[
                  styles.banTypeButtonText,
                  banType === 'permanent' && styles.banTypeButtonTextActive
                ]}>
                  Permanent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.banTypeButton,
                  banType === 'temporary' && styles.banTypeButtonActive
                ]}
                onPress={() => setBanType('temporary')}
              >
                <Text style={[
                  styles.banTypeButtonText,
                  banType === 'temporary' && styles.banTypeButtonTextActive
                ]}>
                  Temporary
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {banType === 'temporary' && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Expiry Date</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                value={banExpiryDate}
                onChangeText={setBanExpiryDate}
              />
            </View>
          )}
          
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Ban Reason *</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for banning this user..."
              value={banReason}
              onChangeText={setBanReason}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={onBanUser}
              disabled={banLoading}
            >
              {banLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Ban User</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  banTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  banTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  banTypeButtonActive: {
    backgroundColor: '#1e90ff',
    borderColor: '#1e90ff',
  },
  banTypeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  banTypeButtonTextActive: {
    color: 'white',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default BanModal;
