FROM n8nio/n8n:latest

USER root
RUN npm install pdf-lib
USER node
