ARG NODE_IMAGE_VERSION=20.18.0-bullseye-slim

FROM node:${NODE_IMAGE_VERSION} AS build

ENV NPM_CONFIG_PREFIX=/home/node/.node-global
ENV PATH=$PATH:$NPM_CONFIG_PREFIX/bin

# RUN apt-get update -y && apt-get install python3 make g++ -y
WORKDIR /home/node/app
RUN chown node:node .
USER node
RUN npm install -g pnpm
COPY --chown=node:node package*.json pnpm-lock.yaml ./
RUN pnpm install
COPY --chown=node:node . .
RUN pnpm build

FROM node:${NODE_IMAGE_VERSION} AS artifact

ENV NPM_CONFIG_PREFIX=/home/node/.node-global
ENV PATH=$PATH:$NPM_CONFIG_PREFIX/bin

RUN apt-get update && apt-get install -y dumb-init && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app
RUN chown node:node .
USER node
RUN npm install -g pnpm
COPY --chown=node:node package*.json pnpm-lock.yaml ./
RUN pnpm install --prod
COPY --from=build --chown=node:node /home/node/app/dist dist
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
