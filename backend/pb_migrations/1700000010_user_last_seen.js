/// <reference path="../pb_data/types.d.ts" />

/**
 * Presencia real ("en línea" / "últ. vez hoy a las 14:32").
 * Antes `status` se ponía en "online" al entrar y nunca volvía a "offline"
 * salvo al cerrar sesión, así que todo el mundo parecía conectado siempre.
 * Ahora la app actualiza `last_seen` cada 30 s mientras está visible.
 */
migrate((db) => {
  const dao = new Dao(db);
  const users = dao.findCollectionByNameOrId("_pb_users_auth_");

  if (!users.schema.getFieldByName("last_seen")) {
    users.schema.addField(new SchemaField({
      name: "last_seen",
      type: "date",
      required: false,
      options: { min: "", max: "" }
    }));
  }
  dao.saveCollection(users);

  // Nadie está realmente conectado al aplicar la migración
  db.newQuery("UPDATE users SET status = 'offline'").execute();

  return null;
}, (db) => {
  return null;
});
