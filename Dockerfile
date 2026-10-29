FROM node:22-bookworm-slim

# g++/make: compile the C++ engine; python3: SQLite bridge (backend/db_bridge.py)
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ make python3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
