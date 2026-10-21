<template>
  <Teleport to="body">
    <div 
      v-if="authStore.isSettingsOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fade-in-up"
      @click.self="authStore.closeSettings"
    >
      <div class="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <!-- Header del Modal con Pestañas de Ajustes -->
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <UserCog class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Ajustes de Cuenta
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Personaliza tu foto, nombre y seguridad
              </p>
            </div>
          </div>

          <button 
            @click="authStore.closeSettings"
            class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Pestañas: [ Mi Perfil ] y [ Contraseña ] -->
        <div class="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-1.5 text-xs">
          <button 
            @click="activeTab = 'profile'"
            class="flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all duration-150 flex items-center justify-center gap-2"
            :class="activeTab === 'profile' 
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            <Camera class="w-3.5 h-3.5" />
            <span>Foto & Perfil</span>
          </button>

          <button 
            @click="activeTab = 'security'"
            class="flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all duration-150 flex items-center justify-center gap-2"
            :class="activeTab === 'security' 
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            <KeyRound class="w-3.5 h-3.5" />
            <span>Contraseña</span>
          </button>
        </div>

        <!-- Mensajes globales de éxito o error -->
        <div v-if="successMsg" class="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
          <span>{{ successMsg }}</span>
        </div>

        <div v-if="errorMsg" class="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 animate-fade-in-up">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>

        <!-- PESTAÑA 1: FOTO & PERFIL -->
        <div v-if="activeTab === 'profile'" class="p-5 space-y-5">
          <!-- Editor interactivo de foto de perfil -->
          <div class="flex flex-col items-center justify-center text-center">
            <div class="relative group cursor-pointer mb-3" @click="triggerAvatarInput">
              <img 
                :src="previewAvatar || authStore.currentUser?.avatar" 
                :alt="authStore.currentUser?.name"
                class="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-200 dark:ring-slate-700 shadow-md group-hover:opacity-80 transition-opacity"
              />
              <!-- Overlay de cámara en hover -->
              <div class="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera class="w-6 h-6" />
              </div>
            </div>

            <!-- Input invisible para subir foto de perfil -->
            <input 
              ref="avatarInputRef"
              type="file" 
              accept="image/*"
              class="hidden" 
              @change="handleAvatarFile"
            />

            <button 
              type="button" 
              @click="triggerAvatarInput"
              class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
            >
              <Upload class="w-3.5 h-3.5" />
              <span>Subir foto desde tu equipo</span>
            </button>
            <p class="text-[11px] text-slate-400 mt-0.5">Soporta PNG, JPG o WEBP</p>
          </div>

          <!-- Presets rápidos de avatares estilo desarrollador -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              O elige un avatar de desarrollo predefinido
            </label>
            <div class="grid grid-cols-4 gap-2">
              <button 
                v-for="(preset, idx) in devAvatarPresets"
                :key="idx"
                type="button"
                @click="previewAvatar = preset"
                class="p-1 rounded-xl border transition-all hover:scale-105"
                :class="(previewAvatar || authStore.currentUser?.avatar) === preset 
                  ? 'border-brand-500 ring-2 ring-brand-500/30' 
                  : 'border-slate-200 dark:border-slate-700'"
              >
                <img :src="preset" class="w-full h-12 rounded-lg object-cover" />
              </button>
            </div>
          </div>

          <!-- Nombre a mostrar -->
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nombre a mostrar
            </label>
            <input 
              v-model="displayName"
              type="text"
              class="w-full px-3 py-2 text-base sm:text-xs rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <div class="flex justify-end pt-2">
            <button 
              @click="saveProfile"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/25 transition-all"
            >
              Guardar Perfil
            </button>
          </div>
        </div>

        <!-- PESTAÑA 2: SEGURIDAD & CONTRASEÑA -->
        <form v-else-if="activeTab === 'security'" @submit.prevent="handlePasswordSubmit" class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Contraseña Actual
            </label>
            <div class="relative">
              <input 
                v-model="currentPassword"
                :type="showCurrent ? 'text' : 'password'"
                required
                placeholder="••••••••"
                class="w-full pl-3 pr-9 py-2 text-base sm:text-xs rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button 
                type="button" 
                @click="showCurrent = !showCurrent"
                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <EyeOff v-if="showCurrent" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nueva Contraseña (mínimo 6 caracteres)
            </label>
            <div class="relative">
              <input 
                v-model="newPassword"
                :type="showNew ? 'text' : 'password'"
                required
                placeholder="••••••••"
                class="w-full pl-3 pr-9 py-2 text-base sm:text-xs rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button 
                type="button" 
                @click="showNew = !showNew"
                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <EyeOff v-if="showNew" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <div class="relative">
              <input 
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                required
                placeholder="••••••••"
                class="w-full pl-3 pr-9 py-2 text-base sm:text-xs rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button 
                type="button" 
                @click="showConfirm = !showConfirm"
                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <EyeOff v-if="showConfirm" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button 
              type="button"
              @click="authStore.closeSettings"
              class="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="loading"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/25 transition-all"
            >
              {{ loading ? 'Actualizando...' : 'Guardar Nueva Contraseña' }}
            </button>
          </div>
        </form>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { 
  UserCog, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Upload,
  KeyRound 
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const activeTab = ref('profile'); // 'profile' | 'security'

const avatarInputRef = ref(null);
const previewAvatar = ref('');
const displayName = ref(authStore.currentUser?.name || '');

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const showCurrent = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Presets de avatares modernos listos para elegir
const devAvatarPresets = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=160&auto=format&fit=crop&q=80'
];

watch(
  () => authStore.currentUser,
  (user) => {
    if (user) {
      displayName.value = user.name;
      previewAvatar.value = user.avatar;
    }
  },
  { immediate: true }
);

function triggerAvatarInput() {
  avatarInputRef.value?.click();
}

function handleAvatarFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    previewAvatar.value = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  errorMsg.value = '';
  successMsg.value = '';

  const res = await authStore.updateProfile({
    name: displayName.value,
    avatar: previewAvatar.value
  });

  if (res.success) {
    successMsg.value = '¡Foto y perfil guardados correctamente!';
    setTimeout(() => {
      successMsg.value = '';
    }, 2000);
  } else {
    errorMsg.value = res.error;
  }
}

async function handlePasswordSubmit() {
  errorMsg.value = '';
  successMsg.value = '';
  loading.value = true;

  const result = await authStore.changePassword(
    currentPassword.value,
    newPassword.value,
    confirmPassword.value
  );

  loading.value = false;

  if (result.success) {
    successMsg.value = result.message;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    setTimeout(() => {
      authStore.closeSettings();
      successMsg.value = '';
    }, 1800);
  } else {
    errorMsg.value = result.error;
  }
}
</script>
