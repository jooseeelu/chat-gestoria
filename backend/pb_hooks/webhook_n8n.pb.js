/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de integración con n8n para automatizaciones de la Gestoría eMadrid.
 * Cuando se sube un nuevo archivo o se crea un mensaje en un canal de alertas,
 * se puede reenviar el evento a un webhook de n8n para procesamiento de OCR,
 * archivo en Google Drive / Nextcloud o notificaciones externas.
 */

onRecordAfterCreateRequest((e) => {
  const n8nWebhookUrl = $os.getenv("N8N_WEBHOOK_URL");
  if (!n8nWebhookUrl) {
    return; // Si no está configurada la variable en Dokploy/VPS, no hace nada
  }

  try {
    const record = e.record;
    $http.send({
      url: n8nWebhookUrl,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "attachment_created",
        attachmentId: record.id,
        filename: record.get("filename"),
        fileType: record.get("file_type"),
        size: record.get("size"),
        channelId: record.get("channel"),
        uploaderId: record.get("uploader"),
        timestamp: new Date().toISOString()
      }),
      timeout: 5
    });
  } catch (err) {
    console.error("[n8n Hook] Error enviando webhook a n8n:", err);
  }
}, "attachments");
