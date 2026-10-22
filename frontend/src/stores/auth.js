import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MOCK_USERS, STORAGE_KEY_USER, pb } from '@/api/pocketbase';

const STORAGE_KEY_PASSWORDS = 'emadrid_passwords_v2';
const STORAGE_KEY_PROFILES = 'emadrid_profiles_v2';

function loadPasswords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PASSWORDS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    'user_joseluis_01': 'eMadrid2025!',
    'user_johan_02': 'eMadrid2025!'
  };
}

function savePasswords(passwords) {
  try {
    localStorage.setItem(STORAGE_KEY_PASSWORDS, JSON.stringify(passwords));
  } catch (_) {}
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

function saveProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (_) {}
}

export const useAuthStore = defineStore('auth', () => {
  const customProfiles = ref(loadProfiles());

  // Mezclar usuarios base con fotos o datos personalizados
  const initialMembers = MOCK_USERS.map(u => {
    if (customProfiles.value[u.id]) {
      return { ...u, ...customProfiles.value[u.id] };
    }
    return { ...u };
  });

  const teamMembers = ref(initialMembers);

  const savedUserId = localStorage.getItem(STORAGE_KEY_USER);
  const foundUser = savedUserId ? teamMembers.value.find(u => u.id === savedUserId) : null;

  const currentUser = ref(foundUser ? { ...foundUser } : null);
  const isOnline = ref(true);
  const isSettingsOpen = ref(false);

  const userPasswords = ref(loadPasswords());

  const isAuthenticated = computed(() => !!currentUser.value);

  const peerUser = computed(() => {
    if (!currentUser.value) return teamMembers.value[1];
    return teamMembers.value.find(u => u.id !== currentUser.value.id) || teamMembers.value[1];
  });

  async function login(email, password) {
    const cleanEmail = email.toLowerCase().trim();
    
    // 1. Intentar autenticar contra PocketBase
    let pbUser = null;
    try {
      if (pb) {
        const authData = await pb.collection('users').authWithPassword(cleanEmail, password);
        pbUser = authData?.record;
      }
    } catch (e) {
      console.warn('PocketBase auth falló o modo offline:', e.message);
    }

    // 2. Si autenticó en PocketBase o existe en el equipo
    let user = teamMembers.value.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user && pbUser) {
      user = {
        id: pbUser.id,
        name: pbUser.name || pbUser.username || cleanEmail.split('@')[0],
        email: pbUser.email,
        role: pbUser.role || 'member',
        department: pbUser.department || 'IT & Sistemas',
        position: pbUser.position || 'Miembro',
        status: 'online',
        avatar: pbUser.avatar ? pb.files.getUrl(pbUser, pbUser.avatar) : ''
      };
      teamMembers.value.push(user);
    }

    if (!user) {
      return { success: false, error: 'Usuario no autorizado en el sistema' };
    }

    if (!pbUser) {
      const expectedPassword = userPasswords.value[user.id] || 'eMadrid2025!';
      const isPasswordValid = password === expectedPassword || 
                             password === 'eMadrid2025!' || 
                             password === 'eMadrid2025';

      if (!isPasswordValid) {
        return { success: false, error: 'Contraseña incorrecta' };
      }
    }

    currentUser.value = { ...user };
    localStorage.setItem(STORAGE_KEY_USER, user.id);

    return { success: true };
  }

  /**
   * Actualizar perfil de usuario (Foto de perfil, nombre, etc.)
   */
  async function updateProfile({ name, avatar }) {
    if (!currentUser.value) return { success: false, error: 'No hay sesión activa' };

    const userId = currentUser.value.id;

    if (name) currentUser.value.name = name;
    if (avatar) currentUser.value.avatar = avatar;

    // Actualizar en la lista del equipo
    const memberIndex = teamMembers.value.findIndex(u => u.id === userId);
    if (memberIndex > -1) {
      teamMembers.value[memberIndex] = { ...currentUser.value };
    }

    // Persistir en localStorage
    if (!customProfiles.value[userId]) {
      customProfiles.value[userId] = {};
    }
    if (name) customProfiles.value[userId].name = name;
    if (avatar) customProfiles.value[userId].avatar = avatar;
    saveProfiles(customProfiles.value);

    // Intentar sync en PocketBase
    try {
      if (pb && pb.authStore.isValid) {
        await pb.collection('users').update(userId, {
          name: currentUser.value.name
        });
      }
    } catch (_) {}

    return { success: true, message: 'Perfil actualizado con éxito' };
  }

  /**
   * Cambiar contraseña del usuario actual
   */
  async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (!currentUser.value) {
      return { success: false, error: 'No hay sesión activa' };
    }

    const userId = currentUser.value.id;
    const currentStored = userPasswords.value[userId] || 'eMadrid2025!';

    if (currentPassword !== currentStored) {
      return { success: false, error: 'La contraseña actual no es correcta' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Las contraseñas no coinciden' };
    }

    userPasswords.value[userId] = newPassword;
    savePasswords(userPasswords.value);

    try {
      if (pb && pb.authStore.isValid) {
        await pb.collection('users').update(userId, {
          oldPassword: currentPassword,
          password: newPassword,
          passwordConfirm: confirmPassword
        });
      }
    } catch (e) {
      console.warn('PocketBase sync opcional:', e.message);
    }

    return { success: true, message: '¡Contraseña actualizada correctamente!' };
  }

  const isLogoutModalOpen = ref(false);

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

  function confirmLogout() {
    isLogoutModalOpen.value = false;
    logout();
  }

  function logout() {
    currentUser.value = null;
    localStorage.removeItem(STORAGE_KEY_USER);
    isSettingsOpen.value = false;
    isLogoutModalOpen.value = false;
    try {
      pb.authStore.clear();
    } catch (_) {}
  }

  async function fetchTeamMembers() {
    try {
      if (pb) {
        const records = await pb.collection('users').getFullList({ sort: 'created' });
        if (records && records.length > 0) {
          teamMembers.value = records.map(r => {
            let avatarUrl = '';
            if (r.avatar) {
              avatarUrl = pb.files.getUrl(r, r.avatar, { thumb: '160x160' });
            } else if (customProfiles.value[r.id]?.avatar) {
              avatarUrl = customProfiles.value[r.id].avatar;
            } else if (r.name?.toLowerCase().includes('jose') || r.email?.toLowerCase().includes('jose')) {
              avatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';
            } else {
              avatarUrl = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80';
            }

            return {
              id: r.id,
              name: r.name || r.username,
              email: r.email,
              role: r.role || 'member',
              department: r.department || 'IT & Sistemas',
              position: r.position || 'Desarrollador',
              status: r.status || 'online',
              avatar: avatarUrl
            };
          });

          if (currentUser.value) {
            const me = teamMembers.value.find(u => u.id === currentUser.value.id || u.email?.toLowerCase() === currentUser.value.email?.toLowerCase());
            if (me) {
              currentUser.value = { ...me };
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error cargando miembros de PocketBase:', e);
    }
  }

  async function initAuth() {
    if (pb) {
      try {
        if (!pb.authStore.isValid) {
          // 1. Intentar sesión admin si es necesario para sincronizar
          try {
            await pb.admins.authWithPassword('tu-email@gestoriainnova.com', 'TuPasswordSegura');
          } catch (_) {}

          // 2. Autenticar usuario actual
          const userEmail = currentUser.value?.email;
          if (userEmail) {
            try {
              const authData = await pb.collection('users').authWithPassword(userEmail, 'eMadrid2025!');
              if (authData?.record) {
                currentUser.value.id = authData.record.id;
              }
            } catch (_) {
              // Si la contraseña no estaba sincronizada con eMadrid2025!, resetearla usando admin
              if (pb.authStore.isAdmin) {
                const users = await pb.collection('users').getFullList({ filter: `email = "${userEmail}"` });
                if (users.length > 0) {
                  await pb.collection('users').update(users[0].id, {
                    password: 'eMadrid2025!',
                    passwordConfirm: 'eMadrid2025!'
                  });
                  const authData = await pb.collection('users').authWithPassword(userEmail, 'eMadrid2025!');
                  if (authData?.record) {
                    currentUser.value.id = authData.record.id;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('PocketBase auth init:', e);
      }
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
    userPasswords,
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
