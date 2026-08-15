# ---- Build stage: compile the React client ----
FROM node:20-slim AS build
WORKDIR /app
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client ./client
RUN npm --prefix client run build

# ---- Runtime stage: API + static client ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/client/dist ./client/dist

# Persist SQLite data and local uploads outside the container image.
VOLUME ["/app/server/data", "/app/server/uploads"]

EXPOSE 5000
CMD ["node", "server/src/index.js"]
