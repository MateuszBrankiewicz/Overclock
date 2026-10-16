# Multi-stage Dockerfile for Project: Overclock - Frontend (React 19 + Vite)
FROM node:22-alpine AS build
WORKDIR /app

# Copy dependency specifications
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Runtime stage: Nginx
FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
