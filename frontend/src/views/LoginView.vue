<template>
  <div class="h-full w-full overflow-y-auto flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/60 text-slate-800 relative overflow-hidden select-none">
    
    <!-- Halos de luz sutiles y elegantes en dorado corporativo -->
    <div class="absolute -top-32 -left-32 w-80 h-80 bg-amber-200/40 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-80 h-80 bg-slate-300/40 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Tarjeta de Login en Modo Claro con Branding Corporativo Gestoría eMadrid -->
    <div class="w-full max-w-md p-7 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/70 relative z-10">
      
      <!-- Logo Oficial y Título -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center mb-3">
          <img 
            src="/icons/app-icon.svg"
            alt="eMadrid Chat"
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-[22%] shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform"
          />
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Gestoría <span class="text-amber-600 font-extrabold">eMadrid</span>
        </h1>
        <p class="text-xs text-slate-500 mt-1 font-medium">
          Chat Interno
        </p>
      </div>

      <!-- Formulario de Acceso -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div v-if="errorMessage" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
          {{ errorMessage }}
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
          <div class="relative">
            <Mail class="absolute left-3 top-3 w-4 h-4 text-amber-600" />
            <input 
              v-model="email"
              type="email" 
              required
              class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Contraseña</label>
          <div class="relative">
            <Lock class="absolute left-3 top-3 w-4 h-4 text-amber-600" />
            <input 
              v-model="password"
              type="password" 
              required
              class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        <button 
          type="submit"
          :disabled="isLoading"
          class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/25 hover:from-amber-700 hover:to-amber-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          <span v-if="isLoading">Accediendo...</span>
          <template v-else>
            <span>Iniciar Sesión</span>
            <ArrowRight class="w-4 h-4 stroke-[2.5]" />
          </template>
        </button>
      </form>

      <div class="mt-6 text-center text-[11px] text-slate-400 font-medium">
        Gestoría eMadrid • Acceso Seguro Departamental
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Mail, Lock, ArrowRight } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleLogin() {
  errorMessage.value = '';
  isLoading.value = true;
  
  // finally: si algo lanza una excepción, el botón no se queda en "Accediendo..." para siempre
  try {
    const res = await authStore.login(email.value, password.value);
    if (res.success) {
      router.replace('/');
    } else {
      errorMessage.value = res.error || 'Credenciales incorrectas';
    }
  } catch (e) {
    console.warn('Error en login:', e);
    errorMessage.value = 'Error inesperado al iniciar sesión';
  } finally {
    isLoading.value = false;
  }
}
</script>
