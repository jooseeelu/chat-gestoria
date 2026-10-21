<template>
  <div class="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
    <div class="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-300/40 dark:border-slate-700/40">
      <span class="font-medium text-slate-700 dark:text-slate-300">{{ userName }}</span>
      <span class="text-slate-400">está escribiendo</span>
      <div class="flex items-center gap-1 ml-1">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style="animation-delay: 0ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style="animation-delay: 150ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style="animation-delay: 300ms"></span>
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
