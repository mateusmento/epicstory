#!/bin/bash

filename=/usr/share/nginx/html/app/assets/config.extension-*.js # match build output file from src/config.extension.ts

cat <<EOF > $filename
export default {
  API_URL: '$API_URL',
  PEERJS_SERVER_HOST: '$PEERJS_SERVER_HOST',
  PEERJS_SERVER_PATH: '$PEERJS_SERVER_PATH',
  PEERJS_SERVER_PORT: '$PEERJS_SERVER_PORT',
  WEBSOCKET_URI: '$WEBSOCKET_URI'
};
EOF

exec "$@"