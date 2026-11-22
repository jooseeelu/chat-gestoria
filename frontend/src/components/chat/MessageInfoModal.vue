<template>
  <Teleport to="body">
    <div
      v-if="msg"
      class="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm"
      @click.self="chatStore.closeMessageInfo()"
    >
      <div class="w-full sm:max-w-sm max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)] animate-fade-in-up">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span class="text-sm font-bold text-slate-900 dark:text-white">Info del mensaje</span>
          <button @click="chatStore.closeMessageInfo()" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer" title="Cerrar">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="overflow-y-auto">
          <!-- El mensaje -->
          <div class="px-4 py-3 bg-[#f4f1ea] dark:bg-[#070e1b]">
            <div class="ml-auto max-w-[85%] w-fit px-3 py-2 rounded-2xl rounded-tr-md bg-[#fdf3d6] dark:bg-[#3a2f12] border border-amber-200/70 dark:border-amber-900/60 text-sm text-slate-900 dark:text-amber-50 whitespace-pre-wrap break-words">
              <span v-if="msg.content">{{ msg.content }}</span>
              <span v-else class="italic">📎 {{ msg.attachments.map(a => a.filename).join(', ') || 'Archivo' }}</span>
            </div>
            <p class="text-right text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Enviado {{ formatDayTime(msg.created, authStore.now) }}<template v-if="msg.edited_at"> · editado {{ formatDayTime(msg.edited_at, authStore.now) }}</template>
            </p>
          </div>

          <!-- Leído por -->
          <div class="px-4 pt-4 pb-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 mb-2">
              <CheckCheck class="w-4 h-4" />
              Leído
            </div>
            <div v-for="r in readers" :key="r.user.id" class="flex items-center gap-3 py-2">
              <img :src="r.user.avatar" :alt="r.user.name" class="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ r.user.name }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ r.at ? formatDayTime(r.at, authStore.now) : 'Leído (hora no registrada: mensaje anterior a esta función)' }}
                </p>
              </div>
            </div>
            <p v-if="readers.length === 0" class="text-xs text-slate-400 py-1">Nadie lo ha leído todavía.</p>
          </div>

          <!-- Pendiente -->
          <div v-if="pending.length" class="px-4 pt-2 pb-4 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 mb-2">
              <Check class="w-4 h-4" />
              Sin leer
            </div>
            <div v-for="user in pending" :key="user.id" class="flex items-center gap-3 py-2">
              <img :src="user.avatar" :alt="user.name" class="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 opacity-80" />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{{ user.name }}</p>
                <p class="text-xs text-slate-400">{{ authStore.presenceLabel(user) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { X, Check, CheckCheck } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { formatDayTime } from '@/utils/formatters';
import { useBackToClose } from '@/utils/backStack';

const chatStore = useChatStore();
const authStore = useAuthStore();

// Siempre la versión viva del mensaje (por si alguien lo lee con la ventana abierta)
const msg = computed(() => {
  const info = chatStore.infoMessage;
  if (!info) return null;
  return chatStore.rawMessages.find(m => m.id === info.id) || info;
});

const readers = computed(() => {
  if (!msg.value) return [];
  const receipts = msg.value.read_receipts || {};
  return (msg.value.read_by || [])
    .filter(id => id !== msg.value.sender?.id)
    .map(id => ({
      user: authStore.teamMembers.find(u => u.id === id) || { id, name: 'Usuario', avatar: '' },
      at: receipts[id] || ''
    }))
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
});

const pending = computed(() => {
  if (!msg.value) return [];
  const read = new Set(msg.value.read_by || []);
  return authStore.teamMembers.filter(u => u.id !== msg.value.sender?.id && !read.has(u.id));
});

useBackToClose(() => !!chatStore.infoMessage, () => chatStore.closeMessageInfo());
</script>
