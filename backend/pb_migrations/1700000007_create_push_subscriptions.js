/// <reference path="../pb_data/types.d.ts" />

// Suscripciones Web Push: una por navegador/dispositivo en el que el usuario activa las notificaciones
migrate((db) => {
  const dao = new Dao(db);

  const collection = new Collection({
    name: "push_subscriptions",
    type: "base",
    system: false,
    schema: [
      new SchemaField({
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1
        }
      }),
      new SchemaField({
        name: "endpoint",
        type: "text",
        required: true,
        options: {
          min: null,
          max: 2000,
          pattern: ""
        }
      }),
      new SchemaField({
        name: "keys",
        type: "json",
        required: true,
        options: {
          maxSize: 2000
        }
      }),
      new SchemaField({
        name: "user_agent",
        type: "text",
        required: false,
        options: {
          min: null,
          max: 300,
          pattern: ""
        }
      })
    ],
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != '' && @request.data.user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    // No UNIQUE: la validación de unicidad salta antes que el hook que reemplaza
    // la suscripción de otro usuario en el mismo navegador (push.pb.js)
    indexes: [
      "CREATE INDEX idx_push_endpoint ON push_subscriptions (endpoint)"
    ]
  });

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("push_subscriptions");
  return dao.deleteCollection(collection);
});
