FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM build AS runtime
ENV HOST=0.0.0.0 PORT=4310
RUN mkdir -p /app/.local /home/node/.codex && chown -R node:node /app /home/node/.codex
USER node
EXPOSE 4310
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4310/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "start"]
