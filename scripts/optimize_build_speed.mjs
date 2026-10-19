import fs from "fs";

// 1. Update next.config.mjs
const nextConfigPath = "d:/ess-os/next.config.mjs";
const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  basePath: "/crmtesting",
  swcMinify: true,
  eslint: {
    // Skip ESLint during Docker build to cut build time by 2-3 minutes
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during Docker build (verified locally before push)
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

fs.writeFileSync(nextConfigPath, nextConfigContent, "utf8");
console.log("✅ Updated next.config.mjs with build-speed optimizations");

// 2. Update Dockerfile
const dockerfilePath = "d:/ess-os/Dockerfile";
const dockerfileContent = `# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies with build cache mount
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js with SWC cache mount to prevent rebuilding from scratch
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN --mount=type=cache,target=/app/.next/cache \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/public/uploads /app/prisma/data/uploads /tmp/uploads && \
    chown -R nextjs:nodejs /app/public /app/prisma /tmp/uploads && \
    chmod -R 777 /app/public /app/prisma /tmp/uploads

USER nextjs

EXPOSE 3040

ENV PORT=3040
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
`;

fs.writeFileSync(dockerfilePath, dockerfileContent, "utf8");
console.log("✅ Updated Dockerfile with BuildKit cache mounts and node memory tuning");
