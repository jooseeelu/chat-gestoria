import { reactive } from 'vue';

/**
 * Selector de emojis compartido (uno solo en toda la app).
 * openEmojiPicker((emoji) => ...) lo abre y llama al callback con el emoji elegido.
 */
export const emojiPickerState = reactive({
  open: false,
  onPick: null
});

export function openEmojiPicker(onPick) {
  emojiPickerState.onPick = onPick;
  emojiPickerState.open = true;
}

export function closeEmojiPicker() {
  emojiPickerState.open = false;
  emojiPickerState.onPick = null;
}
