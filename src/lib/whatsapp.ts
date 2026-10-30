import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface WhatsAppSessionState {
  status: "DISCONNECTED" | "SCAN_QR" | "CONNECTING" | "CONNECTED";
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  lastError: string | null;
  lastConnectedAt: string | null;
}

const GATEWAY_URL = "http://127.0.0.1:3002";
let isSpawning = false;

/**
 * Ensures the dedicated standalone WhatsApp gateway is running on port 3002
 */
export async function ensureGatewayRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY_URL}/status`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return true;
  } catch (err) {
    // Gateway is not answering, spawn it
    if (!isSpawning) {
      isSpawning = true;
      try {
        const scriptPath = path.join(process.cwd(), "scripts", "whatsapp-gateway.mjs");
        if (fs.existsSync(scriptPath)) {
          const child = spawn(process.execPath, [scriptPath], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
          });
          child.unref();
          // Give it a moment to boot
          await new Promise((r) => setTimeout(r, 1200));
        }
      } catch (spawnErr) {
        console.error("Failed to auto-spawn WhatsApp gateway:", spawnErr);
      } finally {
        isSpawning = false;
      }
    }
  }

  // Check again
  try {
    const res2 = await fetch(`${GATEWAY_URL}/status`, { signal: AbortSignal.timeout(1500) });
    return res2.ok;
  } catch {
    return false;
  }
}

/**
 * Get current WhatsApp status from gateway
 */
export async function getWhatsAppStatus(): Promise<WhatsAppSessionState> {
  await ensureGatewayRunning();

  try {
    const res = await fetch(`${GATEWAY_URL}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error: any) {
    console.error("Error communicating with WhatsApp gateway:", error.message);
  }

  return {
    status: "DISCONNECTED",
    qrCodeDataUrl: null,
    userPhone: null,
    userName: null,
    lastError: "WhatsApp service starting up...",
    lastConnectedAt: null,
  };
}

/**
 * Trigger connection / QR code generation
 */
export async function initWhatsAppClient(forceNew = false): Promise<WhatsAppSessionState> {
  await ensureGatewayRunning();

  try {
    const res = await fetch(`${GATEWAY_URL}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceNew }),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error: any) {
    console.error("Error initializing WhatsApp client:", error.message);
  }

  return await getWhatsAppStatus();
}

/**
 * Disconnect WhatsApp and remove credentials
 */
export async function disconnectWhatsApp(): Promise<WhatsAppSessionState> {
  await ensureGatewayRunning();

  try {
    const res = await fetch(`${GATEWAY_URL}/disconnect`, {
      method: "POST",
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error: any) {
    console.error("Error disconnecting WhatsApp:", error.message);
  }

  return {
    status: "DISCONNECTED",
    qrCodeDataUrl: null,
    userPhone: null,
    userName: null,
    lastError: null,
    lastConnectedAt: null,
  };
}

/**
 * Send a single WhatsApp message directly
 */
export async function sendDirectWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; phone: string; jid?: string; error?: string }> {
  await ensureGatewayRunning();

  try {
    const res = await fetch(`${GATEWAY_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      phone,
      error: error.message || "Failed to reach WhatsApp service",
    };
  }
}

/**
 * Send a 1-click broadcast to multiple recipients in the chit scheme
 */
export async function broadcastToChitRecipients(
  recipients: Array<{
    id: string;
    name: string;
    surname: string;
    phone: string;
    message: string;
  }>
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    name: string;
    phone: string;
    success: boolean;
    error?: string;
  }>;
}> {
  await ensureGatewayRunning();

  try {
    const res = await fetch(`${GATEWAY_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: recipients.map((r) => ({
          id: r.id,
          name: `${r.name} ${r.surname}`.trim(),
          phone: r.phone,
          message: r.message,
        })),
      }),
      cache: "no-store",
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (error: any) {
    console.error("Broadcast request failed:", error.message);
  }

  return {
    total: recipients.length,
    successful: 0,
    failed: recipients.length,
    results: recipients.map((r) => ({
      id: r.id,
      name: `${r.name} ${r.surname}`.trim(),
      phone: r.phone,
      success: false,
      error: "WhatsApp gateway unreachable",
    })),
  };
}
