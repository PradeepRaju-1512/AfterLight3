/**
 * @file server.ts
 * @brief Development bridge for AI Studio preview environment.
 *
 * Automatically spawns the compiled C++ Crow binary (./build/afterlight_server 5000)
 * and proxies /api/* and /ws WebSocket traffic to the authoritative C++ backend.
 */

import express from 'express';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const CPP_PORT = 5000;

// Ensure C++ binary is running
function startCppServer() {
  const binaryPath = path.resolve(__dirname, 'build/afterlight_server');
  if (!fs.existsSync(binaryPath)) {
    console.warn(`[Bridge] C++ binary not found at ${binaryPath}. Please run cmake --build build.`);
    return;
  }

  console.log(`[Bridge] Launching authoritative C++ Crow server on port ${CPP_PORT}...`);
  const cppProcess = spawn(binaryPath, [CPP_PORT.toString()], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  cppProcess.on('error', (err) => {
    console.error('[Bridge] Failed to start C++ server:', err.message);
  });

  cppProcess.on('exit', (code, signal) => {
    console.log(`[Bridge] C++ server exited with code ${code} / signal ${signal}`);
  });

  process.on('exit', () => {
    cppProcess.kill();
  });
}

// Start C++ server instance
startCppServer();

const app = express();
const server = createServer(app);

// Proxy WebSocket (/ws) and REST API (/api/*) to authoritative C++ Crow server
const cppProxy = createProxyMiddleware({
  target: `http://127.0.0.1:${CPP_PORT}`,
  changeOrigin: true,
  ws: true
});

app.use((req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
    cppProxy(req, res, next);
  } else {
    next();
  }
});

// Serve static frontend assets from /web and /public
app.use(express.static(path.resolve(__dirname, 'web')));
app.use('/public', express.static(path.resolve(__dirname, 'public')));

// Catch-all to serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'web/index.html'));
});

// Forward WebSocket upgrades to C++ Crow server
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/ws')) {
    cppProxy.upgrade(req, socket as any, head);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bridge] AI Studio Web App listening on port ${PORT}`);
  console.log(`[Bridge] Authoritative C++ Crow Backend active on port ${CPP_PORT}`);
});
