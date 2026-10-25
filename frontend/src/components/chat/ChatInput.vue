<template>
  <div class="relative p-2.5 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] transition-colors duration-200 flex-shrink-0">
    
    <!-- Barra de progreso de subida -->
    <div 
      v-if="chatStore.isUploading" 
      class="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden"
    >
      <div 
        class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
        :style="{ width: `${chatStore.uploadProgress}%` }"
      ></div>
    </div>

    <!-- BANNER DE RESPUESTA / CITAR MENSAJE (Senior UX) -->
    <div 
      v-if="chatStore.replyingTo"
      class="mb-2.5 flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 rounded-r-xl px-3 py-1.5 text-xs animate-fade-in-up"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Reply class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span class="text-slate-500 dark:text-slate-400">Respondiendo a</span>
        <span class="font-bold text-slate-800 dark:text-white">{{ chatStore.replyingTo.sender.name }}:</span>
        <span class="truncate text-slate-600 dark:text-slate-300 italic max-w-xs">
          {{ chatStore.replyingTo.content || 'Archivo adjunto' }}
        </span>
      </div>

      <button 
        @click="chatStore.clearReply"
        class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors ml-2 cursor-pointer"
        title="Cancelar respuesta"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- BANNER DE EDICIÓN (como WhatsApp) -->
    <div
      v-if="chatStore.editingMessage"
      class="mb-2.5 flex items-center justify-between bg-sky-500/10 border-l-4 border-sky-500 rounded-r-xl px-3 py-1.5 text-xs animate-fade-in-up"
    >
      <div class="flex items-center gap-2 min-w-0">
        <Pencil class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
        <span class="font-bold text-slate-800 dark:text-white flex-shrink-0">Editando mensaje</span>
        <span class="truncate text-slate-500 dark:text-slate-400 italic max-w-xs">{{ chatStore.editingMessage.content }}</span>
      </div>
      <button
        @click="cancelEditing"
        class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors ml-2 cursor-pointer"
        title="Cancelar edición (Esc)"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Previsualización de archivos pendientes de envío -->
    <div v-if="pendingFiles.length > 0" class="flex flex-wrap gap-2 mb-3">
      <div 
        v-for="(f, idx) in pendingFiles" 
        :key="idx"
        class="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs text-slate-800 dark:text-slate-100"
      >
        <Paperclip class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span class="max-w-[160px] truncate font-medium">{{ f.name }}</span>
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({{ formatFileSize(f.size) }})</span>
        <button 
          @click="removeFile(idx)"
          class="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Caja de entrada principal estilo Linear / Slack Pro -->
    <div 
      class="flex items-end gap-1.5 sm:gap-2 bg-slate-50 dark:bg-[#070e1b] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 sm:p-2 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500 transition-all duration-200 shadow-inner"
    >
      <!-- Botón de Adjuntar Archivo -->
      <button
        v-if="!chatStore.editingMessage"
        @click="triggerFileInput"
        type="button"
        class="p-2.5 sm:p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
        title="Adjuntar documento o captura"
      >
        <Paperclip class="w-5 h-5 sm:w-4 sm:h-4" />
      </button>

      <!-- Input invisible para selección de archivos -->
      <input 
        ref="fileInputRef"
        type="file"
        multiple
        class="hidden"
        @change="handleFilesSelected"
      />

      <!-- Textarea auto-creciente con soporte de Pegado Clipboard (Ctrl+V) -->
      <textarea 
        ref="textareaRef"
        v-model="text"
        rows="1"
        :placeholder="placeholderText"
        class="flex-1 bg-transparent resize-none max-h-36 py-2 px-1 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
        @keydown="handleKeyDown"
        @paste="handlePaste"
        @input="onInput"
      ></textarea>

      <!-- Selector rápido de emojis -->
      <div class="relative flex-shrink-0">
        <button 
          type="button"
          @click="showEmojiBar = !showEmojiBar"
          class="p-2.5 sm:p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Insertar emoji"
        >
          <Smile class="w-5 h-5 sm:w-4 sm:h-4" />
        </button>

        <!-- Popover de emojis comunes -->
        <div 
          v-if="showEmojiBar"
          class="absolute bottom-12 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-xl flex items-center gap-1.5 z-30 animate-fade-in-up"
        >
          <button 
            v-for="e in ['👍', '🚀', '🔥', '👀', '✅', '⚠️', '💡', '🎉']"
            :key="e"
            type="button"
            @click="insertEmoji(e)"
            class="p-1 text-base sm:text-sm hover:scale-125 transition-transform cursor-pointer"
          >
            {{ e }}
          </button>
        </div>
      </div>

      <!-- Botón de Envío -->
      <button 
        @click="submit"
        :disabled="!canSend"
        type="button"
        class="w-10 h-10 sm:w-9 sm:h-9 rounded-xl transition-all duration-200 flex-shrink-0 flex items-center justify-center cursor-pointer"
        :class="canSend 
          ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-500/25 active:scale-95' 
          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'"
        :title="chatStore.editingMessage ? 'Guardar cambios (Enter)' : 'Enviar mensaje (Enter)'"
      >
        <Check v-if="chatStore.editingMessage" class="w-5 h-5 stroke-[3]" />
        <Send v-else class="w-4 h-4 sm:w-4 sm:h-4" />
      </button>
    </div>

    <!-- Micro-hints de teclado estilo Slack/Linear -->
    <div class="flex items-center justify-between mt-1.5 px-1 text-xs sm:text-[11px] text-slate-500 dark:text-slate-400">
      <span class="flex items-center gap-1.5 truncate">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
        <span class="truncate">Conectado con <strong class="text-slate-800 dark:text-white">{{ authStore.peerUser?.name || 'el equipo' }}</strong></span>
      </span>
      <span class="hidden sm:inline-flex items-center gap-1 font-mono flex-shrink-0">
        <kbd class="kbd-badge">Enter</kbd> enviar • <kbd class="kbd-badge">`code`</kbd> • <kbd class="kbd-badge">**bold**</kbd>
      </span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import {
  Paperclip,
  Send,
  X,
  Smile,
  Reply,
  Pencil,
  Check
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { formatFileSize } from '@/utils/formatters';

const chatStore = useChatStore();
const authStore = useAuthStore();

const text = ref('');
const pendingFiles = ref([]);
const fileInputRef = ref(null);
const textareaRef = ref(null);
const showEmojiBar = ref(false);

const canSend = computed(() => {
  return text.value.trim().length > 0 || pendingFiles.value.length > 0;
});

const placeholderText = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return 'Escribe un mensaje...';
  }
  return `Escribe a ${authStore.peerUser?.name || 'equipo'}... (Markdown, código y pegar capturas con Ctrl+V)`;
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFilesSelected(event) {
  const files = Array.from(event.target.files || []);
  if (files.length > 0) {
    pendingFiles.value.push(...files);
  }
  event.target.value = '';
}

function removeFile(index) {
  pendingFiles.value.splice(index, 1);
}

function addDroppedFiles(files) {
  if (files && files.length > 0) {
    pendingFiles.value.push(...files);
  }
}

function handlePaste(e) {
  const clipboardItems = e.clipboardData?.items;
  if (!clipboardItems) return;

  for (let i = 0; i < clipboardItems.length; i++) {
    const item = clipboardItems[i];
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (blob) {
        const screenshotFile = new File([blob], `Captura_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.png`, {
          type: blob.type
        });
        pendingFiles.value.push(screenshotFile);
      }
    }
  }
}

function insertEmoji(emoji) {
  text.value += emoji + ' ';
  showEmojiBar.value = false;
  textareaRef.value?.focus();
}

function adjustHeight() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

function onInput() {
  adjustHeight();
  chatStore.emitTyping();
}

// Al empezar a editar: cargar el texto del mensaje en el cuadro y enfocar
let draftBeforeEdit = '';
watch(() => chatStore.editingMessage, (msg, previous) => {
  if (msg) {
    if (!previous) draftBeforeEdit = text.value;
    text.value = msg.content;
    nextTick(() => {
      adjustHeight();
      const el = textareaRef.value;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  } else if (previous) {
    text.value = draftBeforeEdit;
    draftBeforeEdit = '';
    nextTick(adjustHeight);
  }
});

function cancelEditing() {
  chatStore.cancelEdit();
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
    return;
  }
  if (e.key === 'Escape' && chatStore.editingMessage) {
    e.preventDefault();
    cancelEditing();
    return;
  }
  // Flecha arriba con el cuadro vacío: editar tu último mensaje (como WhatsApp Web)
  if (e.key === 'ArrowUp' && !text.value && pendingFiles.value.length === 0) {
    chatStore.editLastOwnMessage();
  }
}

async function submit() {
  if (chatStore.editingMessage) {
    const newText = text.value;
    draftBeforeEdit = '';
    text.value = '';
    await chatStore.saveEdit(newText);
    nextTick(adjustHeight);
    return;
  }
  if (!canSend.value) return;

  const contentToSend = text.value;
  const filesToSend = [...pendingFiles.value];

  text.value = '';
  pendingFiles.value = [];
  showEmojiBar.value = false;
  chatStore.clearMyTyping();

  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
    }
  });

  await chatStore.sendMessage(contentToSend, filesToSend);
}

defineExpose({
  addDroppedFiles
});
</script>
