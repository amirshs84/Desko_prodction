# Stage 1: Build
# Node 22: @capacitor/cli 8.x and vite-plugin-static-copy 4.x expect it.
# @capacitor/assets (sharp/GitHub) is not a lockfile dependency — use npm run assets:android locally with network.
# Official Hub names so a previously pulled image on the VPS can be reused (Iranian
# registry mirrors often TLS-timeout; do not prefix docker.arvancloud.ir/ here).
FROM node:22-alpine AS build-stage

WORKDIR /app

ENV NPM_CONFIG_CACHE=/root/.npm \
    NPM_CONFIG_FETCH_RETRIES=8 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000 \
    NPM_CONFIG_STRICT_SSL=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package.json package-lock.json ./
# npm cache mount survives a failed ci / failed later build step, so the next
# build does not re-download the whole tree. Runflare npm is skipped (402).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund --registry=https://registry.npmmirror.com \
    || npm ci --prefer-offline --no-audit --no-fund --registry=https://registry.npmjs.org

COPY . .

ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_VAPID_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
