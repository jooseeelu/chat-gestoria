FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

# Las claves VAPID viven aquí (volumen persistente): si se pierden, todos
# tendrían que volver a activar las notificaciones.
VOLUME /data

EXPOSE 3000

CMD ["node", "server.js"]
