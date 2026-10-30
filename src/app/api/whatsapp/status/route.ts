import { NextResponse } from "next/server";
import {
  getWhatsAppStatus,
  initWhatsAppClient,
  disconnectWhatsApp,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getWhatsAppStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { status: "DISCONNECTED", lastError: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "connect";

    if (action === "disconnect") {
      const status = await disconnectWhatsApp();
      return NextResponse.json(status);
    }

    if (action === "connect") {
      const status = await initWhatsAppClient(body.forceNew || false);
      return NextResponse.json(status);
    }

    const status = await getWhatsAppStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { status: "DISCONNECTED", lastError: error.message },
      { status: 500 }
    );
  }
}
