"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { formatINR, formatDate } from "@/lib/formatters";
import {
  sendOneClickBroadcast,
  getBroadcastHistory,
  getWhatsAppConnectionAction,
  initWhatsAppConnectionAction,
  disconnectWhatsAppAction,
} from "@/app/actions";
import {
  X,
  Megaphone,
  MessageCircle,
  Copy,
  Check,
  Send,
  Users,
  Sparkles,
  Phone,
  QrCode,
  RotateCcw,
  BadgeIndianRupee,
  CheckCircle2,
  Clock,
  Zap,
  History,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Smartphone,
  LogOut,
  RefreshCw,
} from "lucide-react";
import confetti from "canvas-confetti";

interface ChitBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChit?: any | null;
  allChits?: any[];
}

interface WhatsAppStatus {
  status: "DISCONNECTED" | "SCAN_QR" | "CONNECTING" | "CONNECTED";
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  lastError: string | null;
  lastConnectedAt: string | null;
}

// Preset customizable templates
const TEMPLATES: { id: string; name: string; icon: string; template: string }[] = [
  {
    id: "installment_due",
    name: "Installment Due Reminder",
    icon: "💰",
    template: `Hello {Name} {Surname},

Greetings from Hanumanth Chits.
This is a gentle reminder that your monthly chit installment of {MonthlyInstallment} for your {ChitAmount} chit is now due.

• Chit Scheme: {ChitAmount}
• Monthly Installment: {MonthlyInstallment}
• Previous Overdue: {PreviousDue}
• Total Amount Payable: {TotalPayable}

Please make the payment at your earliest convenience via Cash, PhonePe/GPay, or Bank Transfer.

Thank you,
Hanumanth Chits`,
  },
  {
    id: "auction_notice",
    name: "Auction / Meeting Notice",
    icon: "🗓️",
    template: `Hello {Name} {Surname},

Important Notice from Hanumanth Chits:
The upcoming monthly auction for your {ChitAmount} chit is scheduled as follows:

• Chit Scheme: {ChitAmount}
• Auction Date: [Enter Date]
• Time: [Enter Time]
• Venue: Hanumanth Chits Office

Please attend the auction in person or contact us in advance to submit your bid.

Thank you,
Hanumanth Chits`,
  },
  {
    id: "auction_result",
    name: "Auction Result & Dividend",
    icon: "📢",
    template: `Hello {Name} {Surname},

Monthly Auction Result from Hanumanth Chits:
The auction for your {ChitAmount} chit has been successfully completed.

• Chit Scheme: {ChitAmount}
• Winning Bid Discount: [Enter Bid Amount]
• Dividend Per Member: [Enter Dividend]
• Net Installment Payable: [Enter Net Amount]
• Due Date: [Enter Due Date]

Please pay the net installment before the due date.

Thank you,
Hanumanth Chits`,
  },
  {
    id: "prize_ready",
    name: "Prize Money Ready",
    icon: "🏆",
    template: `Hello {Name} {Surname},

Good news from Hanumanth Chits!
Your chit prize money for the {ChitAmount} chit is prepared and ready for disbursement.

Please visit our office during working hours along with your surety and required identity documents to collect your payment.

Thank you,
Hanumanth Chits`,
  },
  {
    id: "urgent_overdue",
    name: "Urgent Overdue Notice",
    icon: "⚠️",
    template: `Hello {Name} {Surname},

Urgent Payment Notice from Hanumanth Chits:
Your chit account shows an overdue balance of {PreviousDue}.

• Chit Scheme: {ChitAmount}
• Monthly Installment: {MonthlyInstallment}
• Outstanding Due: {PreviousDue}
• Total Payable: {TotalPayable}

Kindly clear this overdue amount immediately to maintain your chit in good standing.

Thank you,
Hanumanth Chits`,
  },
  {
    id: "custom",
    name: "Custom Announcement",
    icon: "✍️",
    template: `Hello {Name} {Surname},

Notice regarding your {ChitAmount} chit with Hanumanth Chits:

[Type your custom message or announcement here]

Thank you,
Hanumanth Chits`,
  },
];

const AVAILABLE_TAGS = [
  { tag: "{Name}", label: "First Name" },
  { tag: "{Surname}", label: "Surname" },
  { tag: "{Phone}", label: "Phone" },
  { tag: "{Village}", label: "Village" },
  { tag: "{ChitAmount}", label: "Chit Value" },
  { tag: "{MonthlyInstallment}", label: "Monthly Installment" },
  { tag: "{PreviousDue}", label: "Previous Due" },
  { tag: "{TotalPayable}", label: "Total Payable" },
  { tag: "{TodayDate}", label: "Today's Date" },
];

const COMMON_SCHEMES = [
  { label: "1 Lakh Chit", amount: 100000 },
  { label: "50 Thousand Chit", amount: 50000 },
  { label: "2 Lakh Chit", amount: 200000 },
  { label: "5 Lakh Chit", amount: 500000 },
];

interface SchemeOption {
  key: string;
  chitAmount: number;
  startDate?: string;
  label: string;
  subLabel: string;
  recipients: any[];
}

export default function ChitBroadcastModal({
  isOpen,
  onClose,
  initialChit,
  allChits = [],
}: ChitBroadcastModalProps) {
  // Compute distinct Chit groups separated by chitAmount AND startDate
  const distinctGroups = useMemo<SchemeOption[]>(() => {
    const map = new Map<string, SchemeOption>();

    allChits.forEach((c) => {
      const datePart = c.startDate ? new Date(c.startDate).toISOString().split("T")[0] : "unknown";
      const key = `${c.chitAmount}_${datePart}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          chitAmount: c.chitAmount,
          startDate: c.startDate,
          label: `${formatINR(c.chitAmount)} Chit`,
          subLabel: `Started ${formatDate(c.startDate)}`,
          recipients: [],
        });
      }

      const item = map.get(key)!;
      if (!item.recipients.some((r) => r.phone === c.phone)) {
        item.recipients.push(c);
      }
    });

    const groups = Array.from(map.values());
    // Sort date-wise (newest start date first)
    groups.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());

    // Add "All Active Chits" option if more than 1 group
    const allUniqueMap = new Map<string, any>();
    allChits.forEach((c) => {
      if (!allUniqueMap.has(c.phone)) allUniqueMap.set(c.phone, c);
    });

    if (groups.length > 1) {
      groups.push({
        key: "ALL",
        chitAmount: 0,
        label: "All Active Chits",
        subLabel: "All active members",
        recipients: Array.from(allUniqueMap.values()),
      });
    }

    return groups;
  }, [allChits]);

  // Selected chit group key (e.g., "100000_2026-10-27")
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");

  // Message template & content
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("installment_due");
  const [message, setMessage] = useState<string>(TEMPLATES[0].template);

  // Active view: "compose" | "link_wa" | "history"
  const [view, setView] = useState<"compose" | "link_wa" | "history">("compose");

  // WhatsApp Gateway Status
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>({
    status: "DISCONNECTED",
    qrCodeDataUrl: null,
    userPhone: null,
    userName: null,
    lastError: null,
    lastConnectedAt: null,
  });
  const [linkingWA, setLinkingWA] = useState(false);
  const [disconnectingWA, setDisconnectingWA] = useState(false);

  // 1-Click Sending State
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<any | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // History Tab State
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Copy states
  const [copied, setCopied] = useState(false);
  const [copiedPhones, setCopiedPhones] = useState(false);

  // Optional background SMS API key
  const [smsApiKey, setSmsApiKey] = useState("");
  const [showSmsSettings, setShowSmsSettings] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Check WhatsApp Status whenever modal opens
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp status:", err);
    }
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialChit) {
        const d = initialChit.startDate ? new Date(initialChit.startDate).toISOString().split("T")[0] : "unknown";
        setSelectedGroupKey(`${initialChit.chitAmount}_${d}`);
      } else if (distinctGroups.length > 0) {
        setSelectedGroupKey(distinctGroups[0].key);
      }
      setSendSuccess(null);
      setSendError(null);
      setSending(false);
      setCopied(false);
      setCopiedPhones(false);
      setView("compose");

      // Check WhatsApp status immediately
      fetchWhatsAppStatus();
    }
  }, [isOpen, initialChit, distinctGroups]);

  // 2. Poll WhatsApp status while in "link_wa" view or when waiting for QR scan
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOpen && (view === "link_wa" || waStatus.status === "SCAN_QR" || waStatus.status === "CONNECTING")) {
      interval = setInterval(async () => {
        const data = await fetchWhatsAppStatus();
        if (data?.status === "CONNECTED") {
          setView("compose");
          // Trigger confetti on successful connection!
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch (e) {}
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, view, waStatus.status]);

  // 3. Load history when switching to history tab
  useEffect(() => {
    if (view === "history" && isOpen) {
      loadHistory();
    }
  }, [view, isOpen]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const logs = await getBroadcastHistory();
      setHistoryLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Start WhatsApp QR linking process
  const handleStartLinking = async () => {
    setLinkingWA(true);
    setView("link_wa");
    try {
      const res = await fetch("/api/whatsapp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", forceNew: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch (err: any) {
      console.error("Failed to start WhatsApp linking:", err);
    } finally {
      setLinkingWA(false);
    }
  };

  // Disconnect WhatsApp session
  const handleDisconnectWhatsApp = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp from this computer?")) {
      return;
    }
    setDisconnectingWA(true);
    try {
      const res = await fetch("/api/whatsapp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch (err) {
      console.error("Failed to disconnect WhatsApp:", err);
    } finally {
      setDisconnectingWA(false);
    }
  };

  if (!isOpen) return null;

  // Active selected chit scheme group
  const activeGroup = distinctGroups.find((g) => g.key === selectedGroupKey) || distinctGroups[0];
  const recipients = activeGroup ? activeGroup.recipients : [];
  const recipientCount = recipients.length;
  const schemeLabel = activeGroup ? `${activeGroup.label} (${activeGroup.subLabel})` : "Chit Broadcast";

  // Resolve message for preview
  const resolvePreview = (rawText: string, sample: any): string => {
    const defaultAmount = activeGroup?.chitAmount || 100000;
    if (!sample) {
      return rawText
        .replace(/\{Name\}/g, "Srikanth")
        .replace(/\{Surname\}/g, "Goud")
        .replace(/\{Phone\}/g, "8328312357")
        .replace(/\{Village\}/g, "Pochampally")
        .replace(/\{ChitAmount\}/g, formatINR(defaultAmount))
        .replace(/\{MonthlyInstallment\}/g, formatINR(defaultAmount / 20))
        .replace(/\{PreviousDue\}/g, "₹0")
        .replace(/\{TotalPayable\}/g, formatINR(defaultAmount / 20))
        .replace(/\{TodayDate\}/g, formatDate(new Date()));
    }

    const totalPayable = (sample.monthlyInstallment || 0) + (sample.previousDue || 0);

    return rawText
      .replace(/\{Name\}/g, sample.name || "")
      .replace(/\{Surname\}/g, sample.surname || "")
      .replace(/\{Phone\}/g, sample.phone || "")
      .replace(/\{Village\}/g, sample.village || "")
      .replace(/\{ChitAmount\}/g, formatINR(sample.chitAmount))
      .replace(/\{MonthlyInstallment\}/g, formatINR(sample.monthlyInstallment))
      .replace(/\{PreviousDue\}/g, formatINR(sample.previousDue || 0))
      .replace(/\{TotalPayable\}/g, formatINR(totalPayable))
      .replace(/\{TodayDate\}/g, formatDate(new Date()));
  };

  const previewText = resolvePreview(message, recipients[0]);

  // Insert tag at cursor position
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setMessage((prev) => prev + " " + tag);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = message.substring(0, start) + tag + message.substring(end);
    setMessage(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length, start + tag.length);
      }
    }, 50);
  };

  // Change preset template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setMessage(tmpl.template);
    }
  };

  // ================= THE REAL 1-CLICK BROADCAST DISPATCH =================
  const handleSingleClickBroadcast = async () => {
    if (recipients.length === 0) return;

    // If WhatsApp is NOT connected and no SMS key, prompt to scan QR code
    if (waStatus.status !== "CONNECTED" && !smsApiKey.trim()) {
      handleStartLinking();
      return;
    }

    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await sendOneClickBroadcast({
        chitAmount: activeGroup?.chitAmount || 0,
        startDate: activeGroup?.startDate,
        schemeName: schemeLabel,
        message,
        smsApiKey: smsApiKey.trim() || undefined,
      });

      if (res.success) {
        setSendSuccess(res);
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      } else {
        if (res.notLinked) {
          handleStartLinking();
        }
        setSendError(res.error || "Failed to broadcast message");
      }
    } catch (err: any) {
      setSendError(err.message || "An unexpected error occurred");
    } finally {
      setSending(false);
    }
  };

  // WhatsApp Group Share
  const handleShareToWhatsAppGroup = () => {
    const encoded = encodeURIComponent(previewText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // Copy all phone numbers
  const handleCopyPhones = () => {
    const phones = recipients
      .map((r) => r.phone.replace(/\D/g, ""))
      .filter((p) => p.length >= 10)
      .join(", ");

    navigator.clipboard.writeText(phones);
    setCopiedPhones(true);
    setTimeout(() => setCopiedPhones(false), 2500);
  };

  // Copy text
  const handleCopyText = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isConnected = waStatus.status === "CONNECTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-4 max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shrink-0">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl sm:text-2xl font-black">
                  📢 1-Click Chit Broadcast
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider">
                  Real 1-Tap Delivery
                </span>
              </div>
              <p className="text-sm text-slate-300 font-bold">
                Send directly to all members of the chit without opening tabs or drafts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Tabs */}
            <div className="flex bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setView("compose")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors ${
                  view === "compose"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Broadcast</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("link_wa");
                  if (!isConnected && !waStatus.qrCodeDataUrl) {
                    handleStartLinking();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors ${
                  view === "link_wa"
                    ? "bg-emerald-600 text-white"
                    : isConnected
                    ? "text-emerald-400 hover:text-emerald-300"
                    : "text-amber-400 hover:text-amber-300"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{isConnected ? "🟢 Linked" : "🟡 Link WhatsApp"}</span>
              </button>

              <button
                type="button"
                onClick={() => setView("history")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors ${
                  view === "history"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ================= WHATSAPP CONNECTION STATUS STRIP ================= */}
        <div
          className={`px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
            isConnected
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center space-x-2">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {isConnected ? (
              <span>
                <b>WhatsApp Connected:</b> +{waStatus.userPhone} ({waStatus.userName || "Admin"}) • 1-Click Broadcast is Active!
              </span>
            ) : (
              <span>
                <b>WhatsApp Not Linked:</b> Scan QR code once so the app can send directly to Srikanth & Hanumanth.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isConnected ? (
              <button
                type="button"
                disabled={disconnectingWA}
                onClick={handleDisconnectWhatsApp}
                className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-[11px] flex items-center space-x-1"
              >
                <LogOut className="w-3 h-3" />
                <span>{disconnectingWA ? "Unlinking..." : "Unlink Phone"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartLinking}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center space-x-1 shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Link WhatsApp Now</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= VIEW: LINK WHATSAPP (QR CODE) ================= */}
        {view === "link_wa" ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="max-w-xl mx-auto bg-slate-50 p-6 rounded-3xl border-2 border-slate-300 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Smartphone className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                  {isConnected ? "✅ WhatsApp is Connected!" : "Link WhatsApp to Hanumanth Chits"}
                </h4>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  {isConnected
                    ? `Linked to +${waStatus.userPhone} (${waStatus.userName || "Admin"}). You can now broadcast to the 1 Lakh Chit or any chit in 1 click.`
                    : "One-time setup: Scan this QR code from your phone's WhatsApp to enable true 1-click broadcasts."}
                </p>
              </div>

              {/* Connected State */}
              {isConnected ? (
                <div className="p-5 bg-emerald-100/70 border-2 border-emerald-400 rounded-2xl text-left space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-950 font-black text-base">
                    <CheckCircle className="w-6 h-6 text-emerald-700" />
                    <span>Ready for 1-Click Broadcast</span>
                  </div>
                  <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
                    When you click "Send Broadcast" in the chit tab, Hanumanth Chits will send the customized message directly to each member's WhatsApp phone without opening any browser tabs or draft boxes.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setView("compose")}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-black text-sm hover:bg-emerald-800 shadow-md flex items-center space-x-1.5"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-current" />
                      <span>Go to 1-Click Broadcast</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectWhatsApp}
                      className="text-xs font-bold text-rose-700 hover:underline"
                    >
                      Unlink this phone
                    </button>
                  </div>
                </div>
              ) : (
                /* QR Code Display & 3-Step Guide */
                <div className="space-y-5">
                  <div className="bg-white p-4 rounded-2xl border-2 border-emerald-400 inline-block shadow-md mx-auto">
                    {waStatus.qrCodeDataUrl ? (
                      <div className="space-y-2">
                        <img
                          src={waStatus.qrCodeDataUrl}
                          alt="WhatsApp Scan QR Code"
                          className="w-64 h-64 mx-auto rounded-lg"
                        />
                        <span className="text-[11px] font-bold text-slate-500 block animate-pulse">
                          ● Point phone camera at QR code now
                        </span>
                      </div>
                    ) : (
                      <div className="w-64 h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                        <span className="text-xs font-bold text-slate-600">
                          Generating WhatsApp QR Code...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3 Step Instruction Guide */}
                  <div className="text-left bg-white p-4 rounded-2xl border border-slate-300 space-y-2.5 text-xs text-slate-700 font-medium">
                    <div className="font-black text-slate-900 text-sm flex items-center space-x-1.5">
                      <span>How to link in 3 steps:</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                        1
                      </span>
                      <span>
                        Open <b>WhatsApp</b> on your phone (e.g. father's phone).
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                        2
                      </span>
                      <span>
                        Tap <b>Menu (⋮)</b> on Android or <b>Settings</b> on iPhone ➔ Tap <b>Linked Devices</b>.
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                        3
                      </span>
                      <span>
                        Tap <b>Link a Device</b> and point your phone at the QR code above.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-3">
                    <button
                      type="button"
                      disabled={linkingWA}
                      onClick={handleStartLinking}
                      className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${linkingWA ? "animate-spin" : ""}`} />
                      <span>Refresh QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("compose")}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                    >
                      Back to Broadcast
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : view === "history" ? (
          /* ================= VIEW: HISTORY ================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-700" />
                <span>Recent 1-Click Broadcasts</span>
              </h4>
              <span className="text-xs font-bold text-slate-500">
                Audited broadcast records in database
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-500 font-bold">
                Loading broadcast records...
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold">
                No 1-click broadcasts sent yet. Use the "Broadcast" tab to send your first broadcast!
              </div>
            ) : (
              <div className="space-y-3">
                {historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs">
                          {log.chitScheme}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs">
                          {log.recipientCount} Recipients
                        </span>
                        <span className="text-xs text-slate-500 font-bold">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300">
                        {log.channel === "WHATSAPP_DIRECT" ? "✓ Sent Direct via WhatsApp" : "✓ Sent in 1 Click"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line">
                      {log.message}
                    </p>

                    {log.recipients?.length > 0 && (
                      <div className="text-[11px] text-slate-600 font-medium">
                        <b>Recipients:</b>{" "}
                        {log.recipients
                          .map((r: any) => `${r.name || ""} (${r.phone || ""}) ${r.success ? "✅" : "❌"}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ================= VIEW: COMPOSE & 1-CLICK BROADCAST ================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* 1. Scheme Selection Buttons (1 Lakh Chit, 50k, 2 Lakh) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <BadgeIndianRupee className="w-5 h-5 text-emerald-600" />
                  <span>1. Select Chit Scheme (The Whole Chit):</span>
                </label>
                <span className="text-xs font-bold text-emerald-700">
                  * 1 Click delivers to ALL members of this chit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {distinctGroups.map((g) => {
                  const isSelected = selectedGroupKey === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => {
                        setSelectedGroupKey(g.key);
                        setSendSuccess(null);
                        setSendError(null);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]"
                          : "bg-white text-slate-800 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/20"
                      }`}
                    >
                      <div>
                        <span className="text-base font-black block">{g.label}</span>
                        <span
                          className={`text-xs block font-semibold mt-0.5 ${
                            isSelected ? "text-emerald-100" : "text-slate-500"
                          }`}
                        >
                          {g.subLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/20 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                            isSelected
                              ? "bg-white text-emerald-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {g.recipients.length} {g.recipients.length === 1 ? "Member" : "Members"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. SUCCESS SCREEN IF BROADCAST SENT IN 1 CLICK */}
            {sendSuccess && (
              <div className="p-5 rounded-3xl bg-emerald-50 border-3 border-emerald-400 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex items-center space-x-3 text-emerald-950">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-emerald-900">
                      🎉 Broadcast Delivered to All {sendSuccess.sentCount || sendSuccess.recipientCount} Members in 1 Click!
                    </h4>
                    <p className="text-sm text-emerald-800 font-bold">
                      {sendSuccess.channel === "WHATSAPP_DIRECT"
                        ? `Real WhatsApp messages were sent directly from your linked WhatsApp to each member of ${schemeLabel}!`
                        : `Successfully delivered in 1 click to all members of ${schemeLabel}!`}
                    </p>
                  </div>
                </div>

                {/* Recipient confirmation list with delivery checkmarks */}
                {sendSuccess.results?.length > 0 && (
                  <div className="p-3.5 bg-white rounded-2xl border border-emerald-300 space-y-2">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                      Delivery Confirmation:
                    </span>
                    <div className="divide-y divide-slate-100">
                      {sendSuccess.results.map((r: any) => (
                        <div key={r.id || r.phone} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-black text-slate-900">{r.name}</span>
                            <span className="font-mono text-slate-500 font-bold">({r.phone})</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[11px] flex items-center space-x-1">
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span>Delivered via WhatsApp</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSendSuccess(null)}
                    className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
                  >
                    Send Another Notice
                  </button>
                </div>
              </div>
            )}

            {/* ERROR BANNER */}
            {sendError && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">{sendError}</p>
                </div>
              </div>
            )}

            {/* 3. RECIPIENT MEMBERS PREVIEW (Srikanth & Hanumanth) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-indigo-700" />
                  <span>
                    2. Members in this Chit ({recipientCount}):
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyPhones}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPhones ? "Copied Numbers!" : "Copy Numbers"}</span>
                </button>
              </div>

              {recipients.length === 0 ? (
                <p className="text-xs text-slate-500 font-bold italic py-2">
                  No active members enrolled in {schemeLabel} yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((r) => (
                    <div
                      key={r.phone}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-xs flex items-center space-x-2 text-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-black text-slate-900">
                        {r.name} {r.surname}
                      </span>
                      <span className="font-mono text-slate-500 font-bold">
                        ({r.phone})
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                        {formatINR(r.chitAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. TEMPLATE SELECTOR */}
            <div>
              <label className="text-sm font-black text-slate-900 flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>3. Choose Message Template (Or Type Custom):</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2 text-xs font-bold ${
                      selectedTemplateId === tmpl.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base">{tmpl.icon}</span>
                    <span className="truncate">{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. CUSTOMIZABLE MESSAGE AREA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                  <span>4. Customize Message:</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Insert tag:</span>
                  {AVAILABLE_TAGS.slice(0, 5).map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-900 border border-slate-300 font-mono text-[11px] font-bold transition-colors"
                      title={`Insert ${t.label}`}
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Textarea */}
              <textarea
                ref={textareaRef}
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message or customize the template..."
                className="w-full p-4 rounded-2xl border-2 border-slate-300 font-mono text-sm text-slate-900 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 leading-relaxed"
              />
            </div>

            {/* 6. LIVE PREVIEW BOX */}
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                  <span>
                    Live Preview {recipients[0] ? `(for ${recipients[0].name} ${recipients[0].surname})` : `(${schemeLabel})`}
                  </span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-2.5 py-1 rounded-lg bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold text-xs flex items-center space-x-1 shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Text"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareToWhatsAppGroup}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-black text-xs flex items-center space-x-1 shadow-xs"
                    title="Open WhatsApp with message ready to send to Chit Group in 1 click"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Post to WhatsApp Group</span>
                  </button>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl rounded-tl-xs border border-emerald-200 shadow-sm text-sm text-slate-800 whitespace-pre-line font-sans leading-relaxed">
                {previewText}
              </div>
            </div>

            {/* Optional SMS Gateway Settings */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowSmsSettings(!showSmsSettings)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <span>⚙️ Optional: Direct Background SMS Gateway (Fast2SMS)</span>
                <span>{showSmsSettings ? "▲" : "▼"}</span>
              </button>

              {showSmsSettings && (
                <div className="mt-2 p-3.5 bg-slate-50 rounded-xl border border-slate-300 space-y-2 text-xs">
                  <p className="text-slate-600 font-medium">
                    If you want messages delivered as real SMS in addition to WhatsApp, enter your <b>Fast2SMS API Key</b>:
                  </p>
                  <input
                    type="password"
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                    placeholder="Paste Fast2SMS API Key (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs bg-white text-slate-900"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-bold">
            <span>Hanumanth Chits • One-Click Broadcast Engine</span>
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-700 text-sm hover:bg-slate-100"
            >
              Close
            </button>

            {view === "compose" && (
              <>
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={handleStartLinking}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base shadow-lg flex items-center space-x-2 hover:scale-[1.01] transition-all"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>Link WhatsApp to Send (1 Click)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={sending || recipientCount === 0}
                    onClick={handleSingleClickBroadcast}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg flex items-center space-x-2 hover:scale-[1.01] transition-all disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5 text-amber-300 fill-current" />
                    <span>
                      {sending
                        ? "Sending Broadcast to All Phones..."
                        : `Send Broadcast to All ${recipientCount} Members in 1 Click`}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
