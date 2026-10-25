<template>
  <div
    class="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 transition-colors duration-200"
    @touchstart.passive="onEdgeTouchStart"
    @touchmove.passive="onEdgeTouchMove"
    @touchend.passive="onEdgeTouchEnd"
  >
    
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
        <div
          class="relative z-10 w-80 max-w-[85vw] h-full shadow-2xl pt-safe bg-white dark:bg-[#0b1329]"
          @touchstart.passive="onDrawerTouchStart"
          @touchend.passive="onDrawerTouchEnd"
        >
          <SidebarChannels @close-sidebar="isMobileSidebarOpen = false" />
        </div>
      </div>
    </Transition>

    <!-- Área Principal de Chat -->
    <main class="flex-1 flex flex-col h-full min-w-0 relative">
      <!-- Barra de selección (tapa la cabecera mientras hay mensajes seleccionados) -->
      <SelectionBar v-if="chatStore.selectionMode" />

      <!-- Barra Superior -->
      <AppHeader
        @open-command="openCommandPalette"
        @toggle-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
      />

      <!-- Ventana de Chat con Drag & Drop y feed de mensajes -->
      <ChatWindow />

      <!-- Bóveda de Documentos (Slide-over panel retráctil) -->
      <DocumentVaultDrawer />

      <!-- Papelera de mensajes -->
      <TrashDrawer />

      <!-- Elegir canal para reenviar -->
      <ForwardModal />

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
import { refreshFileToken } from '@/api/pocketbase';
import SidebarChannels from '@/components/layout/SidebarChannels.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import ChatWindow from '@/components/chat/ChatWindow.vue';
import DocumentVaultDrawer from '@/components/layout/DocumentVaultDrawer.vue';
import FileLightbox from '@/components/chat/FileLightbox.vue';
import CommandPalette from '@/components/command/CommandPalette.vue';
import ChangePasswordModal from '@/components/ui/ChangePasswordModal.vue';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal.vue';
import SelectionBar from '@/components/chat/SelectionBar.vue';
import ForwardModal from '@/components/chat/ForwardModal.vue';
import TrashDrawer from '@/components/layout/TrashDrawer.vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { useDocumentStore } from '@/stores/documents';
import { useBackToClose } from '@/utils/backStack';

const chatStore = useChatStore();
const authStore = useAuthStore();
const docStore = useDocumentStore();
const router = useRouter();
const route = useRoute();
const pwaStore = usePwaStore();
const commandPaletteRef = ref(null);
const isMobileSidebarOpen = ref(false);

// "Atrás" (gesto o botón) cierra lo que esté abierto en vez de salir del chat
useBackToClose(() => isMobileSidebarOpen.value, () => { isMobileSidebarOpen.value = false; });
useBackToClose(() => !!docStore.activePreviewFile, () => docStore.closePreview());
useBackToClose(() => docStore.isVaultOpen, () => docStore.closeVault());
useBackToClose(() => chatStore.isTrashOpen, () => chatStore.closeTrash());
useBackToClose(() => chatStore.selectionMode, () => chatStore.clearSelection());
useBackToClose(() => chatStore.forwardingIds.length > 0, () => chatStore.cancelForward());
useBackToClose(() => authStore.isSettingsOpen, () => authStore.closeSettings());

// ---------- Deslizar desde el borde izquierdo = abrir el menú (como WhatsApp/Telegram) ----------
const EDGE_ZONE_PX = 28;
const OPEN_DISTANCE_PX = 60;
let edgeStart = null;

function onEdgeTouchStart(e) {
  const t = e.touches[0];
  edgeStart = !isMobileSidebarOpen.value && window.innerWidth < 1024 && t.clientX <= EDGE_ZONE_PX
    ? { x: t.clientX, y: t.clientY }
    : null;
}

function onEdgeTouchMove(e) {
  if (!edgeStart) return;
  const t = e.touches[0];
  const dx = t.clientX - edgeStart.x;
  const dy = Math.abs(t.clientY - edgeStart.y);
  if (dy > 40 && dy > dx) {
    edgeStart = null;
  } else if (dx > OPEN_DISTANCE_PX) {
    edgeStart = null;
    isMobileSidebarOpen.value = true;
  }
}

function onEdgeTouchEnd() {
  edgeStart = null;
}

// Deslizar a la izquierda sobre el menú abierto = cerrarlo
let drawerStartX = null;
function onDrawerTouchStart(e) {
  drawerStartX = e.touches[0].clientX;
}
function onDrawerTouchEnd(e) {
  if (drawerStartX === null) return;
  const dx = e.changedTouches[0].clientX - drawerStartX;
  drawerStartX = null;
  if (dx < -OPEN_DISTANCE_PX) isMobileSidebarOpen.value = false;
}

// Esc sale del modo selección
function onKeydown(e) {
  if (e.key === 'Escape' && chatStore.selectionMode) chatStore.clearSelection();
}

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
  // Antes de cargar mensajes: sin token no se pueden ver los adjuntos protegidos
  await refreshFileToken();
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
  window.addEventListener('keydown', onKeydown);
  pwaStore.syncPush();
});

onUnmounted(() => {
  chatStore.stopPolling();
  chatStore.unsubscribeRealtime();
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  window.removeEventListener('keydown', onKeydown);
});
</script>
