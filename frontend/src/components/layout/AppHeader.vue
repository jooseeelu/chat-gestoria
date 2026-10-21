<template>
  <header class="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 flex items-center justify-between z-10 flex-shrink-0 transition-colors duration-200">
    
    <!-- Info del Espacio Activo -->
    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
      <button 
        @click="$emit('toggle-sidebar')"
        class="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        title="Abrir menú de canales"
      >
        <Menu class="w-6 h-6" />
      </button>

      <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div class="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
          <component :is="getActiveIcon()" class="w-4 h-4 sm:w-4 sm:h-4" />
        </div>
        <div class="min-w-0">
          <h1 class="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {{ chatStore.activeChannel?.name }}
          </h1>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
            {{ chatStore.activeChannel?.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- Acciones Superiores -->
    <div class="flex items-center gap-1 sm:gap-2">
      
      <!-- Buscar en este chat (In-chat search) -->
      <button 
        @click="chatStore.isSearchOpen = !chatStore.isSearchOpen"
        class="p-2 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        :class="{ 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400': chatStore.isSearchOpen }"
        title="Buscar mensajes en este espacio"
      >
        <Search class="w-4 h-4 sm:w-4 sm:h-4" />
      </button>

      <!-- Disparador de Command Palette (Ctrl + K) -->
      <button 
        @click="$emit('open-command')"
        class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs cursor-pointer"
      >
        <span>Comandos...</span>
        <kbd class="kbd-badge">Ctrl K</kbd>
      </button>

      <!-- Botón Bóveda de Documentos -->
      <button 
        @click="docStore.toggleVault"
        class="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl transition-all duration-200 border text-xs font-semibold cursor-pointer"
        :class="docStore.isVaultOpen 
          ? 'bg-amber-600 text-white border-amber-500 shadow-sm' 
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'"
        title="Abrir Bóveda de Archivos compartidos"
      >
        <FolderLock class="w-4 h-4 text-amber-600 dark:text-amber-400" :class="{ 'text-white': docStore.isVaultOpen }" />
        <span class="hidden sm:inline">Bóveda</span>
        <span 
          class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
          :class="docStore.isVaultOpen ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'"
        >
          {{ docStore.documentStats.totalCount }}
        </span>
      </button>

      <!-- Sonido Chime Toggle -->
      <button 
        @click="chatStore.toggleSound()"
        class="hidden sm:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        :title="chatStore.soundEnabled ? 'Sonidos activados (clic para silenciar)' : 'Sonidos silenciados'"
      >
        <Volume2 v-if="chatStore.soundEnabled" class="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <VolumeX v-else class="w-4 h-4 text-slate-400" />
      </button>

      <!-- BOTÓN MODO CLARO / OSCURO (Alternar con 1 clic) -->
      <button 
        @click="toggleDark()"
        class="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        :title="isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'"
      >
        <Sun v-if="isDark" class="w-4 h-4 text-amber-400 hover:rotate-90 transition-transform" />
        <Moon v-else class="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
      </button>

      <!-- Perfil del usuario actual y ajustes -->
      <div class="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
        <img 
          :src="authStore.currentUser?.avatar" 
          :alt="authStore.currentUser?.name"
          @click="authStore.openSettings"
          class="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-700 cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all" 
          title="Haz clic para cambiar tu foto o contraseña"
        />
        <div class="hidden md:block text-left">
          <span class="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
            {{ authStore.currentUser?.name }}
          </span>
          <span class="text-[10px] text-amber-700 dark:text-amber-400 block leading-tight font-medium">
            IT & Sistemas
          </span>
        </div>
        <button 
          @click="authStore.openSettings"
          class="hidden sm:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-0.5 cursor-pointer"
          title="Editar mi foto, nombre o contraseña"
        >
          <UserCog class="w-4 h-4" />
        </button>
        <button 
          @click="handleLogout"
          class="hidden sm:flex p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { 
  Building2,
  Briefcase,
  Terminal, 
  Zap, 
  MessageSquare, 
  Search, 
  FolderLock, 
  Menu,
  LogOut,
  Volume2,
  VolumeX,
  UserCog,
  Sun,
  Moon
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { useDocumentStore } from '@/stores/documents';
import { useAuthStore } from '@/stores/auth';
import { useDark, useToggle } from '@vueuse/core';

defineEmits(['open-command', 'toggle-sidebar']);

const router = useRouter();
const chatStore = useChatStore();
const docStore = useDocumentStore();
const authStore = useAuthStore();

const isDark = useDark();
const toggleDark = useToggle(isDark);

function getActiveIcon() {
  switch (chatStore.activeChannel?.icon) {
    case 'Building2': return Building2;
    case 'Briefcase': return Briefcase;
    case 'Terminal': return Terminal;
    case 'Zap': return Zap;
    default: return MessageSquare;
  }
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
