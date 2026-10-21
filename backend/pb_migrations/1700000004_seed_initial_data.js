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

  // 2. Crear espacios de trabajo iniciales (Sin hashtags)
  const initialChannels = [
    {
      name: "Desarrollo & Proyectos",
      description: "Espacio de trabajo conjunto para código, tareas y arquitectura",
      icon: "Code2",
      is_direct: false,
      is_private: false
    },
    {
      name: "Documentación & Ficheros",
      description: "Transferencia directa de contratos, especificaciones y archivos",
      icon: "FolderGit2",
      is_direct: false,
      is_private: false
    },
    {
      name: "Fiscal & Facturas",
      description: "Modelos tributarios, hojas de cálculo y balances contables",
      icon: "Receipt",
      is_direct: false,
      is_private: false
    },
    {
      name: "Urgencias & Avisos",
      description: "Prioridades altas y tareas que requieren atención inmediata",
      icon: "Zap",
      is_direct: false,
      is_private: false
    }
  ];
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
        record.set("created_by", createdUserIds[0]); // Andrés
      }
      dao.saveRecord(record);
    } catch (_) {}
  }

  return null;
}, (db) => {
  // En rollback no eliminamos los datos de prueba automáticamente
  return null;
});
