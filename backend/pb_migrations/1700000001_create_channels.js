/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const collection = new Collection({
    name: "channels",
    type: "base",
    system: false,
    schema: [
      new SchemaField({
        name: "name",
        type: "text",
        required: true,
        options: {
          min: 1,
          max: 100,
          pattern: ""
        }
      }),
      new SchemaField({
        name: "description",
        type: "text",
        required: false,
        options: {
          min: null,
          max: 500,
          pattern: ""
        }
      }),
      new SchemaField({
        name: "icon",
        type: "text",
        required: false,
        options: {
          min: null,
          max: 50,
          pattern: ""
        }
      }),
      new SchemaField({
        name: "is_direct",
        type: "bool",
        required: false,
        options: {}
      }),
      new SchemaField({
        name: "is_private",
        type: "bool",
        required: false,
        options: {}
      }),
      new SchemaField({
        name: "members",
        type: "relation",
        required: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: null,
          displayFields: ["name", "email", "role"]
        }
      }),
      new SchemaField({
        name: "created_by",
        type: "relation",
        required: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["name", "email"]
        }
      })
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'admin'"
  });

  return new Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("channels");
  return dao.deleteCollection(collection);
});
