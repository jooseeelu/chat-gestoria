import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { pb, mapUser, initialsAvatar, fileToken, protectedFileUrl } from '@/api/pocketbase';
import { useAuthStore } from './auth';
import { detectFileType } from '@/utils/fileIcons';
import { playChimeSound } from '@/utils/formatters';

const PAGE_SIZE = 200;
const MESSAGE_EXPAND = 'sender,reply_to,reply_to.sender';
const STORAGE_KEY_CHANNEL = 'emadrid_active_channel';

/*
 * PocketBase es la única fuente de verdad. En memoria solo viven los mensajes
 * que aún se están enviando (status 'sending' / 'uploading') o que fallaron ('failed').
 */
export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore();

  const channels = ref([]);
  const activeChannelId = ref(localStorage.getItem(STORAGE_KEY_CHANNEL) || '');
  const messagesByChannel = ref({});

  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const isTyping = ref(false);
  const typingUser = ref('');

  const replyingTo = ref(null);
  const inChatSearch = ref('');
  const isSearchOpen = ref(false);
  const soundEnabled = ref(localStorage.getItem('emadrid_sound') !== 'false');

  const activeChannel = computed(() => {
    return channels.value.find(c => c.id === activeChannelId.value) || channels.value[0];
  });

  const rawMessages = computed(() => {
    return messagesByChannel.value[activeChannelId.value] || [];
  });

  // Mensajes filtrados por búsqueda dentro del canal
  const currentMessages = computed(() => {
    const list = rawMessages.value;
    const query = inChatSearch.value.toLowerCase().trim();
    if (!query) return list;

    return list.filter(m => {
      const matchText = m.content?.toLowerCase().includes(query);
      const matchSender = m.sender?.name?.toLowerCase().includes(query);
      const matchFile = m.attachments?.some(a => a.filename?.toLowerCase().includes(query));
      return matchText || matchSender || matchFile;
    });
  });

  // ---------- No leídos (título de la pestaña y globo del icono de la app) ----------

  const BASE_TITLE = document.title;
  const totalUnread = computed(() => channels.value.reduce((acc, c) => acc + (c.unread_count || 0), 0));

  function incrementUnread(channelId) {
    const channel = channels.value.find(c => c.id === channelId);
    if (channel) channel.unread_count = (channel.unread_count || 0) + 1;
  }

  function resetUnread(channelId) {
    const channel = channels.value.find(c => c.id === channelId);
    if (channel) channel.unread_count = 0;
  }

  watch(totalUnread, (total) => {
    document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
    try {
      if (total > 0) navigator.setAppBadge?.(total);
      else navigator.clearAppBadge?.();
    } catch (_) {}
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resetUnread(activeChannelId.value);
      try { navigator.clearAppBadge?.(); } catch (_) {}
    }
  });

  function myId() {
    return pb.authStore.model?.id || authStore.currentUser?.id;
  }

  function listFor(channelId) {
    if (!messagesByChannel.value[channelId]) {
      messagesByChannel.value[channelId] = [];
    }
    return messagesByChannel.value[channelId];
  }

  // ---------- Mapeo de registros de PocketBase al formato de la UI ----------

  function resolveSender(senderId, expandSender) {
    if (expandSender) return mapUser(expandSender);
    const member = authStore.teamMembers.find(u => u.id === senderId);
    if (member) return member;
    return { id: senderId, name: 'Usuario', role: 'member', avatar: initialsAvatar('?') };
  }

  function mapAttachment(att) {
    const fileRef = { id: att.id, collectionId: att.collectionId, collectionName: att.collectionName, file: att.file };
    return {
      id: att.id,
      message: att.message,
      filename: att.filename,
      file_type: att.file_type || detectFileType(att.filename, att.mime_type),
      size: att.size,
      fileRef,
      url: protectedFileUrl(fileRef)
    };
  }

  // Al renovarse el token de archivos, regenerar los enlaces de todos los adjuntos cargados
  watch(fileToken, () => {
    for (const list of Object.values(messagesByChannel.value)) {
      for (const msg of list) {
        for (const att of msg.attachments || []) {
          if (att.fileRef) att.url = protectedFileUrl(att.fileRef);
        }
      }
    }
  });

  function mapReply(record) {
    const parent = record.expand?.reply_to;
    if (!parent) return null;
    const parentSender = resolveSender(parent.sender, parent.expand?.sender);
    return {
      id: parent.id,
      senderName: parentSender.name,
      snippet: parent.content
        ? (parent.content.length > 80 ? parent.content.slice(0, 80) + '…' : parent.content)
        : 'Archivo adjunto'
    };
  }

  function mapMessage(record, attachments = []) {
    return {
      id: record.id,
      channel: record.channel,
      sender: resolveSender(record.sender, record.expand?.sender),
      content: record.content,
      type: record.type || (attachments.length > 0 ? 'file' : 'text'),
      created: record.created,
      attachments,
      reactions: record.reactions || {},
      reply_to: mapReply(record)
    };
  }

  // ---------- Carga ----------

  async function fetchChannels() {
    try {
      const records = await pb.collection('channels').getFullList({ sort: 'created' });
      channels.value = records.map(r => ({
        id: r.id,
        name: r.name,
        department: r.department || r.name,
        description: r.description || '',
        icon: r.icon || 'Hash',
        unread_count: 0
      }));

      if (records.length > 0 && !records.some(r => r.id === activeChannelId.value)) {
        const itChannel = records.find(r => /\bit\b|sistemas/i.test(r.name));
        activeChannelId.value = itChannel ? itChannel.id : records[0].id;
      }
    } catch (e) {
      console.warn('Error cargando canales:', e.message);
    }
    if (activeChannelId.value) {
      await fetchMessages(activeChannelId.value);
    }
  }

  let lastFetchAt = 0;

  async function fetchMessages(channelId = activeChannelId.value) {
    if (!channelId) return;
    lastFetchAt = Date.now();
    try {
      // Los ÚLTIMOS mensajes (orden descendente) y luego se invierten
      const res = await pb.collection('messages').getList(1, PAGE_SIZE, {
        filter: pb.filter('channel = {:ch} && type != "system"', { ch: channelId }),
        sort: '-created',
        expand: MESSAGE_EXPAND
      });
      const items = res.items.reverse();

      const attMap = {};
      if (items.length > 0) {
        const atts = await pb.collection('attachments').getFullList({
          filter: pb.filter('channel = {:ch} && created >= {:from}', { ch: channelId, from: items[0].created }),
          sort: 'created'
        });
        for (const att of atts) {
          if (!att.message) continue;
          if (!attMap[att.message]) attMap[att.message] = [];
          attMap[att.message].push(mapAttachment(att));
        }
      }

      mergeServerMessages(channelId, items.map(r => mapMessage(r, attMap[r.id] || [])));
    } catch (e) {
      console.warn('Error cargando mensajes de PocketBase:', e.message);
    }
  }

  function mergeServerMessages(channelId, serverMsgs) {
    const local = messagesByChannel.value[channelId] || [];
    const serverIds = new Set(serverMsgs.map(m => m.id));

    const merged = serverMsgs.map(sm => {
      const lm = local.find(m => m.id === sm.id);
      if (!lm) return sm;
      // Mientras se suben sus archivos, conservar la vista local con las previsualizaciones
      if (lm.status === 'uploading') return lm;
      // Mantener visibles los adjuntos que no se pudieron subir
      const failed = (lm.attachments || []).filter(a => a.failed);
      if (failed.length) sm.attachments = [...sm.attachments, ...failed];
      return sm;
    });

    const pending = local.filter(m => m.status && !serverIds.has(m.id));
    messagesByChannel.value[channelId] = [...merged, ...pending];
  }

  function setActiveChannel(channelId) {
    activeChannelId.value = channelId;
    localStorage.setItem(STORAGE_KEY_CHANNEL, channelId);
    replyingTo.value = null;
    inChatSearch.value = '';
    isSearchOpen.value = false;
    isTyping.value = false;
    resetUnread(channelId);
    fetchMessages(channelId);
  }

  // Desde una notificación o un enlace ?channel=...
  function openChannel(channelId) {
    if (channelId && channels.value.some(c => c.id === channelId)) {
      setActiveChannel(channelId);
    }
  }

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
    localStorage.setItem('emadrid_sound', soundEnabled.value);
  }

  function setReply(message) {
    replyingTo.value = message;
  }

  function clearReply() {
    replyingTo.value = null;
  }

  // ---------- Envío ----------

  async function sendMessage(content, files = []) {
    if (!content.trim() && files.length === 0) return;

    const channelId = activeChannelId.value;
    const sender = authStore.currentUser;
    const tempId = 'tmp_' + Date.now();
    const reply = replyingTo.value;

    const list = listFor(channelId);
    list.push({
      id: tempId,
      channel: channelId,
      sender: { ...sender },
      content: content.trim(),
      type: files.length > 0 ? 'file' : 'text',
      created: new Date().toISOString(),
      // Previsualización local mientras sube (no se guarda en ningún sitio)
      attachments: files.map((file, i) => ({
        id: `${tempId}_${i}`,
        filename: file.name,
        file_type: detectFileType(file.name, file.type),
        size: file.size,
        url: URL.createObjectURL(file),
        pending: true
      })),
      reactions: {},
      reply_to: reply ? {
        id: reply.id,
        senderName: reply.sender.name,
        snippet: reply.content ? reply.content.slice(0, 80) : 'Archivo adjunto'
      } : null,
      status: 'sending'
    });
    // Trabajar sobre el proxy reactivo para que la UI se entere de los cambios
    const msg = list[list.length - 1];

    replyingTo.value = null;
    if (soundEnabled.value) playChimeSound('send');

    let record;
    try {
      record = await pb.collection('messages').create({
        channel: channelId,
        sender: myId(),
        content: content.trim(),
        type: msg.type,
        reactions: {},
        reply_to: reply && !reply.id.startsWith('tmp_') ? reply.id : ''
      });
    } catch (err) {
      console.warn('Error enviando mensaje a PocketBase:', err);
      msg.status = 'failed';
      return;
    }

    // Si el tiempo real o el polling ya lo trajeron, quedarse con la copia local
    const current = listFor(channelId);
    const dupIndex = current.findIndex(m => m.id === record.id && m !== msg);
    if (dupIndex > -1) current.splice(dupIndex, 1);
    msg.id = record.id;
    msg.created = record.created;

    if (files.length === 0) {
      msg.status = undefined;
      return;
    }

    msg.status = 'uploading';
    isUploading.value = true;
    uploadProgress.value = 10;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const local = msg.attachments[i];
      try {
        const formData = new FormData();
        formData.append('channel', channelId);
        formData.append('message', record.id);
        formData.append('uploader', myId());
        formData.append('file', file);
        formData.append('filename', file.name);
        formData.append('file_type', detectFileType(file.name, file.type));
        formData.append('size', file.size);
        formData.append('mime_type', file.type || 'application/octet-stream');

        const attRecord = await pb.collection('attachments').create(formData);
        URL.revokeObjectURL(local.url);
        msg.attachments[i] = mapAttachment(attRecord);
      } catch (attErr) {
        console.warn('Error subiendo archivo a PocketBase:', attErr);
        // El emisor tiene que saber que sus compañeros no lo van a recibir
        local.pending = false;
        local.failed = true;
      }
      uploadProgress.value = Math.round(((i + 1) / files.length) * 100);
    }

    msg.status = undefined;
    setTimeout(() => {
      isUploading.value = false;
      uploadProgress.value = 0;
    }, 400);
  }

  // ---------- Reacciones y borrado ----------

  async function toggleReaction(messageId, emoji) {
    const msg = rawMessages.value.find(m => m.id === messageId);
    const me = myId();
    if (!msg || !me || messageId.startsWith('tmp_')) return;

    const previous = msg.reactions || {};
    const next = JSON.parse(JSON.stringify(previous));
    const users = next[emoji] || [];
    next[emoji] = users.includes(me) ? users.filter(u => u !== me) : [...users, me];
    if (next[emoji].length === 0) delete next[emoji];

    msg.reactions = next;
    try {
      await pb.collection('messages').update(messageId, { reactions: next });
    } catch (e) {
      console.warn('Error guardando reacción:', e.message);
      msg.reactions = previous;
    }
  }

  function removeLocalMessage(channelId, messageId) {
    const list = messagesByChannel.value[channelId];
    if (!list) return;
    messagesByChannel.value[channelId] = list.filter(m => m.id !== messageId);
  }

  async function deleteMessage(messageId) {
    const channelId = activeChannelId.value;
    const msg = rawMessages.value.find(m => m.id === messageId);
    removeLocalMessage(channelId, messageId);
    if (messageId.startsWith('tmp_')) return;

    try {
      // Los adjuntos no se borran en cascada: eliminarlos primero
      for (const att of msg?.attachments || []) {
        if (att.id && !att.failed && !att.pending) {
          await pb.collection('attachments').delete(att.id).catch(() => {});
        }
      }
      await pb.collection('messages').delete(messageId);
    } catch (e) {
      console.warn('Error eliminando mensaje en PocketBase:', e.message);
      fetchMessages(channelId);
    }
  }

  // ---------- "Escribiendo..." ----------

  let lastTypingSent = 0;
  async function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSent < 2500 || !activeChannelId.value) return;
    lastTypingSent = now;
    try {
      await pb.send('/api/typing', { method: 'POST', body: { channel: activeChannelId.value } });
    } catch (_) {}
  }

  function clearMyTyping() {
    lastTypingSent = 0;
  }

  let typingTimer = null;
  function handleTypingEvent(data) {
    if (!data || data.userId === myId() || data.channel !== activeChannelId.value) return;
    typingUser.value = data.name || 'Compañero';
    isTyping.value = true;
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping.value = false;
    }, 3500);
  }

  // ---------- Tiempo real ----------

  function handleMessageEvent(e) {
    const record = e.record;
    const chId = record.channel;
    if (record.type === 'system') return;

    if (e.action === 'delete') {
      removeLocalMessage(chId, record.id);
      return;
    }

    const list = listFor(chId);
    const existing = list.find(m => m.id === record.id);

    if (e.action === 'update') {
      if (existing) {
        existing.content = record.content;
        existing.reactions = record.reactions || {};
      }
      return;
    }

    // create
    if (existing) return;
    // Mi propio mensaje: lo resuelve sendMessage cuando vuelve el create()
    if (record.sender === myId() && list.some(m => m.status === 'sending' && m.content === record.content)) return;

    list.push(mapMessage(record));
    if (record.sender === myId()) return;

    if (chId === activeChannelId.value) isTyping.value = false;
    if (chId !== activeChannelId.value || document.visibilityState !== 'visible') incrementUnread(chId);
    if (soundEnabled.value) playChimeSound('receive');
  }

  function handleAttachmentEvent(e) {
    const att = e.record;
    const list = messagesByChannel.value[att.channel];
    const msg = list?.find(m => m.id === att.message);
    if (!msg) return;

    if (e.action === 'delete') {
      msg.attachments = msg.attachments.filter(a => a.id !== att.id);
      return;
    }
    // Mis subidas en curso las gestiona sendMessage
    if (e.action !== 'create' || msg.status === 'uploading') return;
    if (!msg.attachments.some(a => a.id === att.id)) {
      msg.attachments.push(mapAttachment(att));
    }
  }

  let realtimeActive = false;
  async function subscribeRealtime() {
    if (realtimeActive) return;
    realtimeActive = true;
    try {
      await Promise.all([
        pb.collection('messages').subscribe('*', handleMessageEvent, { expand: MESSAGE_EXPAND }),
        pb.collection('attachments').subscribe('*', handleAttachmentEvent),
        pb.realtime.subscribe('typing', handleTypingEvent),
        // Tras una reconexión puede haberse perdido algo: recargar
        pb.realtime.subscribe('PB_CONNECT', () => fetchMessages(activeChannelId.value))
      ]);
    } catch (err) {
      realtimeActive = false;
      console.warn('Error en suscripción tiempo real PocketBase:', err.message);
    }
  }

  async function unsubscribeRealtime() {
    realtimeActive = false;
    try {
      await pb.realtime.unsubscribe();
    } catch (_) {}
  }

  // Red de seguridad: si el tiempo real cae, refrescar cada 3 s; si va bien, cada 30 s
  let pollingInterval = null;
  function startPolling() {
    stopPolling();
    pollingInterval = setInterval(() => {
      const interval = pb.realtime.isConnected ? 30000 : 3000;
      if (Date.now() - lastFetchAt >= interval) {
        fetchMessages(activeChannelId.value);
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  return {
    channels,
    activeChannelId,
    activeChannel,
    currentMessages,
    rawMessages,
    messagesByChannel,
    isUploading,
    uploadProgress,
    isTyping,
    typingUser,
    replyingTo,
    inChatSearch,
    isSearchOpen,
    soundEnabled,
    toggleSound,
    setReply,
    clearReply,
    toggleReaction,
    fetchChannels,
    fetchMessages,
    subscribeRealtime,
    unsubscribeRealtime,
    startPolling,
    stopPolling,
    emitTyping,
    clearMyTyping,
    setActiveChannel,
    openChannel,
    totalUnread,
    sendMessage,
    deleteMessage
  };
});
