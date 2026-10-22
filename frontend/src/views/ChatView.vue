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
    </main>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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
const commandPaletteRef = ref(null);
const isMobileSidebarOpen = ref(false);

function openCommandPalette() {
  commandPaletteRef.value?.open();
}

onMounted(async () => {
  await authStore.initAuth();
  await chatStore.fetchChannels();
  chatStore.subscribeRealtime();
});
</script>
