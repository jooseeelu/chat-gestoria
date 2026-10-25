import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { pb } from '@/api/pocketbase';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function sameKey(subscription, keyBytes) {
  const current = subscription?.options?.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  return a.length === keyBytes.length && a.every((v, i) => v === keyBytes[i]);
}

/**
 * App instalable + notificaciones push + avisos breves (toasts)
 */
export const usePwaStore = defineStore('pwa', () => {
  const installPrompt = ref(null);
  const isStandalone = ref(
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const pushEnabled = ref(false);
  const pushBusy = ref(false);

  const toast = ref(null);
  let toastTimer = null;

  // En iPhone no hay botón de instalar: se hace desde Compartir
  const canInstall = computed(() => !isStandalone.value && (!!installPrompt.value || isIOS));

  function showToast(text, kind = 'info', ms = 4500, action = null) {
    toast.value = { text, kind, action };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.value = null;
    }, ms);
  }

  function init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt.value = e;
    });
    window.addEventListener('appinstalled', () => {
      installPrompt.value = null;
      isStandalone.value = true;
      showToast('¡App instalada! Ya puedes abrirla desde tu escritorio o pantalla de inicio.', 'success');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('No se pudo registrar el service worker:', err);
      });
    }
  }

  async function install() {
    if (installPrompt.value) {
      installPrompt.value.prompt();
      await installPrompt.value.userChoice.catch(() => {});
      installPrompt.value = null;
      return;
    }
    if (isIOS) {
      showToast('En iPhone/iPad: pulsa el botón Compartir de Safari y luego "Añadir a pantalla de inicio".', 'info', 9000);
    }
  }

  async function saveSubscription(subscription) {
    const json = subscription.toJSON();
    const me = pb.authStore.model?.id;
    if (!me) return;

    try {
      const existing = await pb.collection('push_subscriptions').getFirstListItem(
        pb.filter('endpoint = {:ep}', { ep: json.endpoint })
      );
      subscriptionRecordId = existing.id; // ya estaba guardada para mí
    } catch (_) {
      const created = await pb.collection('push_subscriptions').create({
        user: me,
        endpoint: json.endpoint,
        keys: json.keys,
        user_agent: navigator.userAgent.slice(0, 300)
      });
      subscriptionRecordId = created.id;
    }
    startPresence();
  }

  // ---------- Presencia: push solo cuando estás fuera de la app ----------
  // Mientras la app está visible, este dispositivo avisa cada 25 s de que está dentro
  // y el servidor no le manda notificaciones. Si se cierra sin avisar, a los 45 s
  // el servidor vuelve a considerarlo fuera.

  let subscriptionRecordId = null;
  let presenceTimer = null;
  let presenceListening = false;

  function setPresence(active) {
    if (!subscriptionRecordId || !pb.authStore.isValid) return;
    pb.collection('push_subscriptions')
      .update(subscriptionRecordId, { active_at: active ? new Date().toISOString() : '' }, { keepalive: true })
      .catch(() => {});
  }

  function onVisibilityForPresence() {
    const visible = document.visibilityState === 'visible';
    setPresence(visible);
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = visible ? setInterval(() => setPresence(true), 25_000) : null;
  }

  function startPresence() {
    if (!presenceListening) {
      presenceListening = true;
      document.addEventListener('visibilitychange', onVisibilityForPresence);
      window.addEventListener('pagehide', () => setPresence(false));
    }
    onVisibilityForPresence();
  }

  function stopPresence() {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = null;
    setPresence(false);
    subscriptionRecordId = null;
  }

  async function subscribe() {
    const registration = await navigator.serviceWorker.ready;
    const { key } = await pb.send('/api/push/vapid-public-key', { method: 'GET' });
    const keyBytes = urlBase64ToUint8Array(key);

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription, keyBytes)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes
      });
    }
    await saveSubscription(subscription);
    pushEnabled.value = true;
  }

  async function enablePush() {
    if (!pushSupported) {
      showToast(
        isIOS && !isStandalone.value
          ? 'En iPhone las notificaciones solo funcionan con la app instalada: Compartir → "Añadir a pantalla de inicio".'
          : 'Este navegador no admite notificaciones push.',
        'error',
        9000
      );
      return;
    }

    pushBusy.value = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para este sitio.', 'error', 7000);
        return;
      }
      await subscribe();
      showToast('Notificaciones activadas: te avisaremos de los mensajes nuevos.', 'success');
    } catch (e) {
      console.warn('Error activando notificaciones:', e);
      showToast('No se pudieron activar las notificaciones. Inténtalo de nuevo.', 'error');
    } finally {
      pushBusy.value = false;
    }
  }

  async function removeSubscriptionRecord(subscription) {
    if (!subscription || !pb.authStore.isValid) return;
    try {
      const record = await pb.collection('push_subscriptions').getFirstListItem(
        pb.filter('endpoint = {:ep}', { ep: subscription.endpoint })
      );
      await pb.collection('push_subscriptions').delete(record.id);
    } catch (_) {}
  }

  async function disablePush() {
    pushBusy.value = true;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      stopPresence();
      await removeSubscriptionRecord(subscription);
      await subscription?.unsubscribe();
      pushEnabled.value = false;
      showToast('Notificaciones desactivadas en este dispositivo.');
    } catch (e) {
      console.warn('Error desactivando notificaciones:', e);
    } finally {
      pushBusy.value = false;
    }
  }

  function togglePush() {
    return pushEnabled.value ? disablePush() : enablePush();
  }

  /**
   * Al entrar: si ya se dio permiso antes, volver a asociar la suscripción a quien
   * ha iniciado sesión (puede ser otra persona en el mismo navegador).
   */
  async function syncPush() {
    if (!pushSupported) return;
    if (Notification.permission === 'default') {
      offerPushOnce();
      return;
    }
    if (Notification.permission !== 'granted') return;
    try {
      await subscribe();
    } catch (e) {
      console.warn('No se pudo sincronizar la suscripción push:', e);
    }
  }

  // Invitar una sola vez (por navegador) a activar las notificaciones
  function offerPushOnce() {
    const KEY = 'emadrid_push_offered';
    try {
      if (localStorage.getItem(KEY)) return;
      localStorage.setItem(KEY, '1');
    } catch (_) {
      return;
    }
    setTimeout(() => {
      showToast('¿Quieres que te avisemos de los mensajes nuevos aunque tengas el chat cerrado?', 'info', 15000, {
        label: 'Activar',
        run: enablePush
      });
    }, 2500);
  }

  /**
   * Al cerrar sesión: este dispositivo deja de recibir los avisos de esa cuenta
   */
  async function detachPush() {
    if (!pushSupported) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      stopPresence();
      await removeSubscriptionRecord(subscription);
    } catch (_) {}
    pushEnabled.value = false;
  }

  return {
    installPrompt,
    isStandalone,
    isIOS,
    canInstall,
    pushSupported,
    pushEnabled,
    pushBusy,
    toast,
    showToast,
    init,
    install,
    enablePush,
    disablePush,
    togglePush,
    syncPush,
    detachPush
  };
});
