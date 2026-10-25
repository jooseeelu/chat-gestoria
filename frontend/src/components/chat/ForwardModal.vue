<template>
  <Teleport to="body">
    <div
      v-if="chatStore.forwardingIds.length > 0"
      class="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm"
      @click.self="chatStore.cancelForward()"
    >
      <div class="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)] animate-fade-in-up">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span class="text-sm font-bold text-slate-900 dark:text-white block">Reenviar a…</span>
            <span class="text-[11px] text-slate-400">
              {{ chatStore.forwardingIds.length }} {{ chatStore.forwardingIds.length === 1 ? 'mensaje' : 'mensajes' }}
            </span>
          </div>
          <button @click="chatStore.cancelForward()" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="p-2 max-h-[60vh] overflow-y-auto">
          <button
            v-for="channel in chatStore.channels"
            :key="channel.id"
            @click="chatStore.forwardMessages(channel.id)"
            class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span class="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare class="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </span>
            <span class="min-w-0">
              <span class="text-sm font-semibold text-slate-900 dark:text-white block truncate">{{ channel.name }}</span>
              <span class="text-[11px] text-slate-400 block truncate">{{ channel.description }}</span>
            </span>
            <span v-if="channel.id === chatStore.activeChannelId" class="ml-auto text-[10px] font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">ACTUAL</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { X, MessageSquare } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();
</script>
