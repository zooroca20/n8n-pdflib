FROM n8nio/n8n:latest

USER root

# Instalar pdf-lib globalmente
RUN npm install -g pdf-lib

# Crear directorio para scripts personalizados
RUN mkdir -p /custom-nodes

USER node
```

**Pero** esto no va a funcionar porque n8n sigue bloqueando `pdf-lib` en el Code Node por seguridad.

---

## Opción B: Mantener dos servicios (RECOMENDADO)

Ya que ya creaste los archivos `package.json` y `server.js`, lo mejor es:

1. **Mantén tu Dockerfile actual para n8n** (sin cambios)
2. **Crea un Dockerfile separado para el servicio PDF** en una carpeta diferente

Estructura en GitHub:
```
/repo
├── /n8n-config
│   └── Dockerfile (tu dockerfile actual)
├── /pdf-service
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
└── docker-compose.yml
