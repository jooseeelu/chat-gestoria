<template>
  <aside class="w-full sm:w-72 h-full flex flex-col select-none bg-white dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
    
    <!-- Branding Gestoría eMadrid con Logo G Dorado Oficial y Botón Cerrar Móvil -->
    <div class="h-16 px-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#070e1b]">
      <div class="flex items-center gap-2.5">
        <!-- Logo Oficial de la G Dorada de Gestoría eMadrid -->
        <img 
          src="/logo-g.png" 
          alt="Gestoría eMadrid" 
          class="w-10 h-10 object-contain drop-shadow-sm hover:scale-105 transition-transform cursor-pointer" 
        />
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">eMadrid</span>
            <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              GESTORÍA
            </span>
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Portal Interno & Archivos</p>
        </div>
      </div>

      <!-- Botón de Cerrar Menú Lateral en Móvil -->
      <button 
        @click="emit('close-sidebar')"
        class="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Cerrar menú"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Navegación de Canales y Departamentos -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-3 space-y-6">
      
      <!-- Departamentos de la Gestoría -->
      <div>
        <div class="flex items-center justify-between px-2 mb-2">
          <span class="text-xs sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Departamentos
          </span>
          <span class="text-xs sm:text-[10px] font-semibold text-slate-400 font-mono">
            {{ chatStore.channels.length }}
          </span>
        </div>

        <div class="space-y-1 sm:space-y-1">
          <button 
            v-for="channel in chatStore.channels" 
            :key="channel.id"
            @click="selectChannel(channel.id)"
            class="w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-xl text-sm sm:text-xs font-semibold transition-all duration-150 group cursor-pointer"
            :class="chatStore.activeChannelId === channel.id 
              ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold border border-amber-500/30 dark:border-amber-500/40 shadow-xs' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent'"
          >
            <div class="flex items-center gap-2.5 truncate">
              <component 
                :is="getChannelIcon(channel.icon)" 
                class="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0"
                :class="chatStore.activeChannelId === channel.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'"
              />
              <span class="truncate">{{ channel.name }}</span>
            </div>

            <!-- Badge de canal IT exclusivo -->
            <span 
              v-if="channel.id === 'space_it'" 
              class="px-2 py-0.5 sm:px-1.5 sm:py-0.2 rounded text-[10px] sm:text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            >
              IT
            </span>

            <span 
              v-else-if="channel.unread_count > 0" 
              class="px-2 py-0.5 sm:px-1.5 sm:py-0.2 rounded-full text-xs sm:text-[10px] font-bold bg-amber-600 text-white"
            >
              {{ channel.unread_count }}
            </span>
          </button>
        </div>
      </div>

      <!-- Equipo de la Gestoría (Conectados) -->
      <div>
        <div class="flex items-center justify-between px-2 mb-2">
          <span class="text-xs sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Compañero en Línea
          </span>
          <div class="flex items-center gap-1.5 text-xs sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>

        <!-- Tarjeta del compañero (Johan si eres Jose Luis) -->
        <div class="p-3 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between hover:border-amber-500/30 transition-colors">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative flex-shrink-0">
              <img 
                :src="authStore.peerUser?.avatar" 
                :alt="authStore.peerUser?.name" 
                class="w-10 h-10 sm:w-9 sm:h-9 rounded-xl object-cover ring-1 ring-slate-300 dark:ring-slate-700"
              />
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm sm:text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {{ authStore.peerUser?.name }}
                </span>
                <span class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold font-mono hidden sm:inline">
                  IT
                </span>
              </div>
              <span class="text-xs sm:text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                Desarrollador
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Activo ahora"></span>
          </div>
        </div>
      </div>

    </div>

    <!-- Perfil del usuario actual en la parte inferior -->
    <div class="p-3.5 sm:p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070e1b]/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="relative flex-shrink-0">
            <img 
              :src="authStore.currentUser?.avatar" 
              :alt="authStore.currentUser?.name"
              @click="openSettings"
              class="w-10 h-10 sm:w-8 sm:h-8 rounded-xl object-cover ring-2 ring-amber-500/40 cursor-pointer hover:ring-amber-500 transition-all"
              title="Haz clic para cambiar tu foto o contraseña"
            />
            <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1">
              <span class="text-sm sm:text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                {{ authStore.currentUser?.name }}
              </span>
              <span class="text-[9px] text-amber-700 dark:text-amber-400 font-bold px-1 rounded bg-amber-500/10 border border-amber-500/20">TÚ</span>
            </div>
            <span class="text-xs sm:text-[10px] text-slate-500 dark:text-slate-400 block truncate">
              {{ authStore.currentUser?.email }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button 
            @click="openSettings"
            class="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Editar mi foto, nombre o contraseña"
          >
            <UserCog class="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <button 
            @click="handleLogout"
            class="p-2 sm:p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut class="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { 
  Building2,
  Briefcase,
  Terminal, 
  Zap, 
  MessageSquare, 
  LogOut, 
  UserCog,
  X 
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';

const emit = defineEmits(['close-sidebar']);
const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

function getChannelIcon(iconName) {
  switch (iconName) {
    case 'Building2': return Building2;
    case 'Briefcase': return Briefcase;
    case 'Terminal': return Terminal;
    case 'Zap': return Zap;
    default: return MessageSquare;
  }
}

function selectChannel(id) {
  chatStore.setActiveChannel(id);
  emit('close-sidebar');
}

function openSettings() {
  authStore.openSettings();
  emit('close-sidebar');
}

function handleLogout() {
  emit('close-sidebar');
  authStore.promptLogout();
}
</script>
