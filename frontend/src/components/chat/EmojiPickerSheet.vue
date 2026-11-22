<template>
  <Teleport to="body">
    <div
      v-if="emojiPickerState.open"
      class="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-slate-950/40"
      @click.self="closeEmojiPicker"
    >
      <!-- Todos los emojis Unicode (los de WhatsApp/iPhone), con buscador en español,
           tonos de piel y recientes. Los datos se sirven desde /emoji/es.json -->
      <div class="w-full sm:w-auto rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 animate-fade-in-up">
        <emoji-picker
          ref="pickerRef"
          data-source="/emoji/es.json"
          locale="es"
          class="emoji-sheet"
          :class="isDark ? 'dark' : 'light'"
        ></emoji-picker>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useDark } from '@vueuse/core';
import 'emoji-picker-element';
import es from 'emoji-picker-element/i18n/es';
import { emojiPickerState, closeEmojiPicker } from '@/utils/emojiPicker';
import { useBackToClose } from '@/utils/backStack';

const pickerRef = ref(null);
const isDark = useDark();

function handlePick(event) {
  const emoji = event.detail?.unicode;
  const callback = emojiPickerState.onPick;
  closeEmojiPicker();
  if (emoji && callback) callback(emoji);
}

watch(() => emojiPickerState.open, async (open) => {
  if (!open) return;
  await nextTick();
  const picker = pickerRef.value;
  if (!picker || picker.dataset.ready) return;
  picker.dataset.ready = '1';
  picker.i18n = es;
  picker.addEventListener('emoji-click', handlePick);
});

// El gesto/botón "atrás" cierra el selector
useBackToClose(() => emojiPickerState.open, closeEmojiPicker);
</script>

<style scoped>
.emoji-sheet {
  width: 100%;
  height: 380px;
  --border-size: 0;
  --emoji-size: 1.6rem;
  --num-columns: 8;
  --indicator-color: #d4af37;
  --input-border-radius: 0.75rem;
  --outline-color: #d4af37;
}

@media (min-width: 640px) {
  .emoji-sheet {
    width: 380px;
    height: 420px;
    --num-columns: 9;
  }
}
</style>
