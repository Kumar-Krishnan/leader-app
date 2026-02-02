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
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useGroup } from '../../contexts/GroupContext';
import { useResources, ResourceWithSharing, ResourceFolderWithSharing } from '../../hooks/useResources';
import ResourceCommentsModal from '../../components/ResourceCommentsModal';
import ShareResourceModal from '../../components/ShareResourceModal';
import ScreenHeader from '../../components/ScreenHeader';
import { showAlert, showDestructiveConfirm } from '../../lib/errors';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';

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

export default function LeaderResourcesScreen() {
  const { currentGroup, canApproveRequests } = useGroup();

  // Use the useResources hook with leaders_only visibility filter
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
  } = useResources({ visibility: 'leaders_only' });

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
      showAlert('Error', 'Failed to create folder');
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
        showAlert('Error', 'Please enter a URL');
        return;
      }
      if (!newResourceTitle.trim()) {
        showAlert('Error', 'Please enter a title');
        return;
      }

      const success = await createLinkResource(newResourceTitle.trim(), newResourceUrl.trim());
      if (success) {
        resetAddForm();
      } else {
        showAlert('Error', 'Failed to create link');
      }
    } else {
      if (!selectedFile) {
        showAlert('Error', 'Please select a file');
        return;
      }
      if (!newResourceTitle.trim()) {
        showAlert('Error', 'Please enter a title');
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
        showAlert('Error', 'Failed to upload file');
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

  const confirmDeleteFolder = async (folder: ResourceFolderWithSharing) => {
    const confirmed = await showDestructiveConfirm(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This will also delete all contents inside.`,
      'Delete'
    );

    if (confirmed) {
      const success = await deleteFolderAction(folder.id);
      if (!success) {
        showAlert('Error', 'Failed to delete folder');
      }
    }
  };

  const confirmDeleteResource = async (resource: ResourceWithSharing) => {
    const confirmed = await showDestructiveConfirm(
      'Delete Resource',
      `Are you sure you want to delete "${resource.title}"?`,
      'Delete'
    );

    if (confirmed) {
      const success = await deleteResourceAction(resource.id, resource.file_path);
      if (!success) {
        showAlert('Error', 'Failed to delete resource');
      }
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
      <Text style={styles.emptyIcon}>⭐</Text>
      <Text style={styles.emptyTitle}>
        {currentFolderId ? 'This folder is empty' : 'No leader resources yet'}
      </Text>
      <Text style={styles.emptyText}>
        {canApproveRequests
          ? 'Share resources exclusively with other leaders. Add files, links, or create folders to organize content.'
          : 'Leader resources shared with you will appear here.'}
      </Text>
      {canApproveRequests && !currentFolderId && (
        <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.emptyButtonText}>Add Resource</Text>
        </TouchableOpacity>
      )}
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
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Leader Hub"
        subtitle="Resources for leaders only"
        showGroupName={false}
        rightContent={canApproveRequests ? (
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
        ) : undefined}
      />

      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={goToRoot}>
            <Text style={styles.breadcrumbLink}>Leader Hub</Text>
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
              <Text style={styles.modalTitle}>Add Leader Resource</Text>
              <TouchableOpacity onPress={resetAddForm}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.leaderNotice}>
              <Text style={styles.leaderNoticeText}>
                ⭐ This resource will only be visible to leaders
              </Text>
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
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  folderButton: {
    backgroundColor: colors.neutral[700],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  folderButtonText: {
    fontSize: fontSize.lg,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  addButtonText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.semibold,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexWrap: 'wrap',
  },
  breadcrumbLink: {
    color: colors.primary[500],
    fontSize: fontSize.md,
  },
  breadcrumbSep: {
    color: colors.text.tertiary,
    fontSize: fontSize.md,
  },
  breadcrumbCurrent: {
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyList: {
    flex: 1,
    padding: spacing.xl,
  },
  itemCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    ...shadows.sm,
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
    backgroundColor: colors.neutral[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  itemMeta: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  sharedFromText: {
    fontSize: fontSize.sm,
    color: colors.primary[500],
    marginTop: 2,
  },
  shareCountBadge: {
    backgroundColor: colors.accent.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shareCountText: {
    color: colors.primary[500],
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  chevron: {
    color: colors.text.tertiary,
    fontSize: fontSize.lg,
  },
  commentButton: {
    padding: 14,
    paddingLeft: spacing.sm,
  },
  commentButtonText: {
    fontSize: fontSize.lg,
  },
  shareButton: {
    padding: 14,
    paddingLeft: spacing.sm,
  },
  shareButtonText: {
    fontSize: fontSize.xl,
    color: colors.primary[500],
  },
  deleteButton: {
    padding: 14,
    paddingLeft: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.xl,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  closeButton: {
    fontSize: fontSize.xxl,
    color: colors.text.secondary,
  },
  leaderNotice: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leaderNoticeText: {
    color: colors.primary[200],
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    borderColor: colors.primary[500],
  },
  typeOptionText: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  filePickerButton: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  filePickerText: {
    color: colors.primary[500],
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  selectedFile: {
    alignItems: 'center',
  },
  selectedFileName: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  selectedFileSize: {
    color: colors.text.tertiary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
