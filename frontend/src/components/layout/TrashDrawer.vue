<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="chatStore.isTrashOpen" class="fixed inset-0 z-40 bg-slate-950/40" @click="chatStore.closeTrash()"></div>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="chatStore.isTrashOpen"
        class="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md pt-safe bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-100"
      >
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Trash2 class="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 class="text-sm font-bold">Papelera</h2>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Se vacía sola a los 30 días</p>
            </div>
          </div>
          <button @click="chatStore.closeTrash()" class="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <div v-if="chatStore.trashLoading && chatStore.trashItems.length === 0" class="py-12 text-center text-slate-400 text-xs">
            Cargando…
          </div>
          <div v-else-if="chatStore.trashItems.length === 0" class="py-12 text-center text-slate-400">
            <Trash2 class="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p class="text-xs font-medium">La papelera está vacía</p>
          </div>

          <div
            v-for="msg in chatStore.trashItems"
            :key="msg.id"
            class="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50"
          >
            <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span class="font-bold text-slate-700 dark:text-slate-200">{{ msg.sender.name }}</span>
              <span>·</span>
              <span class="truncate">{{ msg.channelName }}</span>
              <span class="ml-auto flex-shrink-0">{{ formatTimestamp(msg.created) }}</span>
            </div>
            <p v-if="msg.content" class="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words line-clamp-4">{{ msg.content }}</p>
            <div v-if="msg.attachments.length" class="mt-1.5 flex flex-wrap gap-1.5">
              <span
                v-for="att in msg.attachments"
                :key="att.id"
                class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <Paperclip class="w-3 h-3" />
                <span class="max-w-[180px] truncate">{{ att.filename }}</span>
              </span>
            </div>
            <div class="mt-2.5 flex items-center justify-end gap-2">
              <button
                @click="chatStore.purgeMessages([msg.id])"
                class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10 cursor-pointer"
              >
                Eliminar para siempre
              </button>
              <button
                @click="chatStore.restoreMessages([msg.id])"
                class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                <Undo2 class="w-3.5 h-3.5" />
                Restaurar
              </button>
            </div>
          </div>
        </div>

        <div v-if="chatStore.trashItems.length > 0" class="p-3 border-t border-slate-200 dark:border-slate-800 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            v-if="!confirmEmpty"
            @click="confirmEmpty = true"
            class="w-full py-2.5 rounded-xl text-sm font-semibold text-rose-600 border border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
          >
            Vaciar papelera
          </button>
          <div v-else class="flex gap-2">
            <button @click="confirmEmpty = false" class="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer">
              Cancelar
            </button>
            <button @click="empty" class="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">
              Sí, borrar {{ chatStore.trashItems.length }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Trash2, X, Undo2, Paperclip } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { formatTimestamp } from '@/utils/formatters';

const chatStore = useChatStore();
const confirmEmpty = ref(false);

watch(() => chatStore.isTrashOpen, () => {
  confirmEmpty.value = false;
});

async function empty() {
  confirmEmpty.value = false;
  await chatStore.emptyTrash();
}
</script>
