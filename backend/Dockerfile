FROM node:22-alpine
WORKDIR /app

COPY package.json ./
COPY tsconfig.base.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm install --ignore-scripts

COPY backend ./backend
COPY shared ./shared
COPY database ./database

RUN npm run build -w @agripulse/shared \
  && npm run db:generate -w @agripulse/backend \
  && npm run build -w @agripulse/backend

EXPOSE 3000
CMD ["sh", "-c", "npm run db:deploy -w @agripulse/backend && npm run start -w @agripulse/backend"]
