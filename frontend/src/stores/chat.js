import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  MOCK_CHANNELS, 
  loadPersistentMessages, 
  savePersistentMessages,
  pb 
} from '@/api/pocketbase';
import { useAuthStore } from './auth';
import { detectFileType } from '@/utils/fileIcons';
import { playChimeSound } from '@/utils/formatters';

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore();

  const channels = ref([...MOCK_CHANNELS]);
  const activeChannelId = ref('space_it');
  const messagesByChannel = ref(loadPersistentMessages());
  
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const isTyping = ref(false);
  const typingUser = ref('Johan');

  // Funcionalidades Senior UX
  const replyingTo = ref(null); // Mensaje que se está respondiendo/citando
  const inChatSearch = ref(''); // Búsqueda de mensajes dentro del canal activo
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

  function setActiveChannel(channelId) {
    activeChannelId.value = channelId;
    replyingTo.value = null;
    inChatSearch.value = '';
    isSearchOpen.value = false;

    if (!messagesByChannel.value[channelId]) {
      messagesByChannel.value[channelId] = [];
      savePersistentMessages(messagesByChannel.value);
    }
    fetchMessages(channelId);
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

  function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      if (file.size < 15 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      } else {
        resolve(URL.createObjectURL(file));
      }
    });
  }

  /**
   * Enviar mensaje con soporte de Cita/Respuesta y sonido elegante
   */
  async function sendMessage(content, files = []) {
    if (!content.trim() && files.length === 0) return;

    const channelId = activeChannelId.value;
    const sender = authStore.currentUser;

    const processedAttachments = [];

    if (files.length > 0) {
      isUploading.value = true;
      uploadProgress.value = 25;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = detectFileType(file.name, file.type);
        const dataUrl = await readFileAsDataUrl(file);

        processedAttachments.push({
          id: 'att_' + Date.now() + '_' + i,
          filename: file.name,
          file_type: fileType,
          size: file.size,
          url: dataUrl
        });

        uploadProgress.value = Math.min(95, Math.floor(((i + 1) / files.length) * 85) + 15);
      }
    }

    const newMessage = {
      id: 'msg_' + Date.now(),
      channel: channelId,
      sender: {
        id: sender.id,
        name: sender.name,
        role: sender.role,
        position: sender.position,
        avatar: sender.avatar
      },
      content: content.trim(),
      type: processedAttachments.length > 0 ? 'file' : 'text',
      created: new Date().toISOString(),
      attachments: processedAttachments,
      reply_to: replyingTo.value ? {
        id: replyingTo.value.id,
        senderName: replyingTo.value.sender.name,
        snippet: replyingTo.value.content ? (replyingTo.value.content.slice(0, 80) + '...') : 'Archivo adjunto'
      } : null,
      reactions: {} // Ej: { "👍": ["user_joseluis_01"], "🚀": ["user_johan_02"] }
    };

    if (!messagesByChannel.value[channelId]) {
      messagesByChannel.value[channelId] = [];
    }
    messagesByChannel.value[channelId].push(newMessage);

    savePersistentMessages(messagesByChannel.value);

    // Limpiar respuesta activa
    replyingTo.value = null;

    // Reproducir feedback de audio suave
    if (soundEnabled.value) {
      playChimeSound('send');
    }

    if (files.length > 0) {
      uploadProgress.value = 100;
      setTimeout(() => {
        isUploading.value = false;
        uploadProgress.value = 0;
      }, 400);
    }

    try {
      if (pb) {
        if (!pb.authStore.isValid && authStore.currentUser?.email) {
          try {
            await pb.collection('users').authWithPassword(authStore.currentUser.email, 'eMadrid2025!');
          } catch (_) {}
        }
        if (pb.authStore.isValid) {
          const record = await pb.collection('messages').create({
            channel: channelId,
            sender: pb.authStore.model?.id || sender.id,
            content: content.trim(),
            type: newMessage.type,
            reactions: {}
          });
          if (record && record.id) {
            newMessage.id = record.id;

            // Subir cada archivo a la colección de attachments de PocketBase
            if (files && files.length > 0) {
              for (let i = 0; i < files.length; i++) {
                try {
                  const file = files[i];
                  const fileType = detectFileType(file.name, file.type);
                  const formData = new FormData();
                  formData.append('channel', channelId);
                  formData.append('message', record.id);
                  formData.append('uploader', pb.authStore.model?.id || sender.id);
                  formData.append('file', file);
                  formData.append('filename', file.name);
                  formData.append('file_type', fileType);
                  formData.append('size', file.size);
                  formData.append('mime_type', file.type || 'application/octet-stream');

                  const attRecord = await pb.collection('attachments').create(formData);
                  if (attRecord && attRecord.file) {
                    const realUrl = pb.files.getUrl(attRecord, attRecord.file);
                    if (newMessage.attachments[i]) {
                      newMessage.attachments[i].id = attRecord.id;
                      newMessage.attachments[i].url = realUrl;
                    }
                  }
                } catch (attErr) {
                  console.warn('Error subiendo archivo a PocketBase:', attErr);
                }
              }
            }

            savePersistentMessages(messagesByChannel.value);
          }
        }
      }
    } catch (err) {
      console.warn('Error enviando mensaje a PocketBase:', err);
    }
  }

  /**
   * Reacciones con Emojis (👍, 🚀, 👀, ❤️, 🔥, etc.)
   */
  function toggleReaction(messageId, emoji) {
    const channelId = activeChannelId.value;
    const msg = messagesByChannel.value[channelId]?.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) {
      msg.reactions = {};
    }

    const currentUserId = authStore.currentUser?.id;
    if (!currentUserId) return;

    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    const userIndex = msg.reactions[emoji].indexOf(currentUserId);
    if (userIndex > -1) {
      // Quitar reacción
      msg.reactions[emoji].splice(userIndex, 1);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      // Añadir reacción
      msg.reactions[emoji].push(currentUserId);
    }

    savePersistentMessages(messagesByChannel.value);
  }

  async function deleteMessage(messageId) {
    const channelId = activeChannelId.value;
    if (messagesByChannel.value[channelId]) {
      messagesByChannel.value[channelId] = messagesByChannel.value[channelId].filter(m => m.id !== messageId);
      savePersistentMessages(messagesByChannel.value);
    }

    try {
      if (pb) {
        // Asegurar que si es ID de PocketBase se elimina permanentemente de la base de datos
        await pb.collection('messages').delete(messageId);
      }
    } catch (e) {
      console.warn('Error eliminando mensaje en PocketBase:', e.message);
    }
  }

  function clearActiveChannel() {
    const channelId = activeChannelId.value;
    messagesByChannel.value[channelId] = [];
    savePersistentMessages(messagesByChannel.value);
  }

  async function fetchChannels() {
    try {
      if (pb) {
        const records = await pb.collection('channels').getFullList({
          sort: 'created'
        });
        if (records && records.length > 0) {
          channels.value = records.map(r => ({
            id: r.id,
            name: r.name,
            department: r.department || r.name,
            description: r.description || '',
            icon: r.icon || 'Hash',
            unread_count: 0
          }));
          // Si el canal activo no existe en la lista de PocketBase, seleccionar el de IT o el primero
          if (!records.some(r => r.id === activeChannelId.value)) {
            const itChannel = records.find(r => 
              r.name.toLowerCase().includes('it') || 
              r.name.toLowerCase().includes('sistemas')
            );
            activeChannelId.value = itChannel ? itChannel.id : records[0].id;
          }
        }
      }
    } catch (e) {
      console.warn('Usando canales locales predeterminados:', e.message);
    }
    await fetchMessages(activeChannelId.value);
  }

  function resolveSenderProfile(senderId, expandSender) {
    const expandName = (expandSender?.name || expandSender?.username || '').toLowerCase();
    const expandEmail = (expandSender?.email || '').toLowerCase();

    // 1. Si PocketBase tiene un archivo de avatar subido, ¡USARLO SIEMPRE!
    let pbAvatar = '';
    if (expandSender?.avatar && pb) {
      pbAvatar = pb.files.getUrl(expandSender, expandSender.avatar, { thumb: '160x160' });
    }

    // 2. Buscar en teamMembers por ID, email o nombre
    const matched = authStore.teamMembers.find(u => {
      if (u.id === senderId) return true;
      if (expandEmail && u.email?.toLowerCase() === expandEmail) return true;
      if (expandName) {
        const uName = (u.name || '').toLowerCase();
        if (uName.includes('jose') && expandName.includes('jose')) return true;
        if (uName.includes('johan') && expandName.includes('johan')) return true;
        if (uName === expandName) return true;
      }
      return false;
    });

    if (matched) {
      return {
        id: senderId,
        name: expandSender?.name || matched.name,
        avatar: pbAvatar || matched.avatar,
        role: expandSender?.role || matched.role || 'member',
        position: matched.position || 'IT & Sistemas'
      };
    }

    // 3. Fallback solo si no hay ninguna foto real subida
    const isJose = expandName.includes('jose') || expandEmail.includes('jose');
    const isJohan = expandName.includes('johan') || expandEmail.includes('johan');

    return {
      id: senderId,
      name: expandSender?.name || (isJose ? 'Jose Luis' : isJohan ? 'Johan' : 'Compañero'),
      avatar: pbAvatar || (isJose 
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' 
        : isJohan 
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80' 
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'),
      role: expandSender?.role || 'member',
      position: 'Desarrollador'
    };
  }

  async function fetchMessages(channelId = activeChannelId.value) {
    try {
      if (pb) {
        const [messagesRes, attachmentsRes] = await Promise.all([
          pb.collection('messages').getList(1, 100, {
            filter: `channel = "${channelId}" && type != "system"`,
            sort: 'created',
            expand: 'sender'
          }),
          pb.collection('attachments').getFullList({
            filter: `channel = "${channelId}"`,
            sort: 'created'
          }).catch(() => [])
        ]);

        // Mapear adjuntos por ID de mensaje
        const attMap = {};
        for (const att of (attachmentsRes || [])) {
          if (att.message) {
            if (!attMap[att.message]) attMap[att.message] = [];
            attMap[att.message].push({
              id: att.id,
              filename: att.filename,
              file_type: att.file_type || detectFileType(att.filename, att.mime_type),
              size: att.size,
              url: pb.files.getUrl(att, att.file)
            });
          }
        }

        if (messagesRes.items && messagesRes.items.length > 0) {
          const currentList = messagesByChannel.value[channelId] || [];

          messagesByChannel.value[channelId] = messagesRes.items.map(r => {
            const senderUser = resolveSenderProfile(r.sender, r.expand?.sender);
            
            // Si el mensaje ya tenía adjuntos locales en memoria, preservarlos para que nunca se borren
            const existingMsg = currentList.find(m => m.id === r.id);
            const resolvedAttachments = (attMap[r.id] && attMap[r.id].length > 0) 
              ? attMap[r.id] 
              : (existingMsg?.attachments || []);

            return {
              id: r.id,
              channel: r.channel,
              sender: senderUser,
              content: r.content,
              type: r.type || (resolvedAttachments.length > 0 ? 'file' : 'text'),
              created: r.created,
              attachments: resolvedAttachments,
              reactions: r.reactions || {}
            };
          });
          savePersistentMessages(messagesByChannel.value);
        }
      }
    } catch (e) {
      console.warn('Error cargando mensajes de PocketBase:', e.message);
    }
  }

  let lastTypingSent = 0;
  async function emitTyping() {
    if (!pb) return;
    const now = Date.now();
    if (now - lastTypingSent < 2000) return;
    lastTypingSent = now;

    try {
      const senderId = pb.authStore.model?.id || authStore.currentUser?.id;
      if (!senderId) return;
      await pb.collection('messages').create({
        channel: activeChannelId.value,
        sender: senderId,
        content: '__TYPING__',
        type: 'system',
        reactions: {}
      });
    } catch (_) {}
  }

  async function clearMyTyping() {}

  let typingTimer = null;
  async function subscribeRealtime() {
    try {
      if (pb) {
        // Suscribirse a mensajes y eventos de escritura en tiempo real
        await pb.collection('messages').subscribe('*', (e) => {
          if (e.action === 'create') {
            const record = e.record;
            const chId = record.channel;

            // Detección en tiempo real de "Escribiendo..."
            if (record.type === 'system' && record.content === '__TYPING__') {
              const myId = pb.authStore.model?.id || authStore.currentUser?.id;
              if (record.sender !== myId && chId === activeChannelId.value) {
                const senderUser = resolveSenderProfile(record.sender, record.expand?.sender);
                isTyping.value = true;
                typingUser.value = senderUser.name || 'Compañero';
                if (typingTimer) clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                  isTyping.value = false;
                }, 3500);
              }
              // Limpiar el ping de la base de datos de inmediato
              pb.collection('messages').delete(record.id).catch(() => {});
              return;
            }

            if (!messagesByChannel.value[chId]) {
              messagesByChannel.value[chId] = [];
            }

            const alreadyExists = messagesByChannel.value[chId].some(
              m => m.id === record.id || (m.content === record.content && m.sender?.id === record.sender)
            );

            if (!alreadyExists) {
              const senderUser = resolveSenderProfile(record.sender, record.expand?.sender);

              messagesByChannel.value[chId].push({
                id: record.id,
                channel: chId,
                sender: senderUser,
                content: record.content,
                type: record.type || 'text',
                created: record.created,
                attachments: [],
                reactions: record.reactions || {}
              });

              savePersistentMessages(messagesByChannel.value);

              if (record.type === 'file') {
                setTimeout(() => fetchMessages(chId), 400);
              }

              if (soundEnabled.value) {
                playChimeSound('receive');
              }
            }
          } else if (e.action === 'delete') {
            deleteMessage(e.record.id);
          }
        });
      }
    } catch (err) {
      console.warn('Error en suscripción tiempo real PocketBase:', err.message);
    }
  }

  let pollingInterval = null;
  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      fetchMessages(activeChannelId.value);
    }, 2000);
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
    startPolling,
    stopPolling,
    emitTyping,
    clearMyTyping,
    setActiveChannel,
    sendMessage,
    deleteMessage,
    clearActiveChannel
  };
});
