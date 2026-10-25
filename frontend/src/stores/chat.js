import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { pb, mapUser, initialsAvatar, fileToken, protectedFileUrl } from '@/api/pocketbase';
import { useAuthStore } from './auth';
import { usePwaStore } from './pwa';
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
      markChannelRead(activeChannelId.value);
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
      reply_to: mapReply(record),
      edited_at: record.edited_at || '',
      forwarded: !!record.forwarded,
      read_by: record.read_by || [],
      deleted_at: record.deleted_at || ''
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
        filter: pb.filter('channel = {:ch} && type != "system" && deleted != true', { ch: channelId }),
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
      markChannelRead(channelId);
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
    clearSelection();
    cancelEdit();
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

  function canModify(msg) {
    return msg?.sender?.id === myId() || authStore.currentUser?.role === 'admin';
  }

  // ---------- Papelera (borrado reversible) ----------

  /**
   * Mandar mensajes a la papelera. Se pueden restaurar durante 30 días;
   * el aviso inferior permite deshacerlo al momento.
   */
  async function deleteMessages(messageIds) {
    const channelId = activeChannelId.value;
    const targets = rawMessages.value.filter(m => messageIds.includes(m.id) && canModify(m));
    if (targets.length === 0) return;

    const now = new Date().toISOString();
    const moved = [];
    for (const msg of targets) {
      removeLocalMessage(channelId, msg.id);
      if (msg.id.startsWith('tmp_')) continue;
      try {
        await pb.collection('messages').update(msg.id, { deleted: true, deleted_at: now, deleted_by: myId() });
        moved.push(msg.id);
      } catch (e) {
        console.warn('Error enviando a la papelera:', e.message);
      }
    }
    clearSelection();
    if (moved.length < targets.length) fetchMessages(channelId);

    if (moved.length > 0) {
      usePwaStore().showToast(
        moved.length === 1 ? 'Mensaje movido a la papelera' : `${moved.length} mensajes movidos a la papelera`,
        'info',
        6000,
        { label: 'Deshacer', run: () => restoreMessages(moved) }
      );
    }
  }

  function deleteMessage(messageId) {
    return deleteMessages([messageId]);
  }

  async function restoreMessages(messageIds) {
    const channelsToReload = new Set();
    for (const id of messageIds) {
      try {
        const record = await pb.collection('messages').update(id, { deleted: false, deleted_at: '', deleted_by: '' });
        channelsToReload.add(record.channel);
      } catch (e) {
        console.warn('Error restaurando mensaje:', e.message);
      }
    }
    trashItems.value = trashItems.value.filter(m => !messageIds.includes(m.id));
    channelsToReload.forEach(ch => fetchMessages(ch));
  }

  const isTrashOpen = ref(false);
  const trashItems = ref([]);
  const trashLoading = ref(false);

  async function fetchTrash() {
    trashLoading.value = true;
    try {
      const records = await pb.collection('messages').getFullList({
        filter: 'deleted = true',
        sort: '-deleted_at',
        expand: 'sender'
      });
      const ids = records.map(r => r.id);
      const attMap = {};
      if (ids.length > 0) {
        const atts = await pb.collection('attachments').getFullList({
          filter: ids.map(id => pb.filter('message = {:id}', { id })).join(' || ')
        });
        for (const att of atts) {
          if (!attMap[att.message]) attMap[att.message] = [];
          attMap[att.message].push(mapAttachment(att));
        }
      }
      trashItems.value = records.map(r => ({
        ...mapMessage(r, attMap[r.id] || []),
        channelName: channels.value.find(c => c.id === r.channel)?.name || ''
      }));
    } catch (e) {
      console.warn('Error cargando la papelera:', e.message);
    } finally {
      trashLoading.value = false;
    }
  }

  function openTrash() {
    isTrashOpen.value = true;
    fetchTrash();
  }

  function closeTrash() {
    isTrashOpen.value = false;
  }

  // Borrado definitivo (con sus adjuntos, que no se borran en cascada)
  async function purgeMessages(messageIds) {
    for (const id of messageIds) {
      const msg = trashItems.value.find(m => m.id === id);
      try {
        for (const att of msg?.attachments || []) {
          await pb.collection('attachments').delete(att.id).catch(() => {});
        }
        await pb.collection('messages').delete(id);
      } catch (e) {
        console.warn('Error borrando definitivamente:', e.message);
      }
    }
    trashItems.value = trashItems.value.filter(m => !messageIds.includes(m.id));
  }

  function emptyTrash() {
    return purgeMessages(trashItems.value.map(m => m.id));
  }

  // ---------- Editar (como WhatsApp: solo tus mensajes y durante 15 minutos) ----------

  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const editingMessage = ref(null);

  function canEdit(msg) {
    return !!msg
      && msg.sender?.id === myId()
      && !msg.status
      && !!msg.content
      && Date.now() - new Date(msg.created).getTime() < EDIT_WINDOW_MS;
  }

  function startEdit(msg) {
    if (!canEdit(msg)) return;
    replyingTo.value = null;
    clearSelection();
    editingMessage.value = msg;
  }

  function cancelEdit() {
    editingMessage.value = null;
  }

  async function saveEdit(newContent) {
    const msg = editingMessage.value;
    editingMessage.value = null;
    const content = newContent.trim();
    if (!msg || !content || content === msg.content) return;

    const previous = { content: msg.content, edited_at: msg.edited_at };
    const editedAt = new Date().toISOString();
    msg.content = content;
    msg.edited_at = editedAt;
    try {
      await pb.collection('messages').update(msg.id, { content, edited_at: editedAt });
    } catch (e) {
      console.warn('Error editando mensaje:', e.message);
      Object.assign(msg, previous);
      usePwaStore().showToast('No se pudo editar el mensaje', 'error');
    }
  }

  // Flecha arriba con el cuadro vacío: editar tu último mensaje (como WhatsApp Web)
  function editLastOwnMessage() {
    const last = [...rawMessages.value].reverse().find(m => m.sender?.id === myId());
    if (canEdit(last)) startEdit(last);
  }

  // ---------- Selección múltiple ----------

  const selectedIds = ref([]);
  const selectionMode = computed(() => selectedIds.value.length > 0);
  const selectedMessages = computed(() => rawMessages.value.filter(m => selectedIds.value.includes(m.id)));

  function toggleSelect(messageId) {
    if (messageId.startsWith('tmp_')) return;
    selectedIds.value = selectedIds.value.includes(messageId)
      ? selectedIds.value.filter(id => id !== messageId)
      : [...selectedIds.value, messageId];
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  async function copySelected() {
    const text = selectedMessages.value
      .map(m => (selectedMessages.value.length > 1 ? `[${m.sender.name}] ` : '') + (m.content || m.attachments.map(a => a.filename).join(', ')))
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      usePwaStore().showToast('Copiado', 'success', 1800);
    } catch (_) {}
    clearSelection();
  }

  // ---------- Reenviar ----------

  const forwardingIds = ref([]);

  function startForward(messageIds) {
    forwardingIds.value = [...messageIds];
  }

  function cancelForward() {
    forwardingIds.value = [];
  }

  /**
   * Reenvía a otro canal: el texto tal cual y los adjuntos como copias nuevas
   * (se descargan con el token y se vuelven a subir en el destino).
   */
  async function forwardMessages(targetChannelId) {
    const ids = forwardingIds.value;
    forwardingIds.value = [];
    clearSelection();
    const source = Object.values(messagesByChannel.value).flat().filter(m => ids.includes(m.id));
    source.sort((a, b) => new Date(a.created) - new Date(b.created));

    let ok = 0;
    for (const msg of source) {
      try {
        const record = await pb.collection('messages').create({
          channel: targetChannelId,
          sender: myId(),
          content: msg.content || '',
          type: msg.attachments.length > 0 ? 'file' : 'text',
          reactions: {},
          forwarded: true
        });
        for (const att of msg.attachments) {
          if (!att.fileRef) continue;
          const blob = await (await fetch(att.url)).blob();
          const formData = new FormData();
          formData.append('channel', targetChannelId);
          formData.append('message', record.id);
          formData.append('uploader', myId());
          formData.append('file', new File([blob], att.filename, { type: blob.type }));
          formData.append('filename', att.filename);
          formData.append('file_type', att.file_type);
          formData.append('size', att.size || blob.size);
          formData.append('mime_type', blob.type || 'application/octet-stream');
          await pb.collection('attachments').create(formData);
        }
        ok++;
      } catch (e) {
        console.warn('Error reenviando mensaje:', e);
      }
    }

    const target = channels.value.find(c => c.id === targetChannelId);
    usePwaStore().showToast(
      ok === source.length ? `Reenviado a ${target?.name || 'otro canal'}` : 'Algunos mensajes no se pudieron reenviar',
      ok === source.length ? 'success' : 'error',
      4000,
      ok > 0 && targetChannelId !== activeChannelId.value
        ? { label: 'Ir', run: () => setActiveChannel(targetChannelId) }
        : null
    );
    if (targetChannelId === activeChannelId.value) fetchMessages(targetChannelId);
  }

  // ---------- Leído (doble check azul) ----------

  let markingRead = false;
  async function markChannelRead(channelId) {
    if (markingRead || channelId !== activeChannelId.value || document.visibilityState !== 'visible') return;
    const me = myId();
    if (!me) return;
    const unread = (messagesByChannel.value[channelId] || [])
      .filter(m => !m.status && m.sender?.id !== me && !(m.read_by || []).includes(me))
      .slice(-50);
    if (unread.length === 0) return;

    markingRead = true;
    try {
      for (const msg of unread) {
        msg.read_by = [...(msg.read_by || []), me];
        await pb.collection('messages').update(msg.id, { 'read_by+': me }).catch(() => {});
      }
    } finally {
      markingRead = false;
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
      // Enviado a la papelera (lo vemos solo si es nuestro o somos admin)
      if (record.deleted) {
        removeLocalMessage(chId, record.id);
        selectedIds.value = selectedIds.value.filter(id => id !== record.id);
        return;
      }
      if (existing) {
        existing.content = record.content;
        existing.reactions = record.reactions || {};
        existing.edited_at = record.edited_at || '';
        existing.read_by = record.read_by || [];
      } else if (chId === activeChannelId.value) {
        // Restaurado desde la papelera
        fetchMessages(chId);
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
    else markChannelRead(chId);
    if (soundEnabled.value) playChimeSound('receive');
  }

  // Avisos del servidor para mensajes que otros mandan a la papelera o restauran
  function handleChatEvent(data) {
    if (!data?.id) return;
    if (data.type === 'hidden') {
      removeLocalMessage(data.channel, data.id);
      selectedIds.value = selectedIds.value.filter(id => id !== data.id);
    } else if (data.type === 'restored' && messagesByChannel.value[data.channel]) {
      fetchMessages(data.channel);
    }
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
        pb.realtime.subscribe('chat_events', handleChatEvent),
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
    deleteMessage,
    deleteMessages,
    restoreMessages,
    canModify,
    // Papelera
    isTrashOpen,
    trashItems,
    trashLoading,
    openTrash,
    closeTrash,
    fetchTrash,
    purgeMessages,
    emptyTrash,
    // Edición
    editingMessage,
    canEdit,
    startEdit,
    cancelEdit,
    saveEdit,
    editLastOwnMessage,
    // Selección y reenvío
    selectedIds,
    selectionMode,
    selectedMessages,
    toggleSelect,
    clearSelection,
    copySelected,
    forwardingIds,
    startForward,
    cancelForward,
    forwardMessages,
    markChannelRead
  };
});
