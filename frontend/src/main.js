import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { usePwaStore } from './stores/pwa';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Lo antes posible: el navegador lanza 'beforeinstallprompt' muy pronto
usePwaStore().init();

app.mount('#app');

/**
 * Retirar el splash de index.html cuando la primera pantalla ya está pintada.
 * Al abrir la app instalada (o la primera vez en la sesión) se deja ver un momento
 * la animación; en recargas normales del navegador desaparece en cuanto se puede.
 */
function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  let firstInSession = false;
  try {
    firstInSession = !sessionStorage.getItem('emadrid_splash');
    sessionStorage.setItem('emadrid_splash', '1');
  } catch (_) {}

  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const minVisibleMs = standalone || firstInSession ? 1200 : 0;
  const wait = Math.max(0, minVisibleMs - performance.now());

  setTimeout(() => {
    splash.classList.add('sp-hide');
    setTimeout(() => splash.remove(), 600);
  }, wait);
}

// setTimeout y no requestAnimationFrame: rAF se pausa si la app arranca en segundo plano
// (p. ej. al abrirla desde una notificación en iPhone) y el splash no se iría nunca
router.isReady().then(() => setTimeout(hideSplash, 0));
