FROM node:20.12.0-bullseye-slim as build

ARG API_URL
ENV VITE_API_URL=$API_URL
WORKDIR /home/node/app
RUN chown node:node .
USER node
COPY --chown=node:node package*.json .
RUN npm ci
COPY --chown=node:node . .
ENV NODE_ENV=production
RUN npm run build

FROM nginx:1.24.0-bullseye as artifact

WORKDIR /usr/share/nginx/html/
RUN rm -rf *
COPY --from=build --chown=nginx:nginx /home/node/app/dist .