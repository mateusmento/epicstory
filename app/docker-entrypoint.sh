#!/bin/bash

filename=/usr/share/nginx/html/app/assets/config-*.js
echo "export default { API_URL: '$API_URL' };" > $filename
exec "$@"
