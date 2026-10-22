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

    <!-- Botón flotante para bajar al último mensaje cuando se ha subido el scroll -->
    <button 
      v-if="showScrollBottomButton"
      @click="scrollToBottom"
      class="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-800 text-white text-xs font-semibold shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-700 animate-fade-in-up"
    >
      <ArrowDown class="w-3.5 h-3.5" />
      <span>Nuevos mensajes</span>
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
  ArrowDown
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { getDateDividerLabel, isSameDay } from '@/utils/formatters';
import ChatMessageBubble from './ChatMessageBubble.vue';
import ChatInput from './ChatInput.vue';
import FileUploadZone from './FileUploadZone.vue';
import TypingIndicator from './TypingIndicator.vue';

const chatStore = useChatStore();
const messagesContainer = ref(null);
const chatInputRef = ref(null);
const showScrollBottomButton = ref(false);

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

function handleScroll() {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  showScrollBottomButton.value = scrollHeight - scrollTop - clientHeight > 180;
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(
  () => chatStore.currentMessages?.length,
  () => {
    scrollToBottom();
  }
);

watch(
  () => chatStore.isTyping,
  (typing) => {
    if (typing) scrollToBottom();
  }
);

watch(
  () => chatStore.activeChannelId,
  () => {
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
