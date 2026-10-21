import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useChatStore } from './chat';

export const useDocumentStore = defineStore('documents', () => {
  const chatStore = useChatStore();

  const isVaultOpen = ref(false);
  const activeTab = ref('all'); // 'all', 'pdf', 'spreadsheet', 'image', 'archive'
  const searchQuery = ref('');
  const activePreviewFile = ref(null);

  /**
   * Recopilar todos los documentos de todos los canales en un índice plano
   */
  const allDocuments = computed(() => {
    const docs = [];
    const messagesObj = chatStore.messagesByChannel;

    for (const channelId in messagesObj) {
      const messages = messagesObj[channelId];
      const channel = chatStore.channels.find(c => c.id === channelId) || { name: channelId };

      for (const msg of messages) {
        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            docs.push({
              ...att,
              channelName: channel.name,
              channelId: channelId,
              uploaderName: msg.sender.name,
              uploaderAvatar: msg.sender.avatar,
              date: msg.created
            });
          }
        }
      }
    }

    // Ordenar de más reciente a más antiguo
    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  /**
   * Documentos filtrados por pestaña y búsqueda
   */
  const filteredDocuments = computed(() => {
    return allDocuments.value.filter(doc => {
      // Filtro por tipo/pestaña
      const matchesTab = activeTab.value === 'all' || doc.file_type === activeTab.value;

      // Filtro por texto de búsqueda
      const query = searchQuery.value.toLowerCase().trim();
      const matchesQuery = !query || 
        doc.filename.toLowerCase().includes(query) ||
        doc.uploaderName.toLowerCase().includes(query) ||
        doc.channelName.toLowerCase().includes(query);

      return matchesTab && matchesQuery;
    });
  });

  /**
   * Estadísticas de la bóveda
   */
  const documentStats = computed(() => {
    const totalCount = allDocuments.value.length;
    const pdfCount = allDocuments.value.filter(d => d.file_type === 'pdf').length;
    const sheetCount = allDocuments.value.filter(d => d.file_type === 'spreadsheet').length;
    const imageCount = allDocuments.value.filter(d => d.file_type === 'image').length;
    const totalBytes = allDocuments.value.reduce((acc, d) => acc + (d.size || 0), 0);

    return {
      totalCount,
      pdfCount,
      sheetCount,
      imageCount,
      totalBytes
    };
  });

  function toggleVault() {
    isVaultOpen.value = !isVaultOpen.value;
  }

  function openVault(tab = 'all') {
    activeTab.value = tab;
    isVaultOpen.value = true;
  }

  function closeVault() {
    isVaultOpen.value = false;
  }

  function setPreviewFile(file) {
    activePreviewFile.value = file;
  }

  function closePreview() {
    activePreviewFile.value = null;
  }

  return {
    isVaultOpen,
    activeTab,
    searchQuery,
    activePreviewFile,
    allDocuments,
    filteredDocuments,
    documentStats,
    toggleVault,
    openVault,
    closeVault,
    setPreviewFile,
    closePreview
  };
});
