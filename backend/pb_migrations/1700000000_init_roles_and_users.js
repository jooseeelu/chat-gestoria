/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);
  const users = dao.findCollectionByNameOrId("_pb_users_auth_");

  // Añadir campos personalizados al usuario
  users.schema.addField(new SchemaField({
    name: "role",
    type: "select",
    required: true,
    options: {
      maxSelect: 1,
      values: ["admin", "member", "intern"]
    }
  }));

  users.schema.addField(new SchemaField({
    name: "position",
    type: "text",
    required: false,
    options: {
      min: null,
      max: 100,
      pattern: ""
    }
  }));

  users.schema.addField(new SchemaField({
    name: "status",
    type: "select",
    required: false,
    options: {
      maxSelect: 1,
      values: ["online", "busy", "away", "offline"]
    }
  }));

  users.schema.addField(new SchemaField({
    name: "phone",
    type: "text",
    required: false
  }));

  // Reglas de acceso
  users.listRule = "@request.auth.id != ''";
  users.viewRule = "@request.auth.id != ''";
  users.updateRule = "@request.auth.id = id || @request.auth.role = 'admin'";

  return dao.saveCollection(users);
}, (db) => {
  const dao = new Dao(db);
  const users = dao.findCollectionByNameOrId("_pb_users_auth_");
  
  const roleField = users.schema.getFieldByName("role");
  if (roleField) users.schema.removeField(roleField.id);
  
  const posField = users.schema.getFieldByName("position");
  if (posField) users.schema.removeField(posField.id);
  
  const statusField = users.schema.getFieldByName("status");
  if (statusField) users.schema.removeField(statusField.id);

  const phoneField = users.schema.getFieldByName("phone");
  if (phoneField) users.schema.removeField(phoneField.id);

  return dao.saveCollection(users);
});
