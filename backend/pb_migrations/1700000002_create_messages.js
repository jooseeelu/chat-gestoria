/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);
  const channels = dao.findCollectionByNameOrId("channels");

  const collection = new Collection({
    name: "messages",
    type: "base",
    system: false,
    schema: [
      new SchemaField({
        name: "channel",
        type: "relation",
        required: true,
        options: {
          collectionId: channels.id,
          cascadeDelete: true,
          minSelect: 1,
          maxSelect: 1,
          displayFields: ["name"]
        }
      }),
      new SchemaField({
        name: "sender",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: 1,
          maxSelect: 1,
          displayFields: ["name", "email", "avatar"]
        }
      }),
      new SchemaField({
        name: "content",
        type: "text",
        required: false,
        options: {
          min: null,
          max: 10000,
          pattern: ""
        }
      }),
      new SchemaField({
        name: "type",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["text", "file", "system"]
        }
      }),
      new SchemaField({
        name: "parent_message",
        type: "relation",
        required: false,
        options: {
          collectionId: null, // Self-relation will be updated if needed
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1
        }
      }),
      new SchemaField({
        name: "reactions",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      }),
      new SchemaField({
        name: "pinned",
        type: "bool",
        required: false,
        options: {}
      }),
      new SchemaField({
        name: "read_by",
        type: "relation",
        required: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: null
        }
      })
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id = sender || @request.auth.role = 'admin'",
    indexes: [
      "CREATE INDEX idx_messages_channel ON messages (channel)",
      "CREATE INDEX idx_messages_created ON messages (created)"
    ]
  });

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("messages");
  return dao.deleteCollection(collection);
});
