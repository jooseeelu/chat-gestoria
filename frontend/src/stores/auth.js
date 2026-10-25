import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { pb, mapUser } from '@/api/pocketbase';
import { usePwaStore } from './pwa';

// Claves de la versión antigua que lo guardaba todo en el navegador
const LEGACY_KEYS = [
  'emadrid_chat_messages_v5',
  'emadrid_chat_messages_v3',
  'emadrid_chat_messages_v2',
  'emadrid_chat_current_user_v3',
  'emadrid_passwords_v2'
];
const LEGACY_PROFILES_KEY = 'emadrid_profiles_v2';
const LEGACY_MOCK_IDS = {
  'joseluis@gestoriaemadrid.com': 'user_joseluis_01',
  'johanfernix9@gmail.com': 'user_johan_02'
};

export const useAuthStore = defineStore('auth', () => {
  // La sesión es la de PocketBase (persistida por el SDK); no hay login "local"
  const currentUser = ref(pb.authStore.isValid ? mapUser(pb.authStore.model) : null);
  const teamMembers = ref(currentUser.value ? [currentUser.value] : []);
  const isOnline = ref(true);
  const isSettingsOpen = ref(false);
  const isLogoutModalOpen = ref(false);

  const isAuthenticated = computed(() => !!currentUser.value && pb.authStore.isValid);

  // Compañero a mostrar en la barra lateral: el primero que no sea yo
  const peerUser = computed(() => {
    if (!currentUser.value) return null;
    return teamMembers.value.find(u => u.id !== currentUser.value.id) || null;
  });

  pb.authStore.onChange((token, model) => {
    currentUser.value = token && model ? mapUser(model) : null;
  });

  async function login(email, password) {
    const cleanEmail = email.toLowerCase().trim();
    try {
      await pb.collection('users').authWithPassword(cleanEmail, password);
    } catch (e) {
      if (e?.status === 400) {
        return { success: false, error: 'Email o contraseña incorrectos' };
      }
      return { success: false, error: 'No se pudo conectar con el servidor' };
    }
    setStatus('online');
    return { success: true };
  }

  async function setStatus(status) {
    if (!pb.authStore.isValid) return;
    try {
      await pb.collection('users').update(pb.authStore.model.id, { status });
    } catch (_) {}
  }

  /**
   * Actualizar nombre y/o foto de perfil en PocketBase (visible para todo el equipo)
   */
  async function updateProfile({ name, avatarFile }) {
    if (!currentUser.value) return { success: false, error: 'No hay sesión activa' };

    const data = new FormData();
    if (name) data.append('name', name.trim());
    if (avatarFile) data.append('avatar', avatarFile);

    try {
      await pb.collection('users').update(currentUser.value.id, data);
      // authStore.onChange actualiza currentUser con el registro nuevo
      await pb.collection('users').authRefresh();
      await fetchTeamMembers();
      return { success: true, message: 'Perfil actualizado con éxito' };
    } catch (e) {
      console.warn('Error actualizando perfil:', e);
      return { success: false, error: 'No se pudo guardar el perfil en el servidor' };
    }
  }

  /**
   * Cambiar contraseña del usuario actual (validada por PocketBase)
   */
  async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (!currentUser.value) {
      return { success: false, error: 'No hay sesión activa' };
    }
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Las contraseñas no coinciden' };
    }

    const email = currentUser.value.email;
    try {
      await pb.collection('users').update(currentUser.value.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword
      });
    } catch (e) {
      if (e?.data?.data?.oldPassword) {
        return { success: false, error: 'La contraseña actual no es correcta' };
      }
      return { success: false, error: 'No se pudo cambiar la contraseña' };
    }

    // Cambiar la contraseña invalida el token: volver a entrar con la nueva
    try {
      await pb.collection('users').authWithPassword(email, newPassword);
    } catch (_) {}

    return { success: true, message: '¡Contraseña actualizada correctamente!' };
  }

  function openSettings() {
    isSettingsOpen.value = true;
  }

  function closeSettings() {
    isSettingsOpen.value = false;
  }

  function promptLogout() {
    isLogoutModalOpen.value = true;
  }

  function cancelLogout() {
    isLogoutModalOpen.value = false;
  }

  async function confirmLogout() {
    isLogoutModalOpen.value = false;
    // Que este dispositivo deje de recibir notificaciones de esta cuenta
    await usePwaStore().detachPush();
    await setStatus('offline');
    logout();
  }

  function logout() {
    isSettingsOpen.value = false;
    isLogoutModalOpen.value = false;
    pb.realtime.unsubscribe().catch(() => {});
    pb.authStore.clear();
  }

  async function fetchTeamMembers() {
    try {
      const records = await pb.collection('users').getFullList({ sort: 'created' });
      teamMembers.value = records.map(mapUser);
    } catch (e) {
      console.warn('Error cargando miembros de PocketBase:', e);
    }
  }

  /**
   * Si en este navegador quedó una foto guardada por la versión antigua
   * (solo local), subirla una vez a PocketBase para que la vea el equipo.
   */
  async function migrateLegacyAvatar() {
    try {
      const raw = localStorage.getItem(LEGACY_PROFILES_KEY);
      if (!raw) return;
      const profiles = JSON.parse(raw);
      const model = pb.authStore.model;
      const legacy = profiles[model.id] || profiles[LEGACY_MOCK_IDS[model.email?.toLowerCase()]];

      if (!model.avatar && legacy?.avatar?.startsWith('data:image/')) {
        const blob = await (await fetch(legacy.avatar)).blob();
        const ext = blob.type.split('/')[1]?.replace('svg+xml', 'svg') || 'png';
        await updateProfile({ avatarFile: new File([blob], `avatar.${ext}`, { type: blob.type }) });
      }
      localStorage.removeItem(LEGACY_PROFILES_KEY);
    } catch (e) {
      console.warn('No se pudo migrar la foto antigua:', e);
    }
  }

  async function initAuth() {
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));

    if (pb.authStore.isValid) {
      try {
        await pb.collection('users').authRefresh();
      } catch (e) {
        // Solo cerrar sesión si el servidor rechaza el token, no por un fallo de red
        if ([401, 403, 404].includes(e?.status)) {
          logout();
          return;
        }
      }
      await migrateLegacyAvatar();
      setStatus('online');
    }
    await fetchTeamMembers();
  }

  return {
    currentUser,
    teamMembers,
    peerUser,
    isOnline,
    isAuthenticated,
    isSettingsOpen,
    isLogoutModalOpen,
    login,
    initAuth,
    fetchTeamMembers,
    updateProfile,
    changePassword,
    openSettings,
    closeSettings,
    promptLogout,
    cancelLogout,
    confirmLogout,
    logout
  };
});
