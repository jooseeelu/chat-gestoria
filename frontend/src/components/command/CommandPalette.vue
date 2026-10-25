<template>
  <Teleport to="body">
    <div 
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in-up"
      @click.self="close"
    >
      <div class="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <!-- Input de búsqueda del Command Palette -->
        <div class="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search class="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input 
            ref="inputRef"
            v-model="query"
            type="text" 
            placeholder="Escribe un comando o salta a un canal / documento..."
            class="w-full bg-transparent text-base sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            @keydown.down.prevent="navigate(1)"
            @keydown.up.prevent="navigate(-1)"
            @keydown.enter.prevent="selectActive"
            @keydown.esc.prevent="close"
          />
          <kbd class="kbd-badge ml-2 flex-shrink-0">ESC</kbd>
        </div>

        <!-- Resultados -->
        <div class="max-h-96 overflow-y-auto p-2 space-y-1">
          <div v-if="filteredItems.length === 0" class="p-6 text-center text-sm text-slate-400">
            No se han encontrado resultados para "{{ query }}"
          </div>

          <button 
            v-for="(item, index) in filteredItems" 
            :key="item.id || index"
            @click="executeItem(item)"
            @mouseenter="selectedIndex = index"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors duration-150"
            :class="selectedIndex === index 
              ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-medium' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <component :is="item.icon" class="w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-400" />
              <span class="truncate">{{ item.label }}</span>
              <span v-if="item.badge" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {{ item.badge }}
              </span>
            </div>

            <span class="text-[11px] text-slate-400 font-mono ml-2 flex-shrink-0">
              {{ item.category }}
            </span>
          </button>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div class="flex items-center gap-3">
            <span><kbd class="kbd-badge">↑</kbd> <kbd class="kbd-badge">↓</kbd> navegar</span>
            <span><kbd class="kbd-badge">↵</kbd> ejecutar</span>
          </div>
          <span>Gestoría eMadrid Raycast Mode</span>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Search, 
  Hash, 
  FolderLock, 
  Sun, 
  Moon, 
  UserCheck, 
  FileText, 
  FileSpreadsheet, 
  Sparkles,
  LogOut,
  KeyRound,
  BellRing,
  BellOff,
  MonitorDown
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { useDocumentStore } from '@/stores/documents';
import { useAuthStore } from '@/stores/auth';
import { usePwaStore } from '@/stores/pwa';
import { useDark, useToggle } from '@vueuse/core';

const router = useRouter();

const isOpen = ref(false);
const query = ref('');
const selectedIndex = ref(0);
const inputRef = ref(null);

const chatStore = useChatStore();
const docStore = useDocumentStore();
const authStore = useAuthStore();
const pwaStore = usePwaStore();

const isDark = useDark();
const toggleDark = useToggle(isDark);

const allItems = computed(() => {
  const items = [];

  // Canales / Espacios
  chatStore.channels.forEach(c => {
    items.push({
      id: `chan_${c.id}`,
      label: `${c.name} — ${c.description}`,
      category: 'Departamento',
      icon: Hash,
      action: () => chatStore.setActiveChannel(c.id)
    });
  });

  // Acciones Rápidas
  items.push({
    id: 'act_vault',
    label: 'Abrir Bóveda de Documentos',
    category: 'Acción',
    icon: FolderLock,
    action: () => docStore.openVault('all')
  });

  items.push({
    id: 'act_theme',
    label: isDark.value ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro',
    category: 'Tema',
    icon: isDark.value ? Sun : Moon,
    action: () => toggleDark()
  });

  items.push({
    id: 'act_push',
    label: pwaStore.pushEnabled ? 'Desactivar notificaciones en este dispositivo' : 'Activar notificaciones de mensajes nuevos',
    category: 'Notificaciones',
    icon: pwaStore.pushEnabled ? BellOff : BellRing,
    action: () => pwaStore.togglePush()
  });

  if (pwaStore.canInstall) {
    items.push({
      id: 'act_install',
      label: 'Instalar el chat como aplicación',
      category: 'App',
      icon: MonitorDown,
      action: () => pwaStore.install()
    });
  }

  // Cambiar contraseña
  items.push({
    id: 'act_password',
    label: 'Cambiar mi contraseña',
    category: 'Seguridad',
    icon: KeyRound,
    action: () => authStore.openSettings()
  });

  // Cerrar sesión
  items.push({
    id: 'act_logout',
    label: `Cerrar sesión (${authStore.currentUser?.name})`,
    category: 'Cuenta',
    icon: LogOut,
    action: () => {
      authStore.promptLogout();
    }
  });

  // Documentos en la bóveda
  docStore.allDocuments.forEach(doc => {
    items.push({
      id: `doc_${doc.id}`,
      label: `${doc.filename} (en ${doc.channelName})`,
      category: 'Documento',
      icon: doc.file_type === 'pdf' ? FileText : FileSpreadsheet,
      action: () => docStore.setPreviewFile(doc)
    });
  });

  return items;
});

const filteredItems = computed(() => {
  if (!query.value.trim()) return allItems.value.slice(0, 10);
  const q = query.value.toLowerCase().trim();
  return allItems.value
    .filter(i => i.label.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    .slice(0, 12);
});

function open() {
  isOpen.value = true;
  query.value = '';
  selectedIndex.value = 0;
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function close() {
  isOpen.value = false;
}

function navigate(direction) {
  if (filteredItems.value.length === 0) return;
  selectedIndex.value = (selectedIndex.value + direction + filteredItems.value.length) % filteredItems.value.length;
}

function selectActive() {
  const item = filteredItems.value[selectedIndex.value];
  if (item) {
    executeItem(item);
  }
}

function executeItem(item) {
  close();
  if (item.action) {
    item.action();
  }
}

// Global keyboard shortcut: Ctrl+K / Cmd+K
function handleGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

defineExpose({
  open,
  close
});
</script>
