FROM node:18.12.1-bullseye-slim as build

WORKDIR /home/node/app
RUN chown node:node .
USER node
COPY --chown=node:node package*.json .
RUN npm ci && npm cache clean --force
COPY --chown=node:node . .
RUN npm run build

FROM nginx:1.23.3-alpine as artifact

WORKDIR /usr/share/nginx/html
RUN rm -rf *
COPY --from=build --chown=nginx:nginx /home/node/app/dist/ .
