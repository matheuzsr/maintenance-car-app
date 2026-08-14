FROM node:22-alpine AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY app/backend/package.json ./app/backend/package.json
COPY app/frontend/package.json ./app/frontend/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
RUN npm ci

FROM dependencies AS development
COPY app/backend ./app/backend
WORKDIR /workspace/app/backend
RUN npx prisma generate
CMD ["npm", "run", "start:dev"]

FROM dependencies AS build
COPY app/backend ./app/backend
WORKDIR /workspace/app/backend
RUN npx prisma generate && npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /workspace
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /workspace/node_modules ./node_modules
COPY --from=build --chown=app:app /workspace/app/backend/dist ./app/backend/dist
COPY --from=build --chown=app:app /workspace/app/backend/prisma ./app/backend/prisma
COPY --from=build --chown=app:app /workspace/app/backend/package.json ./app/backend/package.json
USER app
EXPOSE 3000
CMD ["node", "app/backend/dist/src/main.js"]
