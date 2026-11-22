<template>
  <div
    :id="'msg-' + message.id"
    class="msg-bubble group relative px-1 sm:px-2 py-0.5 rounded-xl transition-colors duration-150"
    :class="[
      isConsecutive ? 'mt-0.5' : 'mt-2.5',
      isSelected ? 'bg-amber-500/15 dark:bg-amber-500/20' : '',
      chatStore.selectionMode ? 'cursor-pointer' : ''
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

    <div class="flex items-end gap-2" :class="isCurrentUser ? 'flex-row-reverse' : ''">
      <!-- Círculo de selección -->
      <div v-if="chatStore.selectionMode" class="flex-shrink-0 self-center" :class="isCurrentUser ? 'mr-auto' : ''">
        <span
          class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
          :class="isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'"
        >
          <Check v-if="isSelected" class="w-3 h-3 stroke-[3]" />
        </span>
      </div>

      <!-- Avatar de los demás (solo en el primer mensaje del grupo) -->
      <div v-if="!isCurrentUser" class="relative flex-shrink-0 w-8 self-start">
        <template v-if="!isConsecutive">
          <img
            :src="message.sender.avatar || initialsAvatar(message.sender.name)"
            :alt="message.sender.name"
            @error="$event.target.src = initialsAvatar(message.sender.name)"
            class="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            draggable="false"
          />
          <span
            v-if="authStore.isUserOnline(message.sender.id)"
            class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#070e1b]"
          ></span>
        </template>
      </div>

      <!-- BURBUJA -->
      <div
        class="relative min-w-0 max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] flex flex-col"
        :class="isCurrentUser ? 'items-end' : 'items-start'"
      >
        <!-- Acciones rápidas (solo PC, al pasar el ratón) -->
        <div
          v-if="!chatStore.selectionMode && !message.status"
          class="hidden sm:flex absolute -top-4 z-20 items-center gap-0.5 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          :class="isCurrentUser ? 'right-2' : 'left-2'"
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

        <div
          class="relative px-2.5 pt-1.5 pb-1 rounded-2xl shadow-sm text-[15px] sm:text-sm leading-relaxed"
          :class="[
            isCurrentUser
              ? 'bg-[#fdf3d6] dark:bg-[#3a2f12] text-slate-900 dark:text-amber-50 border border-amber-200/70 dark:border-amber-900/60'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/70',
            !isConsecutive ? (isCurrentUser ? 'rounded-tr-md' : 'rounded-tl-md') : '',
            message.status === 'failed' ? '!border-rose-400' : ''
          ]"
        >
          <!-- Nombre (de los demás, en el primer mensaje del grupo) -->
          <div v-if="!isCurrentUser && !isConsecutive" class="text-xs font-bold text-amber-700 dark:text-amber-400 mb-0.5">
            {{ message.sender.name }}
          </div>

          <!-- Reenviado -->
          <div v-if="message.forwarded" class="flex items-center gap-1 text-[11px] italic text-slate-500 dark:text-slate-400 mb-0.5">
            <Forward class="w-3 h-3" />
            <span>Reenviado</span>
          </div>

          <!-- Cita: al tocarla lleva al mensaje original -->
          <button
            v-if="message.reply_to"
            type="button"
            @click.stop="goToReply"
            class="mb-1.5 mt-0.5 flex flex-col items-start w-full text-left text-xs rounded-lg border-l-4 border-amber-500 pl-2 pr-3 py-1 cursor-pointer"
            :class="isCurrentUser ? 'bg-amber-900/5 dark:bg-black/20 hover:bg-amber-900/10' : 'bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200/70 dark:hover:bg-slate-900'"
          >
            <span class="font-bold text-amber-700 dark:text-amber-400">{{ message.reply_to.senderName }}</span>
            <span class="text-slate-600 dark:text-slate-300 line-clamp-2 break-words">{{ message.reply_to.snippet }}</span>
          </button>

          <!-- Adjuntos: las fotos se ven grandes, el resto como tarjeta -->
          <div v-if="message.attachments && message.attachments.length > 0" class="flex flex-col gap-1.5 mb-1 -mx-1 mt-0.5">
            <template v-for="att in message.attachments" :key="att.id || att.filename">
              <button
                v-if="att.file_type === 'image' && att.url && !att.failed"
                type="button"
                @click="openImage(att)"
                class="block rounded-xl overflow-hidden bg-slate-200/60 dark:bg-slate-900/60 cursor-pointer"
              >
                <img
                  :src="att.url"
                  :alt="att.filename"
                  loading="lazy"
                  draggable="false"
                  class="block w-full max-w-[280px] sm:max-w-[320px] max-h-80 object-cover"
                  :class="att.pending ? 'opacity-60' : ''"
                />
              </button>
              <SmartFileCard v-else :file="att" />
            </template>
          </div>

          <!-- Texto + hora/estado (como WhatsApp: abajo a la derecha dentro de la burbuja) -->
          <div class="break-words whitespace-pre-wrap">
            <span v-if="message.content" class="msg-text" v-html="formattedContent"></span>
            <span
              class="msg-meta float-right inline-flex items-center gap-1 ml-2.5 mt-1.5 -mb-0.5 text-[11px] leading-none select-none whitespace-nowrap"
              :class="message.status === 'failed' ? 'text-rose-500' : (isCurrentUser ? 'text-amber-800/60 dark:text-amber-100/50' : 'text-slate-400')"
            >
              <span v-if="message.edited_at" class="italic">editado</span>
              <span v-if="statusLabel">{{ statusLabel }}</span>
              <span>{{ formatTimeOnly(message.created) }}</span>
              <template v-if="isCurrentUser">
                <Clock v-if="message.status === 'sending' || message.status === 'uploading'" class="w-3.5 h-3.5" />
                <AlertCircle v-else-if="message.status === 'failed'" class="w-3.5 h-3.5" />
                <span v-else-if="isReadByOthers" :title="readByTitle" class="inline-flex"><CheckCheck class="w-4 h-4 text-sky-500" /></span>
                <span v-else title="Enviado" class="inline-flex"><Check class="w-3.5 h-3.5" /></span>
              </template>
            </span>
          </div>
        </div>

        <!-- Reacciones (pegadas bajo la burbuja) -->
        <div v-if="hasReactions" class="flex flex-wrap gap-1 -mt-1.5 relative z-10 px-2">
          <button
            v-for="(users, emoji) in message.reactions"
            :key="emoji"
            @click.stop="!chatStore.selectionMode && chatStore.toggleReaction(message.id, emoji)"
            class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border shadow-sm transition-all duration-150 cursor-pointer"
            :class="users.includes(authStore.currentUser?.id)
              ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-400/60 text-amber-800 dark:text-amber-200 font-bold'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
            :title="reactionTitle(users)"
          >
            <span>{{ emoji }}</span>
            <span v-if="users.length > 1" class="font-mono text-[11px] font-semibold">{{ users.length }}</span>
          </button>
        </div>
      </div>
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
  Pencil,
  Forward,
  Clock,
  AlertCircle
} from 'lucide-vue-next';
import { formatTimeOnly } from '@/utils/formatters';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useDocumentStore } from '@/stores/documents';
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
const docStore = useDocumentStore();

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

// "Leído por Johan, Vanesa" al pasar el ratón por el doble check
const readByTitle = computed(() => {
  const me = authStore.currentUser?.id;
  const names = (props.message.read_by || [])
    .filter(id => id !== me)
    .map(id => authStore.teamMembers.find(u => u.id === id)?.name)
    .filter(Boolean);
  return names.length ? `Leído por ${names.join(', ')}` : 'Leído';
});

function reactionTitle(userIds) {
  return userIds.map(id => authStore.teamMembers.find(u => u.id === id)?.name || 'Alguien').join(', ');
}

// Abrir la foto en el visor
function openImage(att) {
  if (att.pending) return;
  docStore.setPreviewFile(att);
}

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
