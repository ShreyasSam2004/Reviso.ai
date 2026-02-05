#!/bin/sh
set -e

echo "=== Reviso Frontend Starting ==="
echo "PORT: ${PORT:-10000}"
echo "BACKEND_URL: ${BACKEND_URL:-NOT SET}"

# Validate BACKEND_URL
if [ -z "$BACKEND_URL" ]; then
  echo "ERROR: BACKEND_URL environment variable is not set!"
  echo "Set it in your Render dashboard to your backend hostname"
  echo "Example: reviso-backend-xxxx.onrender.com"
  exit 1
fi

# Strip protocol if user accidentally included it
BACKEND_URL=$(echo "$BACKEND_URL" | sed 's|^https://||' | sed 's|^http://||' | sed 's|/$||')
export BACKEND_URL

echo "Using BACKEND_URL: ${BACKEND_URL}"

# Process nginx config template
envsubst '${BACKEND_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "=== Nginx config generated ==="
cat /etc/nginx/conf.d/default.conf
echo "=== Starting nginx ==="

exec nginx -g 'daemon off;'
