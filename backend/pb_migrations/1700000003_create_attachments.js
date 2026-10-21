/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);
  const channels = dao.findCollectionByNameOrId("channels");
  const messages = dao.findCollectionByNameOrId("messages");

  const collection = new Collection({
    name: "attachments",
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
          maxSelect: 1
        }
      }),
      new SchemaField({
        name: "message",
        type: "relation",
        required: false,
        options: {
          collectionId: messages.id,
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1
        }
      }),
      new SchemaField({
        name: "uploader",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: 1,
          maxSelect: 1
        }
      }),
      new SchemaField({
        name: "file",
        type: "file",
        required: true,
        options: {
          maxSelect: 1,
          maxSize: 104857600, // 100 MB
          mimeTypes: [
            "application/pdf",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
            "application/x-zip-compressed",
            "application/x-rar-compressed",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "text/plain",
            "text/csv"
          ],
          thumbs: ["100x100", "400x300"]
        }
      }),
      new SchemaField({
        name: "filename",
        type: "text",
        required: true
      }),
      new SchemaField({
        name: "file_type",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["pdf", "spreadsheet", "image", "archive", "document", "other"]
        }
      }),
      new SchemaField({
        name: "size",
        type: "number",
        required: false
      }),
      new SchemaField({
        name: "mime_type",
        type: "text",
        required: false
      }),
      new SchemaField({
        name: "tags",
        type: "json",
        required: false
      })
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = uploader || @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id = uploader || @request.auth.role = 'admin'",
    indexes: [
      "CREATE INDEX idx_attachments_channel ON attachments (channel)",
      "CREATE INDEX idx_attachments_type ON attachments (file_type)",
      "CREATE INDEX idx_attachments_created ON attachments (created)"
    ]
  });

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("attachments");
  return dao.deleteCollection(collection);
});
