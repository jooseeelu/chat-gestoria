<template>
  <!-- Barra de selección estilo WhatsApp: tapa la cabecera mientras hay mensajes seleccionados -->
  <div class="absolute inset-x-0 top-0 z-30 h-16 px-2 sm:px-4 flex items-center gap-1 sm:gap-2 bg-white dark:bg-[#0b1329] border-b border-amber-500/40 shadow-sm animate-fade-in-up">
    <button @click="chatStore.clearSelection()" class="bar-btn" title="Cancelar selección (Esc)">
      <X class="w-5 h-5" />
    </button>
    <span class="text-sm font-bold text-slate-900 dark:text-white mr-auto tabular-nums">
      {{ count }} <span class="hidden sm:inline font-medium text-slate-500 dark:text-slate-400">{{ count === 1 ? 'seleccionado' : 'seleccionados' }}</span>
    </span>

    <!-- Reacción rápida (con un solo mensaje) -->
    <div v-if="single" class="hidden min-[400px]:flex items-center gap-0.5 mr-1 px-1.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
      <button
        v-for="emoji in quickEmojis"
        :key="emoji"
        @click="react(emoji)"
        class="px-1 text-base hover:scale-125 transition-transform cursor-pointer"
      >
        {{ emoji }}
      </button>
    </div>

    <button v-if="single" @click="reply" class="bar-btn" title="Responder">
      <Reply class="w-5 h-5" />
    </button>
    <button v-if="single && chatStore.canEdit(single)" @click="edit" class="bar-btn" title="Editar">
      <Pencil class="w-5 h-5" />
    </button>
    <button v-if="single && single.content" @click="textSheetOpen = true" class="bar-btn" title="Seleccionar texto">
      <TextSelect class="w-5 h-5" />
    </button>
    <button v-if="hasText" @click="chatStore.copySelected()" class="bar-btn" title="Copiar">
      <Copy class="w-5 h-5" />
    </button>
    <button @click="chatStore.startForward(chatStore.selectedIds)" class="bar-btn" title="Reenviar">
      <Forward class="w-5 h-5" />
    </button>
    <button v-if="canDeleteAll" @click="chatStore.deleteMessages(chatStore.selectedIds)" class="bar-btn hover:!text-rose-500" title="Mover a la papelera">
      <Trash2 class="w-5 h-5" />
    </button>

    <!-- Hoja para seleccionar partes del texto (en móvil mantener pulsado selecciona el mensaje) -->
    <Teleport to="body">
      <div
        v-if="textSheetOpen && single"
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm"
        @click.self="closeTextSheet"
      >
        <div class="w-full sm:max-w-lg max-h-[75vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)]">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <span class="text-sm font-bold text-slate-900 dark:text-white">Seleccionar texto</span>
            <button @click="closeTextSheet" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>
          <p class="text-[11px] text-slate-400 px-4 pt-3">Mantén pulsado y arrastra para elegir las palabras que quieras copiar.</p>
          <div class="selectable-sheet flex-1 overflow-y-auto px-4 py-3 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">{{ single.content }}</div>
          <div class="p-3 border-t border-slate-200 dark:border-slate-800">
            <button @click="copyAll" class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">
              Copiar todo
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { X, Reply, Pencil, Copy, Forward, Trash2, TextSelect } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { usePwaStore } from '@/stores/pwa';

const chatStore = useChatStore();
const pwaStore = usePwaStore();

const quickEmojis = ['👍', '❤️', '😂', '🙏', '🔥'];
const textSheetOpen = ref(false);

const count = computed(() => chatStore.selectedIds.length);
const single = computed(() => (chatStore.selectedMessages.length === 1 ? chatStore.selectedMessages[0] : null));
const hasText = computed(() => chatStore.selectedMessages.some(m => m.content || m.attachments?.length));
const canDeleteAll = computed(() => chatStore.selectedMessages.length > 0 && chatStore.selectedMessages.every(m => chatStore.canModify(m)));

function react(emoji) {
  chatStore.toggleReaction(single.value.id, emoji);
  chatStore.clearSelection();
}

function reply() {
  chatStore.setReply(single.value);
  chatStore.clearSelection();
}

function edit() {
  chatStore.startEdit(single.value);
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(single.value.content);
    pwaStore.showToast('Copiado', 'success', 1800);
  } catch (_) {}
  closeTextSheet();
}

function closeTextSheet() {
  textSheetOpen.value = false;
  chatStore.clearSelection();
}
</script>

<style scoped>
.bar-btn {
  @apply p-2.5 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0;
}

/* Aquí sí se puede seleccionar texto también en móvil */
.selectable-sheet {
  -webkit-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
}
</style>
