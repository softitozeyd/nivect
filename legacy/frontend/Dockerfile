FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VISIONQC_BUILD_MODE=demo
RUN if [ "$VISIONQC_BUILD_MODE" = "api" ]; then npm run build:api; else npm run build; fi

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
