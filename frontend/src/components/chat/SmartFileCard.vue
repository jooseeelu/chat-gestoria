<template>
  <div 
    class="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group"
    :class="cardStyle"
  >
    <!-- Miniatura o Icono según tipo -->
    <div class="relative flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden"
         :class="iconContainerStyle">
      <template v-if="file.file_type === 'image' && file.url">
        <img 
          :src="file.url" 
          :alt="file.filename" 
          class="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
          @click="openPreview"
        />
      </template>
      <template v-else-if="file.file_type === 'pdf'">
        <FileText class="w-6 h-6 text-rose-500" />
      </template>
      <template v-else-if="file.file_type === 'spreadsheet'">
        <FileSpreadsheet class="w-6 h-6 text-emerald-500" />
      </template>
      <template v-else-if="file.file_type === 'archive'">
        <Archive class="w-6 h-6 text-amber-500" />
      </template>
      <template v-else>
        <File class="w-6 h-6 text-brand-500" />
      </template>
    </div>

    <!-- Info del Fichero -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold px-1.5 py-0.5 rounded border" :class="badgeStyle">
          {{ badgeInfo.label }}
        </span>
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {{ formatFileSize(file.size) }}
        </span>
      </div>
      <p 
        class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors"
        :title="file.filename"
      >
        {{ file.filename }}
      </p>
    </div>

    <!-- Acciones Rápidas (Descarga / Preview) -->
    <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
      <button 
        v-if="canPreview"
        @click="openPreview"
        class="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors"
        title="Previsualizar documento"
      >
        <Eye class="w-4 h-4" />
      </button>

      <a 
        :href="file.url || '#'" 
        :download="file.filename"
        target="_blank"
        rel="noopener noreferrer"
        class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors"
        title="Descargar archivo"
      >
        <Download class="w-4 h-4" />
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  FileText, 
  FileSpreadsheet, 
  Archive, 
  File, 
  Download, 
  Eye, 
  Image as ImageIcon 
} from 'lucide-vue-next';
import { formatFileSize } from '@/utils/formatters';
import { getFileTypeBadge } from '@/utils/fileIcons';
import { useDocumentStore } from '@/stores/documents';

const props = defineProps({
  file: {
    type: Object,
    required: true
  }
});

const docStore = useDocumentStore();

const badgeInfo = computed(() => getFileTypeBadge(props.file.file_type));

const canPreview = computed(() => {
  return props.file.file_type === 'image' || props.file.file_type === 'pdf';
});

const badgeStyle = computed(() => badgeInfo.value.bg);

const cardStyle = computed(() => {
  return 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-500/50 dark:hover:border-amber-500/50 text-slate-800 dark:text-slate-100';
});

const iconContainerStyle = computed(() => {
  switch (props.file.file_type) {
    case 'pdf': return 'bg-rose-500/10';
    case 'spreadsheet': return 'bg-emerald-500/10';
    case 'image': return 'bg-purple-500/10';
    case 'archive': return 'bg-amber-500/10';
    default: return 'bg-brand-500/10';
  }
});

function openPreview() {
  docStore.setPreviewFile(props.file);
}
</script>
