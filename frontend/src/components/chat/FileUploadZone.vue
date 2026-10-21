<template>
  <div 
    v-if="isDragging"
    class="absolute inset-0 z-40 flex flex-col items-center justify-center p-8 bg-brand-500/10 dark:bg-brand-950/40 backdrop-blur-md border-2 border-dashed border-brand-500 dark:border-brand-400 rounded-2xl m-3 transition-all duration-300 pointer-events-none"
  >
    <div class="p-4 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/30 mb-4 animate-bounce">
      <UploadCloud class="w-10 h-10" />
    </div>
    
    <h3 class="text-xl font-bold text-slate-800 dark:text-white">
      Suelta los documentos aquí
    </h3>
    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1 text-center max-w-sm">
      Soporta PDFs, Excels, nóminas, imágenes o ZIPs hasta 100 MB para el equipo
    </p>

    <div class="mt-4 flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-500/20 px-3 py-1.5 rounded-full border border-brand-500/30">
      <span>Auto-clasificación inteligente en la Bóveda</span>
    </div>
  </div>
</template>

<script setup>
import { UploadCloud } from 'lucide-vue-next';

defineProps({
  isDragging: {
    type: Boolean,
    default: false
  }
});
</script>
