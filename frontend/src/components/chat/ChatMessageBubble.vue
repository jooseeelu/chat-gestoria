<template>
  <div 
    :id="'msg-' + message.id"
    class="group relative transition-all duration-150 rounded-xl px-3 py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
    :class="[
      isConsecutive ? 'mt-0.5' : 'mt-3.5',
      isCurrentUser ? 'hover:border-l-2 hover:border-brand-500' : ''
    ]"
  >
    <!-- BARRA FLOTANTE DE ACCIONES RÁPIDAS (Hover Senior UX) -->
    <div 
      class="absolute right-3 -top-3.5 opacity-0 group-hover:opacity-100 transition-all duration-150 z-20 flex items-center gap-0.5 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-md"
    >
      <!-- Reacciones Rápidas -->
      <button 
        v-for="emoji in quickEmojis" 
        :key="emoji"
        @click="chatStore.toggleReaction(message.id, emoji)"
        class="px-1 py-0.5 text-xs hover:scale-125 transition-transform rounded"
        :title="'Reaccionar con ' + emoji"
      >
        {{ emoji }}
      </button>

      <span class="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 mx-1"></span>

      <!-- Responder / Citar -->
      <button 
        @click="chatStore.setReply(message)"
        class="p-1 text-slate-400 hover:text-brand-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Responder / Citar"
      >
        <Reply class="w-3.5 h-3.5" />
      </button>

      <!-- Copiar texto -->
      <button 
        v-if="message.content"
        @click="copyText"
        class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Copiar contenido"
      >
        <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-500" />
        <Copy v-else class="w-3.5 h-3.5" />
      </button>

      <!-- Eliminar -->
      <button 
        @click="chatStore.deleteMessage(message.id)"
        class="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Eliminar mensaje"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- MODO MENSAJE PRINCIPAL (Con Avatar y Cabecera) -->
    <div v-if="!isConsecutive" class="flex gap-3">
      <!-- Avatar -->
      <div class="relative flex-shrink-0 pt-0.5">
        <img 
          :src="message.sender.avatar" 
          :alt="message.sender.name"
          class="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-700"
        />
        <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
      </div>

      <!-- Contenido Principal -->
      <div class="min-w-0 flex-1">
        <!-- Cabecera -->
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-slate-900 dark:text-slate-100">
            {{ message.sender.name }}
          </span>
          <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
            IT
          </span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {{ formatTimeOnly(message.created) }}
          </span>
        </div>

        <!-- Cita/Respuesta a otro mensaje -->
        <div 
          v-if="message.reply_to"
          class="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 pl-2 pr-3 py-1 rounded-lg border-l-2 border-brand-500 max-w-lg truncate"
        >
          <CornerDownRight class="w-3 h-3 text-brand-500 flex-shrink-0" />
          <span class="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
            {{ message.reply_to.senderName }}:
          </span>
          <span class="truncate italic text-[11px]">{{ message.reply_to.snippet }}</span>
        </div>

        <!-- Texto renderizado -->
        <div class="text-sm text-slate-800 dark:text-slate-100 leading-relaxed break-words whitespace-pre-wrap font-normal">
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
        <div v-if="hasReactions" class="flex flex-wrap gap-1 mt-2">
          <button 
            v-for="(users, emoji) in message.reactions" 
            :key="emoji"
            @click="chatStore.toggleReaction(message.id, emoji)"
            class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-150"
            :class="users.includes(authStore.currentUser?.id)
              ? 'bg-brand-500/15 border-brand-500/40 text-brand-600 dark:text-brand-400 font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'"
          >
            <span>{{ emoji }}</span>
            <span class="font-mono text-[11px]">{{ users.length }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- MODO MENSAJE CONSECUTIVO (Agrupado estilo Slack/Linear sin repetir avatar) -->
    <div v-else class="flex gap-3 pl-11">
      <!-- Hora sutil que solo aparece al pasar el ratón en la izquierda -->
      <span class="absolute left-3 top-2 text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none">
        {{ formatTimeOnly(message.created) }}
      </span>

      <div class="min-w-0 flex-1">
        <!-- Cita/Respuesta -->
        <div 
          v-if="message.reply_to"
          class="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 pl-2 pr-3 py-1 rounded-lg border-l-2 border-brand-500 max-w-lg truncate"
        >
          <CornerDownRight class="w-3 h-3 text-brand-500 flex-shrink-0" />
          <span class="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
            {{ message.reply_to.senderName }}:
          </span>
          <span class="truncate italic text-[11px]">{{ message.reply_to.snippet }}</span>
        </div>

        <!-- Texto -->
        <div class="text-sm text-slate-800 dark:text-slate-100 leading-relaxed break-words whitespace-pre-wrap font-normal">
          <span v-html="formattedContent"></span>
        </div>

        <!-- Archivos Adjuntos -->
        <div 
          v-if="message.attachments && message.attachments.length > 0" 
          class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl"
        >
          <SmartFileCard 
            v-for="att in message.attachments" 
            :key="att.id || att.filename" 
            :file="att" 
          />
        </div>

        <!-- Pills de Reacciones -->
        <div v-if="hasReactions" class="flex flex-wrap gap-1 mt-1.5">
          <button 
            v-for="(users, emoji) in message.reactions" 
            :key="emoji"
            @click="chatStore.toggleReaction(message.id, emoji)"
            class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-150"
            :class="users.includes(authStore.currentUser?.id)
              ? 'bg-brand-500/15 border-brand-500/40 text-brand-600 dark:text-brand-400 font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'"
          >
            <span>{{ emoji }}</span>
            <span class="font-mono text-[11px]">{{ users.length }}</span>
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
  Copy, 
  Check, 
  Trash2, 
  CornerDownRight 
} from 'lucide-vue-next';
import { formatTimeOnly } from '@/utils/formatters';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import SmartFileCard from './SmartFileCard.vue';

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
const quickEmojis = ['👍', '🚀', '👀', '❤️', '🔥'];

const isCurrentUser = computed(() => {
  return props.message.sender.id === authStore.currentUser?.id ||
         props.message.sender.name === authStore.currentUser?.name;
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

  // Escapar HTML básico
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Inline code: `código`
  text = text.replace(/`([^`]+)`/g, '<code class="font-mono text-[12px] bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-300 border border-slate-300/60 dark:border-slate-700/80">$1</code>');

  // Bold: **texto**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');

  // URLs automáticas
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-500 underline underline-offset-2 hover:text-brand-400 break-all">$1</a>');

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
