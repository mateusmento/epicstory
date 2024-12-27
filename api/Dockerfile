ARG NODE_IMAGE_VERSION

FROM node:${NODE_IMAGE_VERSION} AS build

# RUN apt-get update -y && apt-get install python3 make g++ -y
WORKDIR /home/node/app
RUN chown node:node .
USER node
COPY --chown=node:node ./package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build

FROM node:${NODE_IMAGE_VERSION} AS artifact

RUN apt-get update && apt-get install -y dumb-init && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /home/node/app
RUN chown node:node .
USER node
COPY --chown=node:node package*.json .
RUN npm ci --omit=dev
COPY --from=build --chown=node:node /home/node/app/dist dist
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
