import React, { useState } from 'react';
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
import { useGroup } from '../../contexts/GroupContext';
import { useResources, ResourceWithSharing, ResourceFolderWithSharing } from '../../hooks/useResources';
import ResourceCommentsModal from '../../components/ResourceCommentsModal';
import ShareResourceModal from '../../components/ShareResourceModal';

const TYPE_ICONS: Record<string, string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  other: '📎',
  folder: '📁',
};

type ListItem =
  | { type: 'folder'; data: ResourceFolderWithSharing }
  | { type: 'resource'; data: ResourceWithSharing };

export default function ResourcesScreen() {
  const { currentGroup, canApproveRequests } = useGroup();

  // Use the useResources hook for all data and operations
  const {
    folders,
    resources,
    currentFolderId,
    folderPath,
    loading,
    uploading,
    openFolder,
    goBack,
    goToRoot,
    createFolder: createFolderAction,
    uploadFileResource,
    createLinkResource,
    deleteFolder: deleteFolderAction,
    deleteResource: deleteResourceAction,
    getResourceUrl,
    shareResource,
    unshareResource,
    shareFolder,
    unshareFolder,
    getResourceShares,
    getFolderShares,
    getShareableGroups,
  } = useResources();

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceType, setNewResourceType] = useState<'link' | 'document'>('link');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // Comments modal
  const [commentsModal, setCommentsModal] = useState<{
    visible: boolean;
    resourceId?: string;
    folderId?: string;
    title: string;
  }>({ visible: false, title: '' });

  // Share modal
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    resourceId?: string;
    folderId?: string;
    title: string;
  }>({ visible: false, title: '' });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const success = await createFolderAction(newFolderName.trim());
    if (success) {
      setNewFolderName('');
      setShowFolderModal(false);
    } else {
      Alert.alert('Error', 'Failed to create folder');
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

  const handleUploadResource = async () => {
    if (newResourceType === 'link') {
      if (!newResourceUrl.trim()) {
        Alert.alert('Error', 'Please enter a URL');
        return;
      }
      if (!newResourceTitle.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }

      const success = await createLinkResource(newResourceTitle.trim(), newResourceUrl.trim());
      if (success) {
        resetAddForm();
      } else {
        Alert.alert('Error', 'Failed to create link');
      }
    } else {
      if (!selectedFile) {
        Alert.alert('Error', 'Please select a file');
        return;
      }
      if (!newResourceTitle.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }

      const success = await uploadFileResource(
        {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
          size: selectedFile.size,
        },
        newResourceTitle.trim()
      );

      if (success) {
        resetAddForm();
      } else {
        Alert.alert('Error', 'Failed to upload file');
      }
    }
  };

  const resetAddForm = () => {
    setNewResourceTitle('');
    setNewResourceUrl('');
    setSelectedFile(null);
    setShowAddModal(false);
  };

  const openResource = async (resource: ResourceWithSharing) => {
    if (resource.type === 'link' && resource.url) {
      Linking.openURL(resource.url);
    } else if (resource.file_path) {
      const url = await getResourceUrl(resource.file_path);
      if (url) {
        Linking.openURL(url);
      }
    }
  };

  const getListItems = (): ListItem[] => {
    const items: ListItem[] = [];
    folders.forEach(f => items.push({ type: 'folder', data: f }));
    resources.forEach(r => items.push({ type: 'resource', data: r }));
    return items;
  };

  const confirmDeleteFolder = (folder: ResourceFolderWithSharing) => {
    const performDelete = async () => {
      const success = await deleteFolderAction(folder.id);
      if (!success) {
        Alert.alert('Error', 'Failed to delete folder');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${folder.name}"? This will also delete all contents inside.`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Folder',
        `Are you sure you want to delete "${folder.name}"? This will also delete all contents inside.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const confirmDeleteResource = (resource: ResourceWithSharing) => {
    const performDelete = async () => {
      const success = await deleteResourceAction(resource.id, resource.file_path);
      if (!success) {
        Alert.alert('Error', 'Failed to delete resource');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${resource.title}"?`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Resource',
        `Are you sure you want to delete "${resource.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openShareModal = (item: { resourceId?: string; folderId?: string; title: string }) => {
    setShareModal({
      visible: true,
      ...item,
    });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'folder') {
      const folder = item.data;
      const isOwnItem = folder.group_id === currentGroup?.id;
      const canShare = canApproveRequests && isOwnItem && !folder.isShared;

      return (
        <View style={styles.itemCard}>
          <TouchableOpacity
            style={styles.itemContent}
            onPress={() => openFolder(folder)}
            onLongPress={canApproveRequests && isOwnItem ? () => confirmDeleteFolder(folder) : undefined}
            delayLongPress={500}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📁</Text>
            </View>
            <View style={styles.itemInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.itemTitle}>{folder.name}</Text>
                {folder.shareCount && folder.shareCount > 0 && (
                  <View style={styles.shareCountBadge}>
                    <Text style={styles.shareCountText}>Shared</Text>
                  </View>
                )}
              </View>
              {folder.isShared && folder.sourceGroupName ? (
                <Text style={styles.sharedFromText}>
                  Shared from {folder.sourceGroupName}
                </Text>
              ) : (
                <Text style={styles.itemMeta}>Folder</Text>
              )}
            </View>
            {!canApproveRequests && !folder.isShared && <Text style={styles.chevron}>→</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.commentButton}
            onPress={() => setCommentsModal({
              visible: true,
              folderId: folder.id,
              title: folder.name,
            })}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.commentButtonText}>💬</Text>
          </TouchableOpacity>
          {canShare && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => openShareModal({ folderId: folder.id, title: folder.name })}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.shareButtonText}>↗</Text>
            </TouchableOpacity>
          )}
          {canApproveRequests && isOwnItem && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => confirmDeleteFolder(folder)}
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
    const isOwnItem = resource.group_id === currentGroup?.id;
    const canShare = canApproveRequests && isOwnItem && !resource.isShared;

    return (
      <View style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => openResource(resource)}
          onLongPress={canApproveRequests && isOwnItem ? () => confirmDeleteResource(resource) : undefined}
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
              {resource.shareCount && resource.shareCount > 0 && (
                <View style={styles.shareCountBadge}>
                  <Text style={styles.shareCountText}>Shared</Text>
                </View>
              )}
            </View>
            {resource.isShared && resource.sourceGroupName ? (
              <Text style={styles.sharedFromText}>
                Shared from {resource.sourceGroupName}
              </Text>
            ) : (
              <Text style={styles.itemMeta}>
                {resource.type === 'document' && resource.file_size
                  ? formatFileSize(resource.file_size)
                  : resource.type}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.commentButton}
          onPress={() => setCommentsModal({
            visible: true,
            resourceId: resource.id,
            title: resource.title,
          })}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.commentButtonText}>💬</Text>
        </TouchableOpacity>
        {canShare && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => openShareModal({ resourceId: resource.id, title: resource.title })}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.shareButtonText}>↗</Text>
          </TouchableOpacity>
        )}
        {canApproveRequests && isOwnItem && (
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

  // Handle breadcrumb click to navigate to specific folder in path
  const navigateToPathFolder = (folder: ResourceFolderWithSharing, index: number) => {
    const stepsBack = folderPath.length - index - 1;
    for (let i = 0; i < stepsBack; i++) {
      goBack();
    }
  };

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
          <Text style={styles.groupName}>{currentGroup?.name}</Text>
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
                <TouchableOpacity onPress={() => navigateToPathFolder(folder as ResourceFolderWithSharing, index)}>
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

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateFolder}>
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
              <TouchableOpacity onPress={resetAddForm}>
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
              onPress={handleUploadResource}
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

      {/* Comments Modal */}
      <ResourceCommentsModal
        visible={commentsModal.visible}
        onClose={() => setCommentsModal({ visible: false, title: '' })}
        resourceId={commentsModal.resourceId}
        folderId={commentsModal.folderId}
        title={commentsModal.title}
      />

      {/* Share Modal */}
      <ShareResourceModal
        visible={shareModal.visible}
        onClose={() => setShareModal({ visible: false, title: '' })}
        resourceId={shareModal.resourceId}
        folderId={shareModal.folderId}
        title={shareModal.title}
        getShareableGroups={getShareableGroups}
        getShares={shareModal.resourceId ? getResourceShares : getFolderShares}
        onShare={shareModal.resourceId ? shareResource : shareFolder}
        onUnshare={shareModal.resourceId ? unshareResource : unshareFolder}
      />
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
  groupName: {
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
  sharedFromText: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  shareCountBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shareCountText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    color: '#64748B',
    fontSize: 16,
  },
  commentButton: {
    padding: 14,
    paddingLeft: 8,
  },
  commentButtonText: {
    fontSize: 16,
  },
  shareButton: {
    padding: 14,
    paddingLeft: 8,
  },
  shareButtonText: {
    fontSize: 18,
    color: '#3B82F6',
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
