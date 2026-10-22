<template>
  <div class="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 animate-fade-in">
    <div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-1.5 rounded-full border border-amber-200/80 dark:border-amber-800/50 shadow-xs">
      <span class="font-bold text-amber-800 dark:text-amber-300">{{ userName }}</span>
      <span class="text-amber-700/80 dark:text-amber-400/80">está escribiendo</span>
      <div class="flex items-center gap-1 ml-1">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-bounce" style="animation-delay: 0ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-bounce" style="animation-delay: 150ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 animate-bounce" style="animation-delay: 300ms"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  userName: {
    type: String,
    default: 'Johan'
  }
});
</script>
