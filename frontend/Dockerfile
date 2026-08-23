# Stage 1: Build
# Node 22: @capacitor/cli 8.x and vite-plugin-static-copy 4.x expect it.
# @capacitor/assets (sharp/GitHub) is not a lockfile dependency — use npm run assets:android locally with network.
# Official Hub names so a previously pulled image on the VPS can be reused (Iranian
# registry mirrors often TLS-timeout; do not prefix docker.arvancloud.ir/ here).
FROM node:22-alpine AS build-stage

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
    NPM_CONFIG_FETCH_RETRIES=8 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000 \
    NPM_CONFIG_STRICT_SSL=false

COPY package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com \
    || npm ci --registry=https://mirror-npm.runflare.com \
    || npm ci --registry=https://registry.npmjs.org

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
