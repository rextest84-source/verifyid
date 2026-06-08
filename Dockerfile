FROM node:20-bookworm-slim

WORKDIR /app

# Install deps (include dev for Vite build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Build frontend + copy backend source
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
