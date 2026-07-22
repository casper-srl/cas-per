# syntax=docker/dockerfile:1

FROM public.ecr.aws/docker/library/node:24.16-alpine3.24 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN NODE_ENV=production npm run build

FROM public.ecr.aws/nginx/nginx:stable-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
