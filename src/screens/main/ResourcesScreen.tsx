import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useParish } from '../../contexts/ParishContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { storage, RESOURCES_BUCKET, generateFilePath } from '../../lib/storage';
import { Resource, ResourceFolder } from '../../types/database';

const TYPE_ICONS: Record<string, string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  other: '📎',
  folder: '📁',
};

type ListItem = 
  | { type: 'folder'; data: ResourceFolder }
  | { type: 'resource'; data: Resource };

export default function ResourcesScreen() {
  const { currentParish, canApproveRequests } = useParish();
  const { user } = useAuth();
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceType, setNewResourceType] = useState<'link' | 'document'>('link');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    if (currentParish) {
      fetchContents();
    } else {
      setLoading(false);
    }
  }, [currentParish?.id, currentFolderId]);

  const fetchContents = async () => {
    if (!currentParish) return;
    setLoading(true);

    try {
      // Fetch folders - use .is() for null, .eq() for UUID
      let folderQuery = supabase
        .from('resource_folders')
        .select('*')
        .eq('parish_id', currentParish.id);
      
      if (currentFolderId === null) {
        folderQuery = folderQuery.is('parent_id', null);
      } else {
        folderQuery = folderQuery.eq('parent_id', currentFolderId);
      }
      
      const { data: folderData, error: folderError } = await folderQuery.order('name');

      if (folderError) throw folderError;
      setFolders(folderData || []);

      // Fetch resources - same logic
      let resourceQuery = supabase
        .from('resources')
        .select('*')
        .eq('parish_id', currentParish.id);
      
      if (currentFolderId === null) {
        resourceQuery = resourceQuery.is('folder_id', null);
      } else {
        resourceQuery = resourceQuery.eq('folder_id', currentFolderId);
      }
      
      const { data: resourceData, error: resourceError } = await resourceQuery.order('created_at', { ascending: false });

      if (resourceError) throw resourceError;
      setResources(resourceData || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (folder: ResourceFolder) => {
    setFolderPath([...folderPath, folder]);
    setCurrentFolderId(folder.id);
  };

  const goBack = () => {
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  const goToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !currentParish || !user) return;

    try {
      const { error } = await supabase.from('resource_folders').insert({
        name: newFolderName.trim(),
        parish_id: currentParish.id,
        parent_id: currentFolderId,
        created_by: user.id,
      });

      if (error) throw error;
      
      setNewFolderName('');
      setShowFolderModal(false);
      fetchContents();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setNewResourceTitle(result.assets[0].name.replace(/\.[^/.]+$/, ''));
        setNewResourceType('document');
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  const uploadResource = async () => {
    if (!currentParish || !user) return;
    
    if (newResourceType === 'link' && !newResourceUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    
    if (newResourceType === 'document' && !selectedFile) {
      Alert.alert('Error', 'Please select a file');
      return;
    }

    if (!newResourceTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setUploading(true);

    try {
      let filePath = null;
      let fileSize = null;
      let mimeType = null;

      // Upload file if document type
      if (newResourceType === 'document' && selectedFile) {
        const storagePath = generateFilePath(currentParish.id, selectedFile.name);
        
        // Use storage abstraction - handles web/native differences
        const uploadResult = await storage.upload(
          RESOURCES_BUCKET,
          storagePath,
          {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.mimeType || 'application/octet-stream',
          },
          { contentType: selectedFile.mimeType || 'application/octet-stream' }
        );

        if (uploadResult.error) throw uploadResult.error;

        filePath = storagePath;
        fileSize = selectedFile.size;
        mimeType = selectedFile.mimeType;
      }

      // Create resource record
      const { error } = await supabase.from('resources').insert({
        title: newResourceTitle.trim(),
        type: newResourceType === 'link' ? 'link' : 'document',
        url: newResourceType === 'link' ? newResourceUrl.trim() : null,
        parish_id: currentParish.id,
        folder_id: currentFolderId,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        visibility: 'all',
        shared_by: user.id,
        tags: [],
      });

      if (error) throw error;

      // Reset form
      setNewResourceTitle('');
      setNewResourceUrl('');
      setSelectedFile(null);
      setShowAddModal(false);
      fetchContents();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const openResource = async (resource: Resource) => {
    if (resource.type === 'link' && resource.url) {
      Linking.openURL(resource.url);
    } else if (resource.file_path) {
      try {
        const result = await storage.getDownloadUrl(
          RESOURCES_BUCKET,
          resource.file_path,
          3600
        );
        
        if (result.url) {
          Linking.openURL(result.url);
        } else if (result.error) {
          console.error('Error getting file URL:', result.error);
        }
      } catch (error) {
        console.error('Error getting file URL:', error);
      }
    }
  };

  const getListItems = (): ListItem[] => {
    const items: ListItem[] = [];
    folders.forEach(f => items.push({ type: 'folder', data: f }));
    resources.forEach(r => items.push({ type: 'resource', data: r }));
    return items;
  };

  const confirmDeleteFolder = (folder: ResourceFolder) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${folder.name}"? This will also delete all contents inside.`
      );
      if (confirmed) {
        deleteFolder(folder);
      }
    } else {
      Alert.alert(
        'Delete Folder',
        `Are you sure you want to delete "${folder.name}"? This will also delete all contents inside.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteFolder(folder) },
        ]
      );
    }
  };

  const deleteFolder = async (folder: ResourceFolder) => {
    try {
      const { error } = await supabase
        .from('resource_folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;
      fetchContents();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const confirmDeleteResource = (resource: Resource) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${resource.title}"?`
      );
      if (confirmed) {
        deleteResource(resource);
      }
    } else {
      Alert.alert(
        'Delete Resource',
        `Are you sure you want to delete "${resource.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteResource(resource) },
        ]
      );
    }
  };

  const deleteResource = async (resource: Resource) => {
    try {
      // Delete file from storage if exists
      if (resource.file_path) {
        const result = await storage.delete(RESOURCES_BUCKET, resource.file_path);
        if (result.error) {
          console.warn('Error deleting file from storage:', result.error);
          // Continue anyway - file might already be deleted
        }
      }

      // Delete database record
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id);

      if (error) throw error;
      fetchContents();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'folder') {
      return (
        <View style={styles.itemCard}>
          <TouchableOpacity 
            style={styles.itemContent}
            onPress={() => openFolder(item.data)}
            onLongPress={canApproveRequests ? () => confirmDeleteFolder(item.data) : undefined}
            delayLongPress={500}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📁</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.data.name}</Text>
              <Text style={styles.itemMeta}>Folder</Text>
            </View>
            {!canApproveRequests && <Text style={styles.chevron}>→</Text>}
          </TouchableOpacity>
          {canApproveRequests && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => confirmDeleteFolder(item.data)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const resource = item.data;
    return (
      <View style={styles.itemCard}>
        <TouchableOpacity 
          style={styles.itemContent}
          onPress={() => openResource(resource)}
          onLongPress={canApproveRequests ? () => confirmDeleteResource(resource) : undefined}
          delayLongPress={500}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{TYPE_ICONS[resource.type] || TYPE_ICONS.other}</Text>
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>{resource.title}</Text>
              {resource.visibility === 'leaders_only' && (
                <View style={styles.leaderBadge}>
                  <Text style={styles.leaderBadgeText}>Leaders</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemMeta}>
              {resource.type === 'document' && resource.file_size 
                ? formatFileSize(resource.file_size)
                : resource.type}
            </Text>
          </View>
        </TouchableOpacity>
        {canApproveRequests && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmDeleteResource(resource)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>
        {currentFolderId ? 'This folder is empty' : 'No resources yet'}
      </Text>
      <Text style={styles.emptyText}>
        {canApproveRequests 
          ? 'Add resources or create folders to organize content.'
          : 'Resources shared with you will appear here.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Resources</Text>
          <Text style={styles.parishName}>{currentParish?.name}</Text>
        </View>
        {canApproveRequests && (
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.folderButton}
              onPress={() => setShowFolderModal(true)}
            >
              <Text style={styles.folderButtonText}>📁</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={goToRoot}>
            <Text style={styles.breadcrumbLink}>Resources</Text>
          </TouchableOpacity>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <Text style={styles.breadcrumbSep}> / </Text>
              {index === folderPath.length - 1 ? (
                <Text style={styles.breadcrumbCurrent}>{folder.name}</Text>
              ) : (
                <TouchableOpacity onPress={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolderId(folder.id);
                }}>
                  <Text style={styles.breadcrumbLink}>{folder.name}</Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      <FlatList
        data={getListItems()}
        renderItem={renderItem}
        keyExtractor={(item) => item.type === 'folder' ? `f-${item.data.id}` : `r-${item.data.id}`}
        contentContainerStyle={getListItems().length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Create Folder Modal */}
      <Modal visible={showFolderModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Folder</Text>
              <TouchableOpacity onPress={() => setShowFolderModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Folder name"
              placeholderTextColor="#64748B"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />

            <TouchableOpacity style={styles.submitButton} onPress={createFolder}>
              <Text style={styles.submitButtonText}>Create Folder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Resource Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Resource</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setSelectedFile(null);
                setNewResourceTitle('');
                setNewResourceUrl('');
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity 
                style={[styles.typeOption, newResourceType === 'link' && styles.typeOptionActive]}
                onPress={() => setNewResourceType('link')}
              >
                <Text style={styles.typeOptionText}>🔗 Link</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeOption, newResourceType === 'document' && styles.typeOptionActive]}
                onPress={() => setNewResourceType('document')}
              >
                <Text style={styles.typeOptionText}>📄 File</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor="#64748B"
              value={newResourceTitle}
              onChangeText={setNewResourceTitle}
            />

            {newResourceType === 'link' ? (
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor="#64748B"
                value={newResourceUrl}
                onChangeText={setNewResourceUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            ) : (
              <TouchableOpacity style={styles.filePickerButton} onPress={pickFile}>
                {selectedFile ? (
                  <View style={styles.selectedFile}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.selectedFileSize}>
                      {formatFileSize(selectedFile.size || 0)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.filePickerText}>Choose File</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.submitButton, uploading && styles.submitButtonDisabled]} 
              onPress={uploadResource}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Resource</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  parishName: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  folderButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  folderButtonText: {
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  breadcrumbLink: {
    color: '#3B82F6',
    fontSize: 14,
  },
  breadcrumbSep: {
    color: '#64748B',
    fontSize: 14,
  },
  breadcrumbCurrent: {
    color: '#94A3B8',
    fontSize: 14,
  },
  list: {
    padding: 20,
    gap: 8,
  },
  emptyList: {
    flex: 1,
    padding: 20,
  },
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  chevron: {
    color: '#64748B',
    fontSize: 16,
  },
  deleteButton: {
    padding: 14,
    paddingLeft: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    opacity: 0.7,
  },
  leaderBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leaderBadgeText: {
    color: '#E9D5FF',
    fontSize: 9,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    fontSize: 20,
    color: '#94A3B8',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  filePickerButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    marginBottom: 12,
    alignItems: 'center',
  },
  filePickerText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedFile: {
    alignItems: 'center',
  },
  selectedFileName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFileSize: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
