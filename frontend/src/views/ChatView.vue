<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 transition-colors duration-200">
    
    <!-- Sidebar de Canales y Equipo (Desktop) -->
    <div class="hidden lg:block h-full">
      <SidebarChannels />
    </div>

    <!-- Sidebar Móvil (Drawer) -->
    <div 
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 z-50 lg:hidden flex"
    >
      <div 
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        @click="isMobileSidebarOpen = false"
      ></div>
      <div class="relative z-10 w-72 h-full">
        <SidebarChannels />
      </div>
    </div>

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
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();
const commandPaletteRef = ref(null);
const isMobileSidebarOpen = ref(false);

function openCommandPalette() {
  commandPaletteRef.value?.open();
}

onMounted(() => {
  chatStore.fetchChannels();
  chatStore.subscribeRealtime();
});
</script>
