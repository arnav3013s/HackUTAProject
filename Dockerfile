FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --chown=node:node assistant.mjs catalog.mjs engagement.mjs fans.mjs faze.mjs rosters.mjs server.mjs services.mjs store.mjs programs.mjs chat-store.mjs ask-faze.mjs faze-knowledge.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p data && chown node:node data
USER node
ENV HOST=0.0.0.0 PORT=4173 DEMO_MODE=0
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=8s CMD ["node", "-e", "fetch('http://127.0.0.1:4173/health').then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>process.exitCode=1)"]
CMD ["node", "server.mjs"]
