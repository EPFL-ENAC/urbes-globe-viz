FROM node:22-alpine AS build-stage
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY index.html ./
COPY public ./public
COPY src ./src

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

FROM nginx:stable-alpine AS production-stage

RUN mkdir -p /app

COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
