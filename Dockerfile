# The Cloud Run Job that makes one comic per execution (scripts/worker.ts).
# The web app runs on Vercel and does not use this image.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
# Full install: the worker runs TypeScript through tsx, a dev dependency.
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY assets ./assets
ENV NODE_ENV=production
CMD ["npx", "tsx", "scripts/worker.ts"]
