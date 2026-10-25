<template>
  <Teleport to="body">
    <div
      v-if="docStore.activePreviewFile"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe-4 bg-slate-950/80 backdrop-blur-md animate-fade-in-up"
      @click.self="docStore.closePreview"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        <!-- Header del Lightbox -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-xs font-semibold px-2 py-0.5 rounded border" :class="badgeStyle">
              {{ previewKind === 'html' ? 'Página HTML' : badgeInfo.label }}
            </span>
            <span class="text-sm font-medium text-slate-200 truncate">
              {{ file.filename }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <!-- HTML: alternar entre página renderizada y código fuente -->
            <button
              v-if="previewKind === 'html' && textContent !== null"
              @click="showSource = !showSource"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              <Code2 v-if="!showSource" class="w-3.5 h-3.5" />
              <Globe v-else class="w-3.5 h-3.5" />
              <span>{{ showSource ? 'Ver página' : 'Ver código' }}</span>
            </button>

            <a
              :href="file.url || '#'"
              :download="file.filename"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              target="_blank"
            >
              <Download class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Descargar</span>
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
          <template v-if="previewKind === 'image'">
            <img
              :src="file.url"
              :alt="file.filename"
              class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
            />
          </template>

          <!-- Previsualizador de PDF embebido -->
          <template v-else-if="previewKind === 'pdf'">
            <iframe
              :src="file.url"
              class="w-full h-[75vh] rounded-lg border border-slate-800 bg-white"
            ></iframe>
          </template>

          <!-- HTML y texto: se descargan como texto y se muestran aquí -->
          <template v-else-if="previewKind === 'html' || previewKind === 'text'">
            <div v-if="loadingText" class="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 class="w-4 h-4 animate-spin" />
              <span>Cargando vista previa…</span>
            </div>
            <div v-else-if="textError" class="text-center p-8">
              <FileText class="w-16 h-16 text-slate-500 mx-auto mb-3" />
              <p class="text-slate-300 font-medium">{{ textError }}</p>
            </div>
            <!--
              Vista estática: sandbox sin allow-scripts ni allow-same-origin, así que el HTML
              no ejecuta código ni puede leer la sesión o tocar el chat (además, la CSP de la
              app se hereda en el srcdoc y bloquearía cualquier script igualmente).
            -->
            <iframe
              v-else-if="previewKind === 'html' && !showSource"
              :srcdoc="textContent"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              referrerpolicy="no-referrer"
              class="w-full h-[75vh] rounded-lg border border-slate-800 bg-white"
            ></iframe>
            <pre
              v-else
              class="w-full h-[75vh] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-words select-text"
            >{{ textContent }}</pre>
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
import { ref, computed, watch } from 'vue';
import { X, Download, FileText, Code2, Globe, Loader2 } from 'lucide-vue-next';
import { useDocumentStore } from '@/stores/documents';
import { getFileTypeBadge, getPreviewKind } from '@/utils/fileIcons';

const MAX_TEXT_PREVIEW = 3 * 1024 * 1024;

const docStore = useDocumentStore();
const file = computed(() => docStore.activePreviewFile || {});
const previewKind = computed(() => getPreviewKind(file.value));
const badgeInfo = computed(() => getFileTypeBadge(file.value.file_type));
const badgeStyle = computed(() => badgeInfo.value.bg);

const textContent = ref(null);
const loadingText = ref(false);
const textError = ref('');
const showSource = ref(false);

watch(
  () => docStore.activePreviewFile,
  async (current) => {
    textContent.value = null;
    textError.value = '';
    showSource.value = false;

    const kind = getPreviewKind(current);
    if (kind !== 'html' && kind !== 'text') return;
    if (current.size > MAX_TEXT_PREVIEW) {
      textError.value = 'El archivo es demasiado grande para previsualizarlo. Descárgalo para abrirlo.';
      return;
    }

    loadingText.value = true;
    try {
      const res = await fetch(current.url);
      if (!res.ok) throw new Error(res.status);
      const text = await res.text();
      // Si mientras tanto se abrió otro archivo, descartar
      if (docStore.activePreviewFile === current) textContent.value = text;
    } catch (_) {
      textError.value = 'No se pudo cargar la vista previa.';
    } finally {
      loadingText.value = false;
    }
  }
);
</script>
