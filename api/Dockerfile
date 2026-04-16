ARG NODE_IMAGE_VERSION=20.18.0-bullseye-slim

FROM node:${NODE_IMAGE_VERSION} AS dev

ENV NPM_CONFIG_PREFIX=/home/node/.node-global
ENV PATH=$PATH:$NPM_CONFIG_PREFIX/bin

RUN apt-get update -y && apt-get install -y procps && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app
RUN chown node:node .
USER node
RUN npm install -g pnpm

# Repository root (monorepo) — Docker build must use context: epicstory root (`docker build -f api/Dockerfile .`)
COPY --chown=node:node pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --chown=node:node packages/tiptap/package.json ./packages/tiptap/
COPY --chown=node:node api/package.json ./api/
RUN pnpm install --frozen-lockfile

COPY --chown=node:node packages/tiptap ./packages/tiptap
COPY --chown=node:node api ./api

FROM dev AS build

WORKDIR /home/node/app/api
RUN pnpm run build

FROM node:${NODE_IMAGE_VERSION} AS artifact

ENV NPM_CONFIG_PREFIX=/home/node/.node-global
ENV PATH=$PATH:$NPM_CONFIG_PREFIX/bin

RUN apt-get update && apt-get install -y dumb-init && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app
RUN chown node:node .
USER node

# Runtime needs hoisted deps + workspace package output for `require('@epicstory/tiptap')`
COPY --from=build --chown=node:node /home/node/app/node_modules ./node_modules
COPY --from=build --chown=node:node /home/node/app/packages/tiptap ./packages/tiptap
COPY --from=build --chown=node:node /home/node/app/api/dist ./api/dist
COPY --from=build --chown=node:node /home/node/app/api/package.json ./api/package.json

WORKDIR /home/node/app/api
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
