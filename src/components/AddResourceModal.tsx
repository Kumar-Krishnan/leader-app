import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useParish } from '../contexts/ParishContext';

interface Props {
  visible: boolean;
  folderId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

type ResourceType = 'document' | 'link' | 'video' | 'other';

export default function AddResourceModal({ visible, folderId, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { currentParish, isParishLeader } = useParish();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('document');
  const [url, setUrl] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'leaders_only'>('all');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
        }
        
        // Auto-detect type
        if (file.mimeType?.startsWith('video/')) {
          setType('video');
        } else if (file.mimeType?.includes('pdf') || file.mimeType?.includes('document')) {
          setType('document');
        }
      }
    } catch (err) {
      console.error('Error picking file:', err);
      setError('Failed to pick file');
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile || !user || !currentParish) return null;

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${currentParish.id}/${Date.now()}.${fileExt}`;

      // Read file as blob
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, blob, {
          contentType: selectedFile.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return fileName;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (type === 'link' && !url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!user || !currentParish) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let filePath: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        setUploadProgress(50);
        filePath = await uploadFile();
        setUploadProgress(100);
      }

      // Create resource record
      const { error: insertError } = await supabase.from('resources').insert({
        title: title.trim(),
        type,
        url: type === 'link' ? url.trim() : null,
        visibility,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        parish_id: currentParish.id,
        folder_id: folderId,
        file_path: filePath,
        file_size: selectedFile?.size || null,
        mime_type: selectedFile?.mimeType || null,
        shared_by: user.id,
      });

      if (insertError) throw insertError;

      // Reset form
      setTitle('');
      setType('document');
      setUrl('');
      setVisibility('all');
      setTags('');
      setSelectedFile(null);
      setUploadProgress(0);
      
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creating resource:', err);
      setError(err.message || 'Failed to create resource');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setType('document');
    setUrl('');
    setVisibility('all');
    setTags('');
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Resource</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Type Selection */}
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {(['document', 'link', 'video', 'other'] as ResourceType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeButton, type === t && styles.typeButtonActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                    {t === 'document' ? '📄' : t === 'link' ? '🔗' : t === 'video' ? '🎬' : '📎'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* File Upload */}
            {type !== 'link' && (
              <>
                <Text style={styles.label}>File</Text>
                <TouchableOpacity style={styles.fileButton} onPress={pickFile}>
                  {selectedFile ? (
                    <View style={styles.selectedFile}>
                      <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                      <Text style={styles.fileSize}>{formatFileSize(selectedFile.size || 0)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.fileButtonText}>Choose File</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* URL for links */}
            {type === 'link' && (
              <>
                <Text style={styles.label}>URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#64748B"
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            )}

            {/* Title */}
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Resource title"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            {/* Tags */}
            <Text style={styles.label}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="bible study, prayer, etc"
              placeholderTextColor="#64748B"
              value={tags}
              onChangeText={setTags}
            />

            {/* Visibility */}
            {isParishLeader && (
              <>
                <Text style={styles.label}>Visibility</Text>
                <View style={styles.visibilityRow}>
                  <TouchableOpacity
                    style={[styles.visibilityButton, visibility === 'all' && styles.visibilityButtonActive]}
                    onPress={() => setVisibility('all')}
                  >
                    <Text style={[styles.visibilityText, visibility === 'all' && styles.visibilityTextActive]}>
                      Everyone
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.visibilityButton, visibility === 'leaders_only' && styles.visibilityButtonActive]}
                    onPress={() => setVisibility('leaders_only')}
                  >
                    <Text style={[styles.visibilityText, visibility === 'leaders_only' && styles.visibilityTextActive]}>
                      Leaders Only
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Progress bar */}
            {loading && uploadProgress > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Add Resource</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  errorContainer: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  typeButtonText: {
    fontSize: 24,
  },
  typeButtonTextActive: {},
  fileButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  fileButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedFile: {
    alignItems: 'center',
  },
  fileName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilityButtonActive: {
    borderColor: '#3B82F6',
  },
  visibilityText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityTextActive: {
    color: '#3B82F6',
  },
  progressContainer: {
    marginTop: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#3B82F6',
  },
  progressText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    padding: 8,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

