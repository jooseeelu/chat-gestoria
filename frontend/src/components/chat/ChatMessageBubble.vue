<template>
  <div 
    :id="'msg-' + message.id"
    class="group relative transition-all duration-150 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
    :class="[
      isConsecutive ? 'mt-0.5' : 'mt-3 sm:mt-3.5',
      isCurrentUser ? 'hover:border-l-2 hover:border-amber-500' : ''
    ]"
  >
    <!-- Backdrop invisible para cerrar acciones en móvil al tocar fuera -->
    <div 
      v-if="isMobileActionsOpen" 
      class="fixed inset-0 z-10 sm:hidden" 
      @click="isMobileActionsOpen = false"
    ></div>

    <!-- BARRA FLOTANTE DE ACCIONES RÁPIDAS (Hover en PC / Botón en móvil) -->
    <div 
      class="absolute right-2 sm:right-3 -top-3.5 transition-all duration-150 z-20 flex items-center gap-0.5 bg-white dark:bg-slate-800 px-2 py-1 sm:px-1.5 sm:py-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-md"
      :class="isMobileActionsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto'"
    >
      <!-- Reacciones Rápidas -->
      <button 
        v-for="emoji in quickEmojis" 
        :key="emoji"
        @click="chatStore.toggleReaction(message.id, emoji); isMobileActionsOpen = false"
        class="px-1.5 py-0.5 text-sm sm:text-xs hover:scale-125 transition-transform rounded cursor-pointer"
        :title="'Reaccionar con ' + emoji"
      >
        {{ emoji }}
      </button>

      <span class="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-1"></span>

      <!-- Responder / Citar -->
      <button 
        @click="chatStore.setReply(message); isMobileActionsOpen = false"
        class="p-1.5 sm:p-1 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        title="Responder / Citar"
      >
        <Reply class="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>

      <!-- Copiar texto -->
      <button 
        v-if="message.content"
        @click="copyText(); isMobileActionsOpen = false"
        class="p-1.5 sm:p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        title="Copiar contenido"
      >
        <Check v-if="copied" class="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-500" />
        <Copy v-else class="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>

      <!-- Eliminar (solo el autor o admin) -->
      <button 
        v-if="canDelete"
        @click="chatStore.deleteMessage(message.id); isMobileActionsOpen = false"
        class="p-1.5 sm:p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        title="Eliminar mensaje"
      >
        <Trash2 class="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>

    <!-- MODO MENSAJE PRINCIPAL (Con Avatar y Cabecera) -->
    <div v-if="!isConsecutive" class="flex gap-2.5 sm:gap-3">
      <!-- Avatar -->
      <div class="relative flex-shrink-0 pt-0.5">
        <img
          :src="message.sender.avatar || initialsAvatar(message.sender.name)"
          :alt="message.sender.name"
          @error="$event.target.src = initialsAvatar(message.sender.name)"
          class="w-9 h-9 sm:w-8 sm:h-8 rounded-xl object-cover ring-1 ring-slate-300 dark:ring-slate-700"
        />
        <span
          v-if="message.sender.status === 'online'"
          class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
        ></span>
      </div>

      <!-- Contenido Principal -->
      <div class="min-w-0 flex-1">
        <!-- Cabecera -->
        <div class="flex items-center justify-between sm:justify-start gap-2 mb-1">
          <div class="flex items-center gap-2">
            <span class="text-sm sm:text-xs font-bold text-slate-900 dark:text-slate-100">
              {{ message.sender.name }}
            </span>
            <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              IT
            </span>
            <span class="text-xs sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              {{ formatTimeOnly(message.created) }}
            </span>
            <span v-if="statusLabel" class="text-[11px] font-medium" :class="message.status === 'failed' ? 'text-rose-500' : 'text-slate-400'">
              {{ statusLabel }}
            </span>
          </div>

          <!-- Botón de acciones para móvil (···) -->
          <button 
            @click.stop="isMobileActionsOpen = !isMobileActionsOpen"
            class="sm:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            title="Opciones de mensaje"
          >
            <MoreHorizontal class="w-4 h-4" />
          </button>
        </div>

        <!-- Cita/Respuesta a otro mensaje -->
        <div 
          v-if="message.reply_to"
          class="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 pl-2.5 pr-3 py-1.5 rounded-lg border-l-2 border-amber-500 max-w-lg truncate"
        >
          <CornerDownRight class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span class="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
            {{ message.reply_to.senderName }}:
          </span>
          <span class="truncate italic text-[11px]">{{ message.reply_to.snippet }}</span>
        </div>

        <!-- Texto renderizado (Tipografía cómoda y legible para móvil) -->
        <div class="text-[15px] sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed break-words whitespace-pre-wrap font-normal">
          <span v-html="formattedContent"></span>
        </div>

        <!-- Archivos Adjuntos -->
        <div 
          v-if="message.attachments && message.attachments.length > 0" 
          class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl"
        >
          <SmartFileCard 
            v-for="att in message.attachments" 
            :key="att.id || att.filename" 
            :file="att" 
          />
        </div>

        <!-- Pills de Reacciones -->
        <div v-if="hasReactions" class="flex flex-wrap gap-1.5 mt-2">
          <button 
            v-for="(users, emoji) in message.reactions" 
            :key="emoji"
            @click="chatStore.toggleReaction(message.id, emoji)"
            class="flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full text-xs border transition-all duration-150 cursor-pointer"
            :class="users.includes(authStore.currentUser?.id)
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400 font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'"
          >
            <span class="text-sm sm:text-xs">{{ emoji }}</span>
            <span class="font-mono text-xs sm:text-[11px] font-semibold">{{ users.length }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- MODO MENSAJE CONSECUTIVO (Agrupado estilo Slack/Linear sin repetir avatar) -->
    <div v-else class="flex gap-2.5 sm:gap-3 pl-10 sm:pl-11">
      <!-- Hora sutil que solo aparece al pasar el ratón en la izquierda en PC -->
      <span class="hidden sm:inline absolute left-3 top-2 text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none">
        {{ formatTimeOnly(message.created) }}
      </span>

      <div class="min-w-0 flex-1">
        <!-- Cita/Respuesta -->
        <div 
          v-if="message.reply_to"
          class="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 pl-2.5 pr-3 py-1.5 rounded-lg border-l-2 border-amber-500 max-w-lg truncate"
        >
          <CornerDownRight class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span class="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
            {{ message.reply_to.senderName }}:
          </span>
          <span class="truncate italic text-[11px]">{{ message.reply_to.snippet }}</span>
        </div>

        <div class="flex items-start justify-between gap-2">
          <!-- Texto renderizado -->
          <div class="text-[15px] sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed break-words whitespace-pre-wrap font-normal flex-1">
            <span v-html="formattedContent"></span>
            <span v-if="statusLabel" class="ml-2 text-[11px] font-medium" :class="message.status === 'failed' ? 'text-rose-500' : 'text-slate-400'">
              {{ statusLabel }}
            </span>
          </div>

          <!-- Botón de acciones para móvil en consecutivos (···) -->
          <button 
            @click.stop="isMobileActionsOpen = !isMobileActionsOpen"
            class="sm:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer flex-shrink-0"
            title="Opciones de mensaje"
          >
            <MoreHorizontal class="w-4 h-4" />
          </button>
        </div>

        <!-- Archivos Adjuntos -->
        <div 
          v-if="message.attachments && message.attachments.length > 0" 
          class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl"
        >
          <SmartFileCard 
            v-for="att in message.attachments" 
            :key="att.id || att.filename" 
            :file="att" 
          />
        </div>

        <!-- Pills de Reacciones -->
        <div v-if="hasReactions" class="flex flex-wrap gap-1.5 mt-2">
          <button 
            v-for="(users, emoji) in message.reactions" 
            :key="emoji"
            @click="chatStore.toggleReaction(message.id, emoji)"
            class="flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full text-xs border transition-all duration-150 cursor-pointer"
            :class="users.includes(authStore.currentUser?.id)
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400 font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'"
          >
            <span class="text-sm sm:text-xs">{{ emoji }}</span>
            <span class="font-mono text-xs sm:text-[11px] font-semibold">{{ users.length }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  Reply, 
  Trash2, 
  Copy, 
  Check, 
  CornerDownRight,
  MoreHorizontal
} from 'lucide-vue-next';
import { formatTimeOnly } from '@/utils/formatters';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import SmartFileCard from './SmartFileCard.vue';
import { initialsAvatar } from '@/api/pocketbase';

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isConsecutive: {
    type: Boolean,
    default: false
  }
});

const authStore = useAuthStore();
const chatStore = useChatStore();

const copied = ref(false);
const isMobileActionsOpen = ref(false);
const quickEmojis = ['👍', '🚀', '👀', '❤️', '🔥'];

const isCurrentUser = computed(() => {
  const myId = authStore.currentUser?.id;
  return !!myId && myId === props.message.sender?.id;
});

const statusLabel = computed(() => {
  switch (props.message.status) {
    case 'sending': return 'Enviando…';
    case 'uploading': return 'Subiendo archivos…';
    case 'failed': return 'No enviado: revisa la conexión';
    default: return '';
  }
});

const canDelete = computed(() => {
  return isCurrentUser.value || authStore.currentUser?.role === 'admin';
});

const hasReactions = computed(() => {
  if (!props.message.reactions) return false;
  return Object.keys(props.message.reactions).length > 0;
});

/**
 * Formateador de Markdown simple (código entre backticks, negrita y enlaces)
 */
const formattedContent = computed(() => {
  if (!props.message.content) return '';
  let text = props.message.content;

  // Escapar HTML (incluidas comillas: si no, una URL podía inyectar atributos en el <a>)
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Inline code: `código`
  text = text.replace(/`([^`]+)`/g, '<code class="font-mono text-[13px] sm:text-[12px] bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-300 border border-slate-300/60 dark:border-slate-700/80">$1</code>');

  // Bold: **texto**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');

  // URLs automáticas
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-500 break-all">$1</a>');

  return text;
});

function copyText() {
  if (!props.message.content) return;
  navigator.clipboard.writeText(props.message.content);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
}
</script>
