ARG NODE_IMAGE_VERSION
ARG NGINX_IMAGE_VERSION

FROM node:${NODE_IMAGE_VERSION} AS build

ENV NPM_CONFIG_PREFIX=/home/node/.node-global
ENV PATH=$PATH:$NPM_CONFIG_PREFIX/bin

WORKDIR /home/node/app
RUN echo NODE_VERSION=$NODE_IMAGE_VERSION
RUN echo NGINX_VERSION=$NGINX_IMAGE_VERSION
RUN chown node:node .
USER node
RUN npm install -g pnpm
COPY --chown=node:node package*.json pnpm-lock.yaml ./
RUN pnpm install
COPY --chown=node:node . .
ENV NODE_ENV=production
RUN pnpm build-only

FROM nginx:${NGINX_IMAGE_VERSION} AS artifact

WORKDIR /home/nginx
COPY --chown=nginx:nginx docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
RUN rm /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/app.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build --chown=nginx:nginx /home/node/app/dist /usr/share/nginx/html/app
# USER nginx
ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD [ "nginx", "-g", "daemon off;" ]
