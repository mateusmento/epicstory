#!/bin/bash

filename=/usr/share/nginx/html/app/assets/config-*.js # match generated file from src/app/config.ts

cat <<EOF > $filename
export default {
  API_URL: '$API_URL',
  PEERJS_SERVER_HOST: '$PEERJS_SERVER_HOST',
  PEERJS_SERVER_PORT: '$PEERJS_SERVER_PORT',
  WEBSOCKET_URI: '$WEBSOCKET_URI'
};
EOF

exec "$@"