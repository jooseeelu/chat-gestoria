/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);
  const usersCollection = dao.findCollectionByNameOrId("_pb_users_auth_");
  const channelsCollection = dao.findCollectionByNameOrId("channels");

  // 1. Crear usuarios iniciales del equipo (Jose Luis y Johan)
  const initialUsers = [
    {
      email: "joseluis@gestoriaemadrid.com",
      name: "Jose Luis",
      role: "admin",
      position: "Desarrollador",
      status: "online"
    },
    {
      email: "johanfernix9@gmail.com",
      name: "Johan",
      role: "member",
      position: "Desarrollador",
      status: "online"
    }
  ];

  const createdUserIds = [];

  for (const u of initialUsers) {
    let existingUser = null;
    try {
      existingUser = dao.findAuthRecordByEmail("_pb_users_auth_", u.email);
    } catch (_) {}

    if (!existingUser) {
      const record = new Record(usersCollection);
      record.setEmail(u.email);
      record.setPassword("eMadrid2025!"); // Contraseña temporal inicial
      record.set("name", u.name);
      record.set("role", u.role);
      record.set("position", u.position);
      record.set("status", u.status);
      record.setVerified(true);
      dao.saveRecord(record);
      createdUserIds.push(record.id);
    } else {
      createdUserIds.push(existingUser.id);
    }
  }

  // 2. Crear espacios de trabajo iniciales de Gestoría eMadrid (Sin hashtags)
  const initialChannels = [
    {
      name: "Gestoría General",
      description: "Espacio de coordinación general y avisos para todo el equipo",
      icon: "Building2",
      is_direct: false,
      is_private: false
    },
    {
      name: "Asesoría & Clientes",
      description: "Consultas de expedientes, tramitaciones fiscales y laborales",
      icon: "Briefcase",
      is_direct: false,
      is_private: false
    },
    {
      name: "Departamento IT & Sistemas",
      description: "Desarrollo de software, automatizaciones n8n y soporte técnico",
      icon: "Terminal",
      is_direct: false,
      is_private: false
    },
    {
      name: "Urgencias & Plazos",
      description: "Vencimientos tributarios, notificaciones y requerimientos clave",
      icon: "Zap",
      is_direct: false,
      is_private: false
    }
  ];

  for (const ch of initialChannels) {
    try {
      const record = new Record(channelsCollection);
      record.set("name", ch.name);
      record.set("description", ch.description);
      record.set("icon", ch.icon);
      record.set("is_direct", ch.is_direct);
      record.set("is_private", ch.is_private);
      record.set("members", createdUserIds);
      if (createdUserIds.length > 0) {
        record.set("created_by", createdUserIds[0]);
      }
      dao.saveRecord(record);
    } catch (_) {}
  }

  return null;
}, (db) => {
  return null;
});
