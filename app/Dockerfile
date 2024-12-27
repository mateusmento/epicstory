ARG NODE_IMAGE_VERSION
ARG NGINX_IMAGE_VERSION

FROM node:${NODE_IMAGE_VERSION} AS build

WORKDIR /home/node/app
RUN chown node:node .
USER node
COPY --chown=node:node package*.json .
RUN npm ci
COPY --chown=node:node . .
ENV NODE_ENV=production
RUN npm run build

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
