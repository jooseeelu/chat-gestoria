<template>
  <Teleport to="body">
    <div 
      v-if="docStore.activePreviewFile" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in-up"
      @click.self="docStore.closePreview"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <!-- Header del Lightbox -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-xs font-semibold px-2 py-0.5 rounded border" :class="badgeStyle">
              {{ badgeInfo.label }}
            </span>
            <span class="text-sm font-medium text-slate-200 truncate">
              {{ file.filename }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <a 
              :href="file.url || '#'" 
              :download="file.filename"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              target="_blank"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Descargar</span>
            </a>

            <button 
              @click="docStore.closePreview"
              class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Visor de contenido -->
        <div class="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/50 min-h-[400px]">
          <!-- Vista de imagen -->
          <template v-if="file.file_type === 'image'">
            <img 
              :src="file.url" 
              :alt="file.filename" 
              class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
            />
          </template>

          <!-- Previsualizador de PDF embebido -->
          <template v-else-if="file.file_type === 'pdf'">
            <iframe 
              :src="file.url" 
              class="w-full h-[75vh] rounded-lg border border-slate-800 bg-white"
            ></iframe>
          </template>

          <!-- Otro archivo no visualizable directamente -->
          <template v-else>
            <div class="text-center p-8">
              <FileText class="w-16 h-16 text-slate-500 mx-auto mb-3" />
              <p class="text-slate-300 font-medium">Previsualización no disponible para este formato</p>
              <p class="text-xs text-slate-500 mt-1">Puedes descargarlo para abrirlo con el software correspondiente.</p>
            </div>
          </template>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { X, Download, FileText } from 'lucide-vue-next';
import { useDocumentStore } from '@/stores/documents';
import { getFileTypeBadge } from '@/utils/fileIcons';

const docStore = useDocumentStore();
const file = computed(() => docStore.activePreviewFile || {});
const badgeInfo = computed(() => getFileTypeBadge(file.value.file_type));
const badgeStyle = computed(() => badgeInfo.value.bg);
</script>
