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
    description: 'Espacio de desarrollo e integraciones con Jose Luis y Johan',
    icon: 'Terminal',
    unread_count: 1
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
      content: 'Johan, he preparado este canal exclusivo de IT & Sistemas para que coordinemos los despliegues en Dokploy, webhooks de n8n y desarrollo interno de Gestoría eMadrid.',
      type: 'text',
      created: new Date(Date.now() - 3600000 * 2).toISOString(),
      attachments: []
    },
    {
      id: 'msg_it_2',
      channel: 'space_it',
      sender: MOCK_USERS[1], // Johan
      content: '¡Perfecto Jose Luis! Mucho más organizado tener el canal General para toda la gestoría, el de Asesores y este nuestro para el código y servidores.',
      type: 'file',
      created: new Date(Date.now() - 3600000).toISOString(),
      attachments: [
        {
          id: 'att_it_1',
          filename: 'Esquema_Arquitectura_eMadrid_IT.pdf',
          file_type: 'pdf',
          size: 780000,
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        }
      ]
    }
  ],
  'space_general': [
    {
      id: 'msg_gen_1',
      channel: 'space_general',
      sender: MOCK_USERS[0],
      content: 'Canal general de Gestoría eMadrid. Aquí se anunciarán comunicaciones de la gestoría y novedades para todo el equipo.',
      type: 'text',
      created: new Date(Date.now() - 86400000).toISOString(),
      attachments: []
    }
  ],
  'space_asesores': [],
  'space_urgencias': []
};

export const STORAGE_KEY_MESSAGES = 'emadrid_chat_messages_v3';
export const STORAGE_KEY_USER = 'emadrid_chat_current_user_v3';

export function loadPersistentMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (raw) {
      return JSON.parse(raw);
    }
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
