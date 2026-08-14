FROM node:22-alpine AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY app/backend/package.json ./app/backend/package.json
COPY app/frontend/package.json ./app/frontend/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
RUN npm ci

FROM dependencies AS development
COPY app/frontend ./app/frontend
COPY packages/api-contract ./packages/api-contract
WORKDIR /workspace/app/frontend
CMD ["npm", "run", "dev"]

FROM dependencies AS build
ARG NUXT_PUBLIC_API_BASE_URL=http://localhost:3000
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL}
COPY app/frontend ./app/frontend
COPY packages/api-contract ./packages/api-contract
WORKDIR /workspace/app/frontend
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /workspace/app/frontend/.output ./
USER app
EXPOSE 3001
CMD ["node", "server/index.mjs"]
