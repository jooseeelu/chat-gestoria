<template>
  <div
    :id="'msg-' + message.id"
    class="msg-bubble group relative rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 transition-colors duration-150"
    :class="[
      isConsecutive ? 'mt-0.5' : 'mt-3 sm:mt-3.5',
      isSelected
        ? 'bg-amber-500/15 dark:bg-amber-500/20'
        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40',
      chatStore.selectionMode ? 'cursor-pointer' : '',
      isCurrentUser && !chatStore.selectionMode ? 'hover:border-l-2 hover:border-amber-500' : ''
    ]"
    :style="swipeX ? { transform: `translateX(${swipeX}px)`, transition: 'none' } : null"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @click.capture="onClickCapture"
    @contextmenu="onContextMenu"
  >
    <!-- Icono de "responder" que asoma al deslizar a la derecha (móvil) -->
    <div
      v-if="swipeX > 8"
      class="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-600"
      :style="{ opacity: Math.min(1, swipeX / SWIPE_REPLY_PX) }"
    >
      <Reply class="w-4 h-4" />
    </div>

    <!-- BARRA FLOTANTE DE ACCIONES RÁPIDAS (solo PC, al pasar el ratón) -->
    <div
      v-if="!chatStore.selectionMode && !message.status"
      class="hidden sm:flex absolute right-3 -top-3.5 transition-all duration-150 z-20 items-center gap-0.5 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md opacity-0 group-hover:opacity-100"
    >
      <button
        v-for="emoji in quickEmojis"
        :key="emoji"
        @click.stop="chatStore.toggleReaction(message.id, emoji)"
        class="px-1.5 py-0.5 text-xs hover:scale-125 transition-transform rounded cursor-pointer"
        :title="'Reaccionar con ' + emoji"
      >
        {{ emoji }}
      </button>

      <span class="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-1"></span>

      <button @click.stop="chatStore.setReply(message)" class="action-btn" title="Responder">
        <Reply class="w-3.5 h-3.5" />
      </button>
      <button v-if="chatStore.canEdit(message)" @click.stop="chatStore.startEdit(message)" class="action-btn" title="Editar">
        <Pencil class="w-3.5 h-3.5" />
      </button>
      <button v-if="message.content" @click.stop="copyText" class="action-btn" title="Copiar texto">
        <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-500" />
        <Copy v-else class="w-3.5 h-3.5" />
      </button>
      <button @click.stop="chatStore.startForward([message.id])" class="action-btn" title="Reenviar">
        <Forward class="w-3.5 h-3.5" />
      </button>
      <button @click.stop="chatStore.toggleSelect(message.id)" class="action-btn" title="Seleccionar">
        <CheckSquare class="w-3.5 h-3.5" />
      </button>
      <button v-if="chatStore.canModify(message)" @click.stop="chatStore.deleteMessage(message.id)" class="action-btn hover:!text-rose-500" title="Mover a la papelera">
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="flex gap-2.5 sm:gap-3">
      <!-- Círculo de selección -->
      <div v-if="chatStore.selectionMode" class="flex-shrink-0 pt-1.5">
        <span
          class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
          :class="isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'"
        >
          <Check v-if="isSelected" class="w-3 h-3 stroke-[3]" />
        </span>
      </div>

      <!-- Avatar (o hueco en mensajes consecutivos) -->
      <div class="relative flex-shrink-0 w-9 sm:w-8" :class="isConsecutive ? '' : 'pt-0.5'">
        <template v-if="!isConsecutive">
          <img
            :src="message.sender.avatar || initialsAvatar(message.sender.name)"
            :alt="message.sender.name"
            @error="$event.target.src = initialsAvatar(message.sender.name)"
            class="w-9 h-9 sm:w-8 sm:h-8 rounded-xl object-cover ring-1 ring-slate-300 dark:ring-slate-700"
            draggable="false"
          />
          <span
            v-if="message.sender.status === 'online'"
            class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
          ></span>
        </template>
        <span
          v-else
          class="hidden sm:inline absolute left-0 top-1 text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none"
        >
          {{ formatTimeOnly(message.created) }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <!-- Cabecera -->
        <div v-if="!isConsecutive" class="flex items-center gap-2 mb-1">
          <span class="text-sm sm:text-xs font-bold text-slate-900 dark:text-slate-100">
            {{ message.sender.name }}
          </span>
          <span class="text-xs sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {{ formatTimeOnly(message.created) }}
          </span>
        </div>

        <!-- Reenviado -->
        <div v-if="message.forwarded" class="flex items-center gap-1 text-[11px] italic text-slate-400 mb-0.5">
          <Forward class="w-3 h-3" />
          <span>Reenviado</span>
        </div>

        <!-- Cita/Respuesta: al tocarla lleva al mensaje original -->
        <button
          v-if="message.reply_to"
          type="button"
          @click.stop="goToReply"
          class="mb-2 flex items-center gap-1.5 text-xs text-left text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 pl-2.5 pr-3 py-1.5 rounded-lg border-l-2 border-amber-500 max-w-lg w-full sm:w-auto truncate cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-800"
        >
          <CornerDownRight class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span class="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
            {{ message.reply_to.senderName }}:
          </span>
          <span class="truncate italic text-[11px]">{{ message.reply_to.snippet }}</span>
        </button>

        <!-- Texto + estado (editado, check, enviando...) -->
        <div class="text-[15px] sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed break-words whitespace-pre-wrap font-normal">
          <span v-if="message.content" class="msg-text" v-html="formattedContent"></span>
          <span class="inline-flex items-center gap-1 ml-2 align-middle text-[11px] select-none" :class="message.status === 'failed' ? 'text-rose-500' : 'text-slate-400'">
            <span v-if="message.edited_at" class="italic">editado</span>
            <span v-if="statusLabel">{{ statusLabel }}</span>
            <template v-if="isCurrentUser">
              <Clock v-if="message.status === 'sending' || message.status === 'uploading'" class="w-3.5 h-3.5" />
              <AlertCircle v-else-if="message.status === 'failed'" class="w-3.5 h-3.5" />
              <CheckCheck v-else-if="isReadByOthers" class="w-4 h-4 text-sky-500" :title="'Leído'" />
              <Check v-else class="w-3.5 h-3.5" :title="'Enviado'" />
            </template>
          </span>
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
            @click.stop="!chatStore.selectionMode && chatStore.toggleReaction(message.id, emoji)"
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

      <!-- Móvil: botón ··· (alternativa a mantener pulsado) -->
      <button
        v-if="!chatStore.selectionMode && !message.status"
        @click.stop="startSelection"
        class="sm:hidden self-start p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer flex-shrink-0"
        title="Opciones de mensaje"
      >
        <MoreHorizontal class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import {
  Reply,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  CheckSquare,
  CornerDownRight,
  MoreHorizontal,
  Pencil,
  Forward,
  Clock,
  AlertCircle
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
const quickEmojis = ['👍', '🚀', '👀', '❤️', '🔥'];

const LONG_PRESS_MS = 450;
const SWIPE_REPLY_PX = 64;
const EDGE_PX = 28; // el borde izquierdo es para abrir el menú lateral

const isCurrentUser = computed(() => {
  const myId = authStore.currentUser?.id;
  return !!myId && myId === props.message.sender?.id;
});

const isSelected = computed(() => chatStore.selectedIds.includes(props.message.id));

const isReadByOthers = computed(() => {
  const me = authStore.currentUser?.id;
  return (props.message.read_by || []).some(id => id !== me);
});

const statusLabel = computed(() => {
  switch (props.message.status) {
    case 'sending': return 'Enviando…';
    case 'uploading': return 'Subiendo archivos…';
    case 'failed': return 'No enviado: revisa la conexión';
    default: return '';
  }
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
  }, 2000);
}

function vibrate(ms) {
  try { navigator.vibrate?.(ms); } catch (_) {}
}

function startSelection() {
  if (props.message.status) return;
  vibrate(25);
  chatStore.toggleSelect(props.message.id);
}

// Ir al mensaje citado y resaltarlo un momento
function goToReply() {
  if (chatStore.selectionMode) {
    chatStore.toggleSelect(props.message.id);
    return;
  }
  const el = document.getElementById('msg-' + props.message.reply_to?.id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('msg-flash');
  setTimeout(() => el.classList.remove('msg-flash'), 1400);
}

// ---------- Gestos táctiles: mantener pulsado y deslizar para responder ----------

const swipeX = ref(0);
let pressTimer = null;
let startX = 0;
let startY = 0;
let gesture = null; // null | 'press' | 'swipe' | 'scroll'
let suppressClick = false;

function clearPressTimer() {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
}

let lastTouchAt = 0;

function onPointerDown(e) {
  if (e.pointerType === 'touch') lastTouchAt = Date.now();
  if (e.pointerType !== 'touch' || props.message.status) return;
  startX = e.clientX;
  startY = e.clientY;
  gesture = 'press';
  clearPressTimer();
  pressTimer = setTimeout(() => {
    if (gesture !== 'press') return;
    gesture = null;
    suppressClick = true;
    startSelection();
  }, LONG_PRESS_MS);
}

function onPointerMove(e) {
  if (e.pointerType !== 'touch' || !gesture) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (gesture === 'press' && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
    clearPressTimer();
    // Deslizar a la derecha = responder (salvo desde el borde, que abre el menú)
    gesture = dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.5 && startX > EDGE_PX && !chatStore.selectionMode
      ? 'swipe'
      : 'scroll';
  }
  if (gesture === 'swipe') {
    swipeX.value = Math.max(0, Math.min(dx, SWIPE_REPLY_PX + 20));
  }
}

function onPointerUp() {
  clearPressTimer();
  if (gesture === 'swipe') {
    if (swipeX.value >= SWIPE_REPLY_PX) {
      vibrate(15);
      chatStore.setReply(props.message);
    }
    suppressClick = true;
  }
  swipeX.value = 0;
  gesture = null;
}

function onPointerCancel() {
  clearPressTimer();
  swipeX.value = 0;
  gesture = null;
}

// En modo selección, tocar el mensaje (o su tarjeta de archivo) lo marca/desmarca
function onClickCapture(e) {
  if (suppressClick) {
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
    return;
  }
  if (chatStore.selectionMode && !props.message.status) {
    e.stopPropagation();
    e.preventDefault();
    chatStore.toggleSelect(props.message.id);
  }
}

// Clic derecho en PC: seleccionar el mensaje (si hay texto marcado, se deja el menú normal de copiar)
function onContextMenu(e) {
  // En Android, mantener pulsado también lanza contextmenu: ya lo gestiona el long-press
  if (e.pointerType === 'touch' || Date.now() - lastTouchAt < 1500) {
    e.preventDefault();
    return;
  }
  if (window.getSelection()?.toString()) return;
  if (props.message.status) return;
  e.preventDefault();
  chatStore.toggleSelect(props.message.id);
}

onBeforeUnmount(clearPressTimer);
</script>

<style scoped>
.action-btn {
  @apply p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer;
}
</style>
