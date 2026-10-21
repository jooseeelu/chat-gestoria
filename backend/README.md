# Backend - PocketBase (Gestoría eMadrid Chat)

Backend ligero y de alto rendimiento basado en **PocketBase** para autenticación, base de datos relacional SQLite con WAL, almacenamiento nativo de archivos (PDFs, Excels, nóminas, imágenes) y eventos en tiempo real mediante Server-Sent Events (SSE / WebSockets).

## Colecciones y Migraciones Declarativas (`pb_migrations/`)
1. `1700000000_init_roles_and_users.js`: Amplía `users` con `role` (`admin`, `member`, `intern`), `position`, `status`, `phone`.
2. `1700000001_create_channels.js`: Colección `channels` para canales públicos, temáticos y chats directos (DMs).
3. `1700000002_create_messages.js`: Mensajes de texto, archivos adjuntos, respuestas en hilo y reacciones.
4. `1700000003_create_attachments.js`: Metadatos de ficheros, tipos clasificados (`pdf`, `spreadsheet`, `image`, etc.) y tags.
5. `1700000004_seed_initial_data.js`: Carga inicial de usuarios del equipo y canales predeterminados:
   - **Andrés**: `andres@gestoriaemadrid.com` (Director / Titular - `admin`)
   - **Jose Luis**: `joseluis@gestoriaemadrid.com` (Desarrollador - `admin`)
   - **Johan**: `johanfernix9@gmail.com` (Desarrollador - `member`)
   - Contraseña inicial por defecto: `eMadrid2025!`
   - Canales: `#general`, `#fiscal-tributario`, `#laboral-nominas`, `#contable-cierres`, `#urgencias`.

## Ejecución Local (Standalone)
Si descargas el binario oficial de PocketBase para Windows/macOS/Linux:
```bash
./pocketbase serve --automigrate=1
```
Panel de administración en: `http://localhost:8090/_/`

## Despliegue en Dokploy / Docker (VPS)
El servicio está dockerizado con Alpine y healthchecks integrados en `docker-compose.yml`.
En Dokploy:
1. Crear una aplicación desde Docker Compose o Dockerfile (`backend/Dockerfile`).
2. Mapear el puerto `8090:8090`.
3. Montar el volumen persistente en `/pb/pb_data`.
4. Variables de entorno opcionales:
   - `N8N_WEBHOOK_URL`: URL del webhook de n8n para procesar documentos subidos automáticamente.
