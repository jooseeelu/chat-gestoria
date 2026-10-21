FROM alpine:3.19

ARG PB_VERSION=0.22.4

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

# Descargar PocketBase binario para Linux amd64
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase

WORKDIR /pb

# Copiar migraciones y hooks declarativos
COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks

EXPOSE 8090

# Ejecutar con migraciones automáticas al arrancar
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--automigrate=1"]
