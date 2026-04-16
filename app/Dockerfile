ARG NODE_IMAGE_VERSION=20.18.0-bullseye-slim
ARG NGINX_IMAGE_VERSION=1.27.0

FROM node:${NODE_IMAGE_VERSION} AS dev

ENV NPM_CONFIG_PREFIX=/home/node/.node-global
ENV PATH=$PATH:$NPM_CONFIG_PREFIX/bin

WORKDIR /home/node/ws
RUN chown node:node .
USER node
RUN npm install -g pnpm

# Build from repository root: `docker build -f app/Dockerfile .`
COPY --chown=node:node pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --chown=node:node packages/tiptap/package.json ./packages/tiptap/
COPY --chown=node:node app/package.json ./app/
RUN pnpm install --frozen-lockfile

COPY --chown=node:node packages/tiptap ./packages/tiptap
COPY --chown=node:node app ./app

FROM dev AS build

WORKDIR /home/node/ws/app
RUN pnpm -C ../packages/tiptap run build && pnpm run build-only

FROM nginx:${NGINX_IMAGE_VERSION} AS artifact

WORKDIR /home/nginx
COPY --chown=nginx:nginx app/docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
RUN rm /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx app/nginx.conf /etc/nginx/conf.d/app.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build --chown=nginx:nginx /home/node/ws/app/dist /usr/share/nginx/html/app
ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD [ "nginx", "-g", "daemon off;" ]
