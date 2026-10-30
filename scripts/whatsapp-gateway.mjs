import http from "http";
import path from "path";
import fs from "fs";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";

const PORT = 3002;
const AUTH_DIR = path.join(process.cwd(), "whatsapp_auth");
const pinoLogger = pino({ level: "silent" });

let sock = null;
let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const sessionState = {
  status: "DISCONNECTED", // "DISCONNECTED" | "CONNECTING" | "SCAN_QR" | "CONNECTED"
  qrCodeDataUrl: null,
  userPhone: null,
  userName: null,
  lastError: null,
  lastConnectedAt: null,
};

function hasStoredCredentials() {
  try {
    return fs.existsSync(path.join(AUTH_DIR, "creds.json"));
  } catch {
    return false;
  }
}

function cleanAuthDir() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log("[WhatsApp Gateway] Cleared auth directory.");
    }
  } catch (err) {
    console.error("[WhatsApp Gateway] Failed to clean auth directory:", err);
  }
}

function terminateSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      // Remove all event listeners so old sockets do not emit ghost disconnect events
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("creds.update");
      sock.end(undefined);
    } catch (e) {}
    sock = null;
  }
}

async function startWhatsAppSocket(forceNew = false) {
  if (isConnecting) {
    console.log("[WhatsApp Gateway] Connection attempt already in progress...");
    return sessionState;
  }

  if (sock && sessionState.status === "CONNECTED" && !forceNew) {
    return sessionState;
  }

  isConnecting = true;
  sessionState.status = "CONNECTING";
  sessionState.lastError = null;

  try {
    // If forcing a fresh QR / session, terminate socket and clear auth directory
    if (forceNew) {
      console.log("[WhatsApp Gateway] Force-new requested: resetting session and auth files...");
      terminateSocket();
      cleanAuthDir();
      reconnectAttempts = 0;
    } else {
      terminateSocket();
    }

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Fetch the latest WhatsApp Web version dynamically for protocol compatibility
    let waVersion = [2, 3000, 1043857760];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) {
        waVersion = v.version;
        console.log(
          `[WhatsApp Gateway] Using WhatsApp Web version: v${waVersion.join(".")}, isLatest: ${v.isLatest}`
        );
      }
    } catch (vErr) {
      console.warn("[WhatsApp Gateway] Failed to fetch latest WA version, using fallback:", vErr.message);
    }

    sock = makeWASocket({
      version: waVersion,
      auth: state,
      logger: pinoLogger,
      printQRInTerminal: false,
      browser: Browsers.windows("Desktop"),
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      keepAliveIntervalMs: 15_000,
      retryRequestDelayMs: 500,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR Code generation
      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          sessionState.qrCodeDataUrl = qrDataUrl;
          sessionState.status = "SCAN_QR";
          sessionState.lastError = null;
          console.log("[WhatsApp Gateway] Fresh QR code generated and ready to scan.");
        } catch (qrErr) {
          console.error("[WhatsApp Gateway] QR Code generation error:", qrErr);
        }
      }

      // Handle Connected
      if (connection === "open") {
        sessionState.status = "CONNECTED";
        sessionState.qrCodeDataUrl = null;
        sessionState.lastError = null;
        sessionState.lastConnectedAt = new Date().toISOString();
        reconnectAttempts = 0;

        const rawId = sock?.user?.id || "";
        const cleanNumber =
          rawId.split(":")[0]?.replace(/\D/g, "") ||
          rawId.split("@")[0]?.replace(/\D/g, "");
        sessionState.userPhone = cleanNumber || null;
        sessionState.userName = sock?.user?.name || "Hanumanth Chits Admin";
        console.log(
          `[WhatsApp Gateway] Successfully connected as: +${sessionState.userPhone} (${sessionState.userName})`
        );
      }

      // Handle Disconnected / Closed
      if (connection === "close") {
        const boomError = lastDisconnect?.error;
        const statusCode = boomError?.output?.statusCode;
        const errorMsg = boomError?.message || "Connection closed";
        console.log(
          `[WhatsApp Gateway] Connection closed. Status code: ${statusCode}, Reason: ${errorMsg}`
        );

        // Determine if credentials were authenticated previously
        const hadValidCreds = hasStoredCredentials() && sessionState.userPhone;

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
          console.log("[WhatsApp Gateway] Device was logged out or session invalidated. Resetting auth.");
          cleanAuthDir();
          sessionState.status = "DISCONNECTED";
          sessionState.qrCodeDataUrl = null;
          sessionState.userPhone = null;
          sessionState.userName = null;
          sessionState.lastError = "Logged out from phone or session expired. Please scan QR code again.";
        } else if (statusCode === DisconnectReason.connectionReplaced) {
          console.log("[WhatsApp Gateway] Connection replaced by another session. Pausing auto-reconnect.");
          sessionState.status = "DISCONNECTED";
          sessionState.lastError = "Session opened on another computer/browser.";
        } else if (statusCode === DisconnectReason.timedOut || statusCode === 408) {
          // Timeout during QR scan or handshake
          console.log("[WhatsApp Gateway] QR handshake timed out. Waiting for user action.");
          sessionState.status = "DISCONNECTED";
          sessionState.qrCodeDataUrl = null;
          sessionState.lastError = "QR link timed out. Click 'Refresh QR Code' to generate a fresh QR.";
        } else if (hadValidCreds) {
          // Only auto-reconnect if we WERE logged in and lost network connection
          sessionState.status = "DISCONNECTED";
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(reconnectAttempts * 2000, 10000);
            console.log(
              `[WhatsApp Gateway] Lost network. Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
            );
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              startWhatsAppSocket(false).catch(console.error);
            }, delay);
          } else {
            console.log("[WhatsApp Gateway] Max reconnect attempts reached. Waiting for user action.");
            sessionState.lastError = "Connection lost. Please click Reconnect in the app.";
          }
        } else {
          // In QR scan mode or without valid credentials: DO NOT auto-loop!
          sessionState.status = "DISCONNECTED";
          sessionState.qrCodeDataUrl = null;
          sessionState.lastError = "Connection closed. Please click 'Link WhatsApp Now' to generate QR.";
        }
      }
    });

    isConnecting = false;
    return sessionState;
  } catch (err) {
    console.error("[WhatsApp Gateway] Initialization error:", err);
    sessionState.status = "DISCONNECTED";
    sessionState.lastError = err.message || "Failed to initialize";
    isConnecting = false;
    return sessionState;
  }
}

async function resetAuth() {
  terminateSocket();
  cleanAuthDir();
  reconnectAttempts = 0;

  sessionState.status = "DISCONNECTED";
  sessionState.qrCodeDataUrl = null;
  sessionState.userPhone = null;
  sessionState.userName = null;
  sessionState.lastError = null;
  sessionState.lastConnectedAt = null;
}

function formatJid(phone) {
  const clean = String(phone).replace(/\D/g, "");
  if (clean.startsWith("91") && clean.length === 12) {
    return `${clean}@s.whatsapp.net`;
  }
  if (clean.length === 10) {
    return `91${clean}@s.whatsapp.net`;
  }
  return `${clean}@s.whatsapp.net`;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // 1. GET /status
    if (req.method === "GET" && url.pathname === "/status") {
      if (sessionState.status === "DISCONNECTED" && hasStoredCredentials() && !isConnecting) {
        startWhatsAppSocket().catch(console.error);
      }
      res.writeHead(200);
      res.end(JSON.stringify(sessionState));
      return;
    }

    // 2. POST /connect
    if (req.method === "POST" && url.pathname === "/connect") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        const parsed = body ? JSON.parse(body) : {};
        const state = await startWhatsAppSocket(parsed.forceNew || false);

        // If we just initiated connection, wait up to 1500ms for QR code to populate
        if (state.status === "CONNECTING" && !state.qrCodeDataUrl) {
          for (let i = 0; i < 15; i++) {
            if (
              sessionState.qrCodeDataUrl ||
              sessionState.status === "CONNECTED" ||
              sessionState.status === "DISCONNECTED"
            ) {
              break;
            }
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        res.writeHead(200);
        res.end(JSON.stringify(sessionState));
      });
      return;
    }

    // 3. POST /disconnect
    if (req.method === "POST" && url.pathname === "/disconnect") {
      await resetAuth();
      res.writeHead(200);
      res.end(JSON.stringify(sessionState));
      return;
    }

    // 4. POST /send (single message)
    if (req.method === "POST" && url.pathname === "/send") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { phone, message } = JSON.parse(body);
          if (!sock || sessionState.status !== "CONNECTED") {
            res.writeHead(400);
            res.end(
              JSON.stringify({
                success: false,
                error: "WhatsApp is not connected. Please scan QR code in the app first.",
              })
            );
            return;
          }

          const jid = formatJid(phone);
          await sock.sendMessage(jid, { text: message });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, phone, jid }));
        } catch (sendErr) {
          res.writeHead(500);
          res.end(
            JSON.stringify({
              success: false,
              error: sendErr.message || "Failed to send message",
            })
          );
        }
      });
      return;
    }

    // 5. POST /broadcast (multiple recipients in 1 click)
    if (req.method === "POST" && url.pathname === "/broadcast") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { recipients } = JSON.parse(body);
          if (!Array.isArray(recipients) || recipients.length === 0) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: "No recipients provided" }));
            return;
          }

          if (!sock || sessionState.status !== "CONNECTED") {
            res.writeHead(400);
            res.end(
              JSON.stringify({
                success: false,
                error: "WhatsApp is not connected. Please scan QR code in the app first.",
              })
            );
            return;
          }

          const results = [];
          let successful = 0;
          let failed = 0;

          for (let i = 0; i < recipients.length; i++) {
            const r = recipients[i];
            try {
              const jid = formatJid(r.phone);
              await sock.sendMessage(jid, { text: r.message });
              successful++;
              results.push({
                id: r.id,
                name: r.name,
                phone: r.phone,
                success: true,
              });
              console.log(`[WhatsApp Gateway] Sent message to ${r.name} (${r.phone})`);
            } catch (memberErr) {
              failed++;
              results.push({
                id: r.id,
                name: r.name,
                phone: r.phone,
                success: false,
                error: memberErr.message,
              });
              console.error(`[WhatsApp Gateway] Failed to send to ${r.phone}:`, memberErr);
            }

            // 400ms pacing delay between messages
            if (i < recipients.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 400));
            }
          }

          res.writeHead(200);
          res.end(
            JSON.stringify({
              success: successful > 0,
              total: recipients.length,
              successful,
              failed,
              results,
            })
          );
        } catch (bErr) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: bErr.message }));
        }
      });
      return;
    }

    // Default 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  } catch (globalErr) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: globalErr.message }));
  }
});

// Start listening and auto-connect if credentials exist
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[WhatsApp Gateway] Running stably on http://127.0.0.1:${PORT}`);
  if (hasStoredCredentials()) {
    console.log("[WhatsApp Gateway] Found existing credentials, connecting to WhatsApp...");
    startWhatsAppSocket().catch(console.error);
  }
});
