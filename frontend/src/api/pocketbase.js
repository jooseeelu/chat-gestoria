import PocketBase from 'pocketbase';

export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || (import.meta.env.DEV ? 'http://localhost:8090' : '/');
export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export function getPbFileUrl(record, filename, thumb = '') {
  if (!record || !filename) return '';
  if (filename.startsWith('blob:') || filename.startsWith('data:') || filename.startsWith('http')) {
    return filename;
  }
  return pb.files.getUrl(record, filename, thumb ? { thumb } : undefined);
}

/**
 * Usuarios exclusivos autorizados en esta fase (Jose Luis y Johan)
 */
export const MOCK_USERS = [
  {
    id: 'user_joseluis_01',
    name: 'Jose Luis',
    email: 'joseluis@gestoriaemadrid.com',
    role: 'admin',
    department: 'IT & Sistemas',
    position: 'Desarrollador',
    status: 'online',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    color: '#c59a3e'
  },
  {
    id: 'user_johan_02',
    name: 'Johan',
    email: 'johanfernix9@gmail.com',
    role: 'member',
    department: 'IT & Sistemas',
    position: 'Desarrollador',
    status: 'online',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    color: '#d4af37'
  }
];

/**
 * Canales estructurados por Departamentos de Gestoría eMadrid
 */
export const MOCK_CHANNELS = [
  {
    id: 'space_general',
    name: 'Gestoría General',
    department: 'General',
    description: 'Canal global de la gestoría para avisos y coordinación institucional',
    icon: 'Building2',
    unread_count: 0
  },
  {
    id: 'space_asesores',
    name: 'Asesoría & Clientes',
    department: 'Asesores',
    description: 'Gestión fiscal, laboral, contable y documentación de clientes',
    icon: 'Briefcase',
    unread_count: 0
  },
  {
    id: 'space_it',
    name: 'Departamento IT & Sistemas',
    department: 'IT & Sistemas',
    description: 'Espacio de coordinación técnica, desarrollo e infraestructura',
    icon: 'Terminal',
    unread_count: 0
  },
  {
    id: 'space_urgencias',
    name: 'Urgencias & Plazos',
    department: 'Urgencias',
    description: 'Vencimientos inminentes AEAT / TGSS y alertas prioritarias',
    icon: 'Zap',
    unread_count: 0
  }
];

export const INITIAL_MESSAGES = {
  'space_it': [
    {
      id: 'msg_it_1',
      channel: 'space_it',
      sender: MOCK_USERS[0], // Jose Luis
      content: 'Canal de IT & Sistemas activo. Espacio para la coordinación técnica, desarrollo de proyectos y soporte del equipo.',
      type: 'text',
      created: new Date().toISOString(),
      attachments: []
    }
  ],
  'space_general': [],
  'space_asesores': [],
  'space_urgencias': []
};

export const STORAGE_KEY_MESSAGES = 'emadrid_chat_messages_v5';
export const STORAGE_KEY_USER = 'emadrid_chat_current_user_v3';

export function loadPersistentMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Limpiar datos antiguos si aún contienen menciones de dokploy o n8n
      const itMessages = parsed['space_it'] || [];
      const hasOldMock = itMessages.some(m => m.content && (m.content.includes('Dokploy') || m.content.includes('n8n')));
      if (!hasOldMock) {
        return parsed;
      }
    }
    // Si viene de versiones anteriores, limpiar claves antiguas
    localStorage.removeItem('emadrid_chat_messages_v3');
    localStorage.removeItem('emadrid_chat_messages_v2');
  } catch (e) {
    console.warn('Error cargando mensajes de localStorage', e);
  }
  return INITIAL_MESSAGES;
}

export function savePersistentMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.warn('Error guardando en localStorage', e);
  }
}
