<template>
  <div class="flex h-[100dvh] w-screen overflow-hidden bg-slate-50 dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 transition-colors duration-200">
    
    <!-- Sidebar de Canales y Equipo (Desktop) -->
    <div class="hidden lg:block h-full">
      <SidebarChannels />
    </div>

    <!-- Sidebar Móvil (Drawer con animación fluida) -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-x-full"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 -translate-x-full"
    >
      <div 
        v-if="isMobileSidebarOpen"
        class="fixed inset-0 z-50 lg:hidden flex"
      >
        <div 
          class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          @click="isMobileSidebarOpen = false"
        ></div>
        <div class="relative z-10 w-80 max-w-[85vw] h-full shadow-2xl">
          <SidebarChannels @close-sidebar="isMobileSidebarOpen = false" />
        </div>
      </div>
    </Transition>

    <!-- Área Principal de Chat -->
    <main class="flex-1 flex flex-col h-full min-w-0 relative">
      <!-- Barra Superior -->
      <AppHeader 
        @open-command="openCommandPalette"
        @toggle-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
      />

      <!-- Ventana de Chat con Drag & Drop y feed de mensajes -->
      <ChatWindow />

      <!-- Bóveda de Documentos (Slide-over panel retráctil) -->
      <DocumentVaultDrawer />

      <!-- Visor de Archivos (Lightbox Modal) -->
      <FileLightbox />

      <!-- Command Palette flotante (Ctrl + K / Raycast style) -->
      <CommandPalette ref="commandPaletteRef" />

      <!-- Modal de Ajustes de Cuenta y Contraseña -->
      <ChangePasswordModal />

      <!-- Modal de Confirmación de Cierre de Sesión -->
      <LogoutConfirmModal />

      <!-- Avisos breves (notificaciones, instalación...) -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="pwaStore.toast"
          class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-md flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm"
          :class="{
            'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-500/30 text-emerald-800 dark:text-emerald-200': pwaStore.toast.kind === 'success',
            'bg-rose-50 dark:bg-rose-950/90 border-rose-500/30 text-rose-800 dark:text-rose-200': pwaStore.toast.kind === 'error',
            'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100': pwaStore.toast.kind === 'info'
          }"
        >
          <span class="flex-1">{{ pwaStore.toast.text }}</span>
          <button
            v-if="pwaStore.toast.action"
            @click="runToastAction"
            class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex-shrink-0 cursor-pointer"
          >
            {{ pwaStore.toast.action.label }}
          </button>
          <button @click="pwaStore.toast = null" class="p-1 opacity-60 hover:opacity-100 flex-shrink-0 cursor-pointer" title="Cerrar">
            <X class="w-4 h-4" />
          </button>
        </div>
      </Transition>
    </main>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { X } from 'lucide-vue-next';
import { usePwaStore } from '@/stores/pwa';
import SidebarChannels from '@/components/layout/SidebarChannels.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import ChatWindow from '@/components/chat/ChatWindow.vue';
import DocumentVaultDrawer from '@/components/layout/DocumentVaultDrawer.vue';
import FileLightbox from '@/components/chat/FileLightbox.vue';
import CommandPalette from '@/components/command/CommandPalette.vue';
import ChangePasswordModal from '@/components/ui/ChangePasswordModal.vue';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal.vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';

const chatStore = useChatStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const pwaStore = usePwaStore();
const commandPaletteRef = ref(null);
const isMobileSidebarOpen = ref(false);

function openCommandPalette() {
  commandPaletteRef.value?.open();
}

function runToastAction() {
  const action = pwaStore.toast?.action;
  pwaStore.toast = null;
  action?.run();
}

// Al tocar una notificación con la app ya abierta, el service worker pide abrir ese canal
function handleServiceWorkerMessage(event) {
  if (event.data?.type === 'open-channel') {
    chatStore.openChannel(event.data.channel);
  }
}

onMounted(async () => {
  await authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.replace('/login');
    return;
  }
  await chatStore.fetchChannels();

  // Abierto desde una notificación: /?channel=ID
  const channelFromUrl = route.query.channel;
  if (channelFromUrl) {
    chatStore.openChannel(String(channelFromUrl));
    router.replace({ query: {} });
  }

  chatStore.subscribeRealtime();
  chatStore.startPolling();
  navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
  pwaStore.syncPush();
});

onUnmounted(() => {
  chatStore.stopPolling();
  chatStore.unsubscribeRealtime();
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
});
</script>
