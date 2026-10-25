<template>
  <!--
    Zona segura del iPhone: con la barra de estado translúcida (app instalada) el
    contenido empezaría debajo del notch / Dynamic Island. La franja superior se
    pinta en azul marino para que la hora y la batería (en blanco) siempre se lean.
  -->
  <div class="safe-area-root h-[100dvh] w-screen overflow-hidden font-sans bg-[#0b1329]">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router';
</script>
