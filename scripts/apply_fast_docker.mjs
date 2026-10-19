import fs from "fs";

// 1. Update .dockerignore
const dockerignore = `node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
README.md
.next
.git
.env*.local
*.db
*.db-journal
*.sqlite
*.sqlite-journal
prisma/*.db
prisma/*.db-journal
prisma/dev.db
dev.db
dev.db-journal
production-data
production-data/**
uploads
uploads/**
public/uploads
public/uploads/**
scripts/test*.ts
scripts/test*.js
test*.ts
`;
fs.writeFileSync("d:/ess-os/.dockerignore", dockerignore, "utf8");
console.log("✅ Updated .dockerignore");

// 2. Update next.config.mjs
const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  basePath: "/crmtesting",
  swcMinify: true,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const chatbotUrl = process.env.CHATBOT_URL || "http://187.127.158.24:3300";
    return [
      {
        source: "/api/bots/:path*",
        destination: \`\${chatbotUrl}/api/bots/:path*\`,
      },
      {
        source: "/api/public/chat/:path*",
        destination: \`\${chatbotUrl}/api/public/chat/:path*\`,
      },
    ];
  },
};

export default nextConfig;
`;
fs.writeFileSync("d:/ess-os/next.config.mjs", nextConfig, "utf8");
console.log("✅ Updated next.config.mjs");

// 3. Update Dockerfile
const dockerfile = `# syntax=docker/dockerfile:1

# 1. Builder Stage
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy ONLY package manifest files to guarantee Docker layer caching
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies using cache mount and skip postinstall scripts
RUN --mount=type=cache,target=/root/.npm \\
  if [ -f package-lock.json ]; then npm ci --ignore-scripts --prefer-offline --no-audit --no-fund; \\
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile --ignore-scripts --prefer-offline; \\
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --ignore-scripts; \\
  else echo "Lockfile not found." && exit 1; \\
  fi

# Copy prisma schema and generate client separately
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code (files in .dockerignore like database and uploads are skipped)
COPY . .

# Build Next.js with single worker to eliminate VPS memory thrashing
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_BUILD_WORKERS=1

RUN --mount=type=cache,target=/app/.next/cache \\
  if [ -f package-lock.json ]; then npm run build; \\
  elif [ -f yarn.lock ]; then yarn build; \\
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \\
  else echo "Lockfile not found." && exit 1; \\
  fi

# 2. Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/public/uploads /app/prisma/data/uploads /tmp/uploads && \\
    chown -R nextjs:nodejs /app/public /app/prisma /tmp/uploads && \\
    chmod -R 777 /app/public /app/prisma /tmp/uploads

USER nextjs

EXPOSE 3040

ENV PORT=3040
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
`;
fs.writeFileSync("d:/ess-os/Dockerfile", dockerfile, "utf8");
console.log("✅ Updated Dockerfile");

// 4. Update docker-compose.yml to remove obsolete version attribute
const compose = `services:
  ess-os:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ess-os-app
    ports:
      - "3040:3040"
    volumes:
      - ./production-data:/app/prisma/data
      - ./uploads:/app/public/uploads
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=3040
      - NEXTAUTH_SECRET=super_secret_ess_os_key_2026_!@#
      - DATABASE_URL=file:/app/prisma/data/production.db
      - OLLAMA_URL=http://host.docker.internal:11434
    restart: unless-stopped
`;
fs.writeFileSync("d:/ess-os/docker-compose.yml", compose, "utf8");
console.log("✅ Updated docker-compose.yml");
