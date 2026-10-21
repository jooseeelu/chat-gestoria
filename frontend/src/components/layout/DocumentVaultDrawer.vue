<template>
  <div>
    <!-- Backdrop oscuro con blur cuando está abierto -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="docStore.isVaultOpen" 
        class="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
        @click="docStore.closeVault"
      ></div>
    </Transition>

    <!-- Slide-over Drawer -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside 
        v-if="docStore.isVaultOpen"
        class="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200"
      >
        <!-- Header del Drawer -->
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FolderLock class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">
                Bóveda de Documentos
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Archivos centralizados de Gestoría eMadrid
              </p>
            </div>
          </div>

          <button 
            @click="docStore.closeVault"
            class="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Estadísticas Rápidas -->
        <div class="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400">
            Total almacenado:
          </span>
          <span class="font-bold text-amber-600 dark:text-amber-400 font-mono">
            {{ formatFileSize(docStore.documentStats.totalBytes) }} ({{ docStore.documentStats.totalCount }} archivos)
          </span>
        </div>

        <!-- Buscador en tiempo real -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-800">
          <div class="relative">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              v-model="docStore.searchQuery"
              type="text" 
              placeholder="Buscar por nombre o departamento..."
              class="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <!-- Pestañas de Filtro -->
          <div class="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="docStore.activeTab = tab.id"
              class="px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer"
              :class="docStore.activeTab === tab.id 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Lista de Documentos -->
        <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div v-if="docStore.filteredDocuments.length === 0" class="text-center py-12 text-slate-400">
            <FolderLock class="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p class="text-sm font-medium">No se encontraron documentos</p>
            <p class="text-xs text-slate-500 mt-1">Prueba con otro término de búsqueda o categoría.</p>
          </div>

          <div 
            v-for="doc in docStore.filteredDocuments"
            :key="doc.id"
            class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :class="getBadge(doc.file_type).bg">
                <FileText v-if="doc.file_type === 'pdf'" class="w-5 h-5 text-rose-500" />
                <FileSpreadsheet v-else-if="doc.file_type === 'spreadsheet'" class="w-5 h-5 text-emerald-500" />
                <ImageIcon v-else-if="doc.file_type === 'image'" class="w-5 h-5 text-purple-500" />
                <Archive v-else-if="doc.file_type === 'archive'" class="w-5 h-5 text-amber-500" />
                <File v-else class="w-5 h-5 text-brand-500" />
              </div>

              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" :title="doc.filename">
                  {{ doc.filename }}
                </p>
                <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{{ formatFileSize(doc.size) }}</span>
                  <span>•</span>
                  <span class="text-amber-600 dark:text-amber-400 font-medium">{{ doc.channelName }}</span>
                  <span>•</span>
                  <span>{{ doc.uploaderName }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button 
                v-if="doc.file_type === 'image' || doc.file_type === 'pdf'"
                @click="docStore.setPreviewFile(doc)"
                class="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                title="Previsualizar"
              >
                <Eye class="w-4 h-4" />
              </button>
              <a 
                :href="doc.url || '#'" 
                :download="doc.filename"
                target="_blank"
                class="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                title="Descargar"
              >
                <Download class="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

      </aside>
    </Transition>
  </div>
</template>

<script setup>
import { 
  FolderLock, 
  X, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Archive, 
  File 
} from 'lucide-vue-next';
import { useDocumentStore } from '@/stores/documents';
import { formatFileSize } from '@/utils/formatters';
import { getFileTypeBadge } from '@/utils/fileIcons';

const docStore = useDocumentStore();

const tabs = [
  { id: 'all', label: 'Todos' },
  { id: 'pdf', label: 'PDFs / Modelos' },
  { id: 'spreadsheet', label: 'Excels / Nóminas' },
  { id: 'image', label: 'Imágenes' },
  { id: 'archive', label: 'ZIPs' }
];

function getBadge(type) {
  return getFileTypeBadge(type);
}
</script>
