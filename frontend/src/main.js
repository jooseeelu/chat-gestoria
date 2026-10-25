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
