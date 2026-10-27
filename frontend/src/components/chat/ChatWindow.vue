<template>
  <div 
    class="relative flex-1 flex flex-col h-full bg-white dark:bg-[#070e1b] text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Overlay de Drag & Drop para documentos -->
    <FileUploadZone :is-dragging="isDragging" />

    <!-- Barra de Búsqueda Interna del Canal (Ctrl + F) -->
    <div 
      v-if="chatStore.isSearchOpen"
      class="p-2.5 px-4 bg-slate-50 dark:bg-[#0f1c34] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 animate-fade-in-up"
    >
      <div class="flex items-center gap-2 flex-1 max-w-md">
        <Search class="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <input 
          v-model="chatStore.inChatSearch"
          type="text" 
          placeholder="Filtrar mensajes o archivos en este espacio..."
          class="w-full bg-transparent text-base sm:text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          autoFocus
        />
        <span v-if="chatStore.inChatSearch" class="text-[10px] text-slate-400 font-mono">
          {{ chatStore.currentMessages.length }} resultado(s)
        </span>
      </div>

      <button 
        @click="chatStore.isSearchOpen = false; chatStore.inChatSearch = ''"
        class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Mensajes del Chat con Scroll Suave -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-2 sm:px-6 py-4 space-y-0.5"
      @scroll="handleScroll"
    >
      <!-- Feed de mensajes con separadores de fecha y agrupación consecutiva -->
      <template v-for="(msg, index) in chatStore.currentMessages" :key="msg.id">
        
        <!-- Separador de Fecha Estilo Linear / Slack ("Hoy", "Ayer", etc.) -->
        <div 
          v-if="shouldShowDateDivider(index)"
          class="relative my-5 flex items-center justify-center select-none"
        >
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <span class="relative px-3.5 py-0.5 text-[11px] font-bold font-mono text-slate-600 dark:text-amber-400 bg-white dark:bg-[#0f1c34] rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
            {{ getDateDividerLabel(msg.created) }}
          </span>
        </div>

        <!-- Burbuja con lógica consecutiva inteligente -->
        <ChatMessageBubble 
          :message="msg"
          :is-consecutive="checkIsConsecutive(index)"
        />
      </template>

      <!-- Estado vacío -->
      <div v-if="chatStore.currentMessages.length === 0" class="py-16 text-center text-slate-400">
        <p class="text-xs font-medium">No hay mensajes todavía en este espacio.</p>
        <p class="text-[11px] text-slate-500 mt-1">Escribe o arrastra cualquier archivo para comenzar.</p>
      </div>

      <!-- Indicador animado de "Escribiendo..." -->
      <TypingIndicator 
        v-if="chatStore.isTyping" 
        :user-name="chatStore.typingUser" 
      />
    </div>

    <!-- Bajar al final (como WhatsApp): solo con contador si de verdad han llegado mensajes mientras leías arriba -->
    <button
      v-if="showScrollBottomButton"
      @click="scrollToBottom(true)"
      class="absolute bottom-24 right-4 sm:right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all animate-fade-in-up cursor-pointer"
      :title="unseenCount > 0 ? `${unseenCount} mensaje(s) nuevo(s)` : 'Ir al último mensaje'"
    >
      <ChevronDown class="w-5 h-5" />
      <span
        v-if="unseenCount > 0"
        class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center"
      >
        {{ unseenCount > 99 ? '99+' : unseenCount }}
      </span>
    </button>

    <!-- Input inferior del chat -->
    <ChatInput ref="chatInputRef" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import {
  Search,
  X,
  ChevronDown
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { getDateDividerLabel, isSameDay } from '@/utils/formatters';
import ChatMessageBubble from './ChatMessageBubble.vue';
import ChatInput from './ChatInput.vue';
import FileUploadZone from './FileUploadZone.vue';
import TypingIndicator from './TypingIndicator.vue';

const chatStore = useChatStore();
const authStore = useAuthStore();
const messagesContainer = ref(null);
const chatInputRef = ref(null);
const showScrollBottomButton = ref(false);
// Mensajes de otros que han llegado mientras estabas leyendo más arriba
const unseenCount = ref(0);
const NEAR_BOTTOM_PX = 180;

const isDragging = ref(false);
let dragCounter = 0;

function shouldShowDateDivider(index) {
  if (index === 0) return true;
  const currentMsg = chatStore.currentMessages[index];
  const prevMsg = chatStore.currentMessages[index - 1];
  return !isSameDay(currentMsg.created, prevMsg.created);
}

function checkIsConsecutive(index) {
  if (index === 0) return false;
  const currentMsg = chatStore.currentMessages[index];
  const prevMsg = chatStore.currentMessages[index - 1];

  if (!isSameDay(currentMsg.created, prevMsg.created)) return false;
  if (currentMsg.sender.id !== prevMsg.sender.id) return false;
  if (currentMsg.reply_to) return false;

  const diffMinutes = (new Date(currentMsg.created) - new Date(prevMsg.created)) / 60000;
  return diffMinutes < 5;
}

function isNearBottom() {
  const el = messagesContainer.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
}

function handleScroll() {
  const near = isNearBottom();
  showScrollBottomButton.value = !near;
  // Al llegar abajo, lo nuevo ya está visto
  if (near) unseenCount.value = 0;
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    const el = messagesContainer.value;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    unseenCount.value = 0;
  });
}

// Sobre la lista completa del canal (no la filtrada por la búsqueda), para que
// buscar o limpiar la búsqueda no cuente como "mensajes nuevos"
watch(
  () => chatStore.rawMessages?.length,
  (length, previous) => {
    const added = length - (previous || 0);
    if (added <= 0) return; // borrados o recargas: no mover el scroll

    const last = chatStore.rawMessages[length - 1];
    const isMine = last?.sender?.id === authStore.currentUser?.id;

    // Carga inicial, mensaje propio o ya estabas abajo: bajar al final
    if (!previous || isMine || !showScrollBottomButton.value) {
      scrollToBottom();
      return;
    }
    // Estabas leyendo más arriba: no arrastrarte, solo contar lo nuevo
    unseenCount.value += added;
  }
);

watch(
  () => chatStore.isTyping,
  (typing) => {
    if (typing && isNearBottom()) scrollToBottom();
  }
);

watch(
  () => chatStore.activeChannelId,
  () => {
    showScrollBottomButton.value = false;
    unseenCount.value = 0;
    scrollToBottom();
  }
);

onMounted(() => {
  scrollToBottom();
});

function handleDragEnter(e) {
  dragCounter++;
  if (e.dataTransfer.types.includes('Files')) {
    isDragging.value = true;
  }
}

function handleDragOver(e) {
  e.dataTransfer.dropEffect = 'copy';
}

function handleDragLeave() {
  dragCounter--;
  if (dragCounter <= 0) {
    isDragging.value = false;
    dragCounter = 0;
  }
}

function handleDrop(e) {
  isDragging.value = false;
  dragCounter = 0;

  const droppedFiles = Array.from(e.dataTransfer.files || []);
  if (droppedFiles.length > 0 && chatInputRef.value) {
    chatInputRef.value.addDroppedFiles(droppedFiles);
  }
}
</script>
