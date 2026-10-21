<template>
  <Teleport to="body">
    <div 
      v-if="authStore.isLogoutModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fade-in-up"
      @click.self="authStore.cancelLogout"
    >
      <div class="relative w-full max-w-sm bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center">
        
        <!-- Icono de Advertencia de Cierre de Sesión -->
        <div class="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mb-4 ring-8 ring-rose-500/5">
          <LogOut class="w-7 h-7 stroke-[2]" />
        </div>

        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
          ¿Cerrar sesión?
        </h3>

        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          ¿Estás seguro de que deseas salir de tu cuenta, <strong class="text-slate-900 dark:text-white">{{ authStore.currentUser?.name }}</strong>? Tendrás que volver a identificarte para acceder al chat y a la documentación.
        </p>

        <!-- Botones de Acción Táctiles y Claros -->
        <div class="w-full flex flex-col sm:flex-row gap-2.5">
          <button 
            type="button"
            @click="authStore.cancelLogout"
            class="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button 
            type="button"
            @click="handleConfirm"
            class="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] font-bold text-sm text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut class="w-4 h-4" />
            <span>Sí, cerrar sesión</span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { LogOut } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function handleConfirm() {
  authStore.confirmLogout();
  router.push('/login');
}
</script>
