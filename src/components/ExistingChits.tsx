"use client";

import React, { useEffect, useState, useMemo } from "react";
import { formatINR, formatDate } from "@/lib/formatters";
import {
  getExistingChits,
  markChitCompleted,
  getChitMonthlyAuctions,
  saveChitMonthlyAuction,
  clearChitMonthlyAuction,
  sendChitTakerWhatsAppNoticeAction,
} from "@/app/actions";
import RecordPaymentModal from "@/components/RecordPaymentModal";
import EditChitModal from "@/components/EditChitModal";
import PaymentHistoryModal from "@/components/PaymentHistoryModal";
import ChitBroadcastModal from "@/components/ChitBroadcastModal";
import MemberLedgerModal from "@/components/MemberLedgerModal";
import {
  Search,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  BadgeIndianRupee,
  CheckCircle,
  Edit,
  Receipt,
  AlertTriangle,
  Layers,
  ArrowRight,
  PlusCircle,
  BookOpen,
  Megaphone,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpDown,
  UserCheck,
  Clock,
  ExternalLink,
  X,
  Edit3,
  Trash2,
} from "lucide-react";

interface ExistingChitsProps {
  onGoToAddNew: () => void;
}

interface ChitGroup {
  key: string;
  chitAmount: number;
  startDate: string;
  durationMonths: number;
  monthlyInstallment: number;
  members: any[];
  totalDue: number;
  totalCollected: number;
  totalSchemeValue: number;
}

export default function ExistingChits({ onGoToAddNew }: ExistingChitsProps) {
  const [chits, setChits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<number | null>(null);

  // Set of expanded chit group keys (by default: expand all or first)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Modals state
  const [payChit, setPayChit] = useState<any>(null);
  const [editChit, setEditChit] = useState<any>(null);
  const [historyChit, setHistoryChit] = useState<any>(null);
  const [ledgerMemberId, setLedgerMemberId] = useState<string | null>(null);
  const [broadcastChit, setBroadcastChit] = useState<any>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // Sub-tabs per chit group: "SCHEDULE" (13 Months) or "MEMBERS"
  const [groupSubTab, setGroupSubTab] = useState<Record<string, "SCHEDULE" | "MEMBERS">>({});
  // Month filter per chit group: "ALL" | number (1..durationMonths)
  const [monthFilter, setMonthFilter] = useState<Record<string, number | "ALL">>({});
  // Map of auctions per chit group key
  const [auctionsMap, setAuctionsMap] = useState<Record<string, any[]>>({});

  // Editing / assigning taker modal
  const [editingAuction, setEditingAuction] = useState<{
    group: ChitGroup;
    monthNumber: number;
    existing?: any;
  } | null>(null);

  const [takerFormData, setTakerFormData] = useState({
    takerName: "",
    takerMemberId: "",
    payoutAmount: "",
    bidAmount: "",
    paidDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [savingAuction, setSavingAuction] = useState(false);
  const [whatsNoticeResult, setWhatsNoticeResult] = useState<any | null>(null);

  const loadAllAuctions = async (keys: string[]) => {
    const map: Record<string, any[]> = {};
    await Promise.all(
      keys.map(async (k) => {
        try {
          const res = await getChitMonthlyAuctions(k);
          if (res.success) {
            map[k] = res.records;
          }
        } catch (err) {
          console.error("Error loading auctions for " + k, err);
        }
      })
    );
    setAuctionsMap(map);
  };

  const reloadGroupAuctions = async (groupKey: string) => {
    try {
      const res = await getChitMonthlyAuctions(groupKey);
      if (res.success) {
        setAuctionsMap((prev) => ({ ...prev, [groupKey]: res.records }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadChits = async () => {
    try {
      setLoading(true);
      const res = await getExistingChits(searchQuery);
      setChits(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChits();
  }, [searchQuery]);

  // Group chits by (chitAmount + startDate) so chits starting on different dates are NOT merged!
  const chitGroups = useMemo<ChitGroup[]>(() => {
    const map = new Map<string, ChitGroup>();

    chits.forEach((c) => {
      // Extract YYYY-MM-DD from startDate
      const datePart = c.startDate ? new Date(c.startDate).toISOString().split("T")[0] : "unknown";
      const key = `${c.chitAmount}_${datePart}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          chitAmount: c.chitAmount,
          startDate: c.startDate,
          durationMonths: c.durationMonths,
          monthlyInstallment: c.monthlyInstallment,
          members: [],
          totalDue: 0,
          totalCollected: 0,
          totalSchemeValue: 0,
        });
      }

      const group = map.get(key)!;
      group.members.push(c);
      group.totalDue += c.previousDue || 0;
      group.totalCollected += c.totalPaid || 0;
      group.totalSchemeValue += c.chitAmount;
    });

    let groups = Array.from(map.values());

    // Filter by scheme amount if selected
    if (selectedSchemeFilter !== null) {
      groups = groups.filter((g) => g.chitAmount === selectedSchemeFilter);
    }

    // Sort by Date wise order
    groups.sort((a, b) => {
      const timeA = new Date(a.startDate).getTime();
      const timeB = new Date(b.startDate).getTime();
      return sortOrder === "NEWEST" ? timeB - timeA : timeA - timeB;
    });

    return groups;
  }, [chits, sortOrder, selectedSchemeFilter]);

  // Auto-expand all when loaded or when searching
  useEffect(() => {
    if (chitGroups.length > 0) {
      setExpandedKeys((prev) => {
        // If empty, expand all by default for convenience
        if (prev.size === 0) {
          return new Set(chitGroups.map((g) => g.key));
        }
        return prev;
      });
    }
  }, [chitGroups]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedKeys(new Set(chitGroups.map((g) => g.key)));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  const handleMarkComplete = async (chitId: string, memberName: string) => {
    if (confirm(`Are you sure you want to mark "${memberName}"'s chit as completed?`)) {
      try {
        await markChitCompleted(chitId);
        loadChits();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleWhatsApp = (phone: string, name: string, due: number) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hello ${name},\nGreetings from Hanumanth Chits.\nContacting you regarding your monthly chit installment.${
        due > 0 ? ` Current balance due: ${formatINR(due)}.` : ""
      }\nThank you.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, "_blank");
  };

  // Load auctions when chit groups change
  useEffect(() => {
    if (chitGroups.length > 0) {
      loadAllAuctions(chitGroups.map((g) => g.key));
    }
  }, [chitGroups]);

  const openAssignTakerModal = (group: ChitGroup, monthNumber: number, existing?: any) => {
    setEditingAuction({ group, monthNumber, existing });
    const startDate = new Date(group.startDate);
    const expectedMonthDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + monthNumber - 1,
      startDate.getDate()
    );

    if (existing) {
      setTakerFormData({
        takerName: existing.takerName || "",
        takerMemberId: existing.takerMemberId || "",
        payoutAmount: existing.payoutAmount ? String(existing.payoutAmount) : String(group.chitAmount),
        bidAmount: existing.bidAmount ? String(existing.bidAmount) : "",
        paidDate: existing.paidDate ? existing.paidDate.slice(0, 10) : expectedMonthDate.toISOString().slice(0, 10),
        notes: existing.notes || "",
      });
    } else {
      setTakerFormData({
        takerName: "",
        takerMemberId: "",
        payoutAmount: String(group.chitAmount),
        bidAmount: "",
        paidDate: expectedMonthDate.toISOString().slice(0, 10),
        notes: "",
      });
    }
  };

  const handleSaveTaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuction) return;
    if (!takerFormData.takerName.trim()) {
      alert("Please enter or select the name of the person taking the chit");
      return;
    }

    setSavingAuction(true);
    try {
      const res = await saveChitMonthlyAuction({
        chitSchemeKey: editingAuction.group.key,
        chitAmount: editingAuction.group.chitAmount,
        startDate: editingAuction.group.startDate,
        monthNumber: editingAuction.monthNumber,
        monthDate: takerFormData.paidDate,
        takerName: takerFormData.takerName,
        takerMemberId: takerFormData.takerMemberId || undefined,
        bidAmount: takerFormData.bidAmount ? Number(takerFormData.bidAmount) : undefined,
        payoutAmount: takerFormData.payoutAmount ? Number(takerFormData.payoutAmount) : undefined,
        paidDate: takerFormData.paidDate,
        notes: takerFormData.notes,
      });

      if (res.success) {
        await reloadGroupAuctions(editingAuction.group.key);
        setEditingAuction(null);
      } else {
        alert(res.error || "Failed to save chit taker");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save chit taker");
    } finally {
      setSavingAuction(false);
    }
  };

  const handleClearTaker = async (groupKey: string, monthNumber: number) => {
    if (!confirm(`Are you sure you want to clear the taker for Month ${monthNumber}?`)) return;
    try {
      const res = await clearChitMonthlyAuction(groupKey, monthNumber);
      if (res.success) {
        await reloadGroupAuctions(groupKey);
      } else {
        alert(res.error || "Failed to clear taker");
      }
    } catch (err: any) {
      alert(err.message || "Failed to clear taker");
    }
  };

  const handleSendTakerNotice = async (group: ChitGroup, monthNumber: number, auction: any) => {
    let phone = "";
    if (auction.takerMemberId) {
      const found = group.members.find((m) => m.memberId === auction.takerMemberId || m.id === auction.takerMemberId);
      if (found) phone = found.phone;
    }
    if (!phone) {
      const matched = group.members.find(
        (m) => `${m.name} ${m.surname}`.toLowerCase().trim() === (auction.takerName || "").toLowerCase().trim()
      );
      if (matched) phone = matched.phone;
    }

    if (!phone) {
      const inputPhone = prompt(`Enter 10-digit mobile number for ${auction.takerName}:`, "");
      if (!inputPhone) return;
      phone = inputPhone;
    }

    try {
      const res = await sendChitTakerWhatsAppNoticeAction({
        phone,
        takerName: auction.takerName,
        monthNumber,
        chitAmount: group.chitAmount,
        payoutAmount: auction.payoutAmount,
        date: auction.paidDate ? formatDate(auction.paidDate) : undefined,
      });
      if (res.success) {
        setWhatsNoticeResult({ ...res, takerName: auction.takerName, phone });
      } else {
        alert(res.error || "Failed to send WhatsApp notice");
      }
    } catch (err: any) {
      alert(err.message || "Failed to send notice");
    }
  };

  // High level totals
  const totalActiveValue = chits.reduce((sum, c) => sum + c.chitAmount, 0);
  const totalOverdue = chits.reduce((sum, c) => sum + (c.previousDue || 0), 0);
  const availableAmounts = Array.from(new Set(chits.map((c) => c.chitAmount))).sort(
    (a, b) => a - b
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              📋 Running Chits
            </h2>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-black text-sm border border-indigo-300">
              {chitGroups.length} {chitGroups.length === 1 ? "Active Chit" : "Active Chits"}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-sm border border-emerald-300">
              {chits.length} Members Enrolled
            </span>
          </div>
          <p className="text-base text-slate-600 mt-1 font-medium">
            Chits organized date-wise. Click any chit to view its enrolled members.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0 flex-wrap gap-2">
          <button
            onClick={() => {
              setBroadcastChit(null);
              setIsBroadcastOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-base shadow-md transition-all"
            title="Broadcast notice or reminders to chit members"
          >
            <Megaphone className="w-5 h-5 text-amber-400" />
            <span>📢 Broadcast Notice</span>
          </button>

          <button
            onClick={onGoToAddNew}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>➕ Add New Chit</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Chit Groups
          </span>
          <p className="text-3xl font-black text-slate-900 mt-1">{chitGroups.length}</p>
          <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
            Separated by date
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Enrolled Members
          </span>
          <p className="text-3xl font-black text-indigo-700 mt-1">{chits.length}</p>
          <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
            Across all active chits
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Business Value
          </span>
          <p className="text-3xl font-black text-emerald-700 mt-1">{formatINR(totalActiveValue)}</p>
          <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
            Cumulative pool
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-rose-300 bg-rose-50/40 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
            Total Overdue Due
          </span>
          <p className="text-3xl font-black text-rose-700 mt-1">{formatINR(totalOverdue)}</p>
          <span className="text-xs text-rose-600 font-semibold mt-0.5 block">
            Pending collection
          </span>
        </div>
      </div>

      {/* Search & Scheme Filters & Expand Toggles */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member name, phone, village, or chit amount..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* Date-wise Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "NEWEST" ? "OLDEST" : "NEWEST")}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center space-x-1.5"
              title="Toggle Date Sorting"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              <span>Date: {sortOrder === "NEWEST" ? "Newest First" : "Oldest First"}</span>
            </button>

            {/* Expand / Collapse All */}
            <button
              type="button"
              onClick={expandedKeys.size === chitGroups.length ? collapseAll : expandAll}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center space-x-1"
            >
              <span>{expandedKeys.size === chitGroups.length ? "Collapse All" : "Expand All"}</span>
            </button>
          </div>
        </div>

        {/* Chit Scheme Value Filter Pills */}
        {availableAmounts.length > 1 && (
          <div className="flex items-center space-x-2 overflow-x-auto pt-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSchemeFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedSchemeFilter === null
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Chit Values ({chits.length})
            </button>
            {availableAmounts.map((amt) => {
              const count = chits.filter((c) => c.chitAmount === amt).length;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSelectedSchemeFilter(amt)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                    selectedSchemeFilter === amt
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {formatINR(amt)} Chit ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chit List (Organized by Chit Value & Date) */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-bold">Loading running chits...</p>
        </div>
      ) : chitGroups.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-300 text-center space-y-3">
          <BadgeIndianRupee className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-700">No Running Chits Found</h3>
          <p className="text-sm text-slate-500">
            {searchQuery
              ? "No chits match your search. Try a different query."
              : "No active chits are currently running. Add a new chit to get started."}
          </p>
          <button
            onClick={onGoToAddNew}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md inline-flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Chit</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {chitGroups.map((group, idx) => {
            const isExpanded = expandedKeys.has(group.key);
            const memberNamesPreview = group.members
              .map((m) => `${m.name} ${m.surname}`)
              .join(", ");

            return (
              <div
                key={group.key}
                className="bg-white rounded-3xl border-3 border-slate-300 shadow-md overflow-hidden transition-all hover:border-indigo-400"
              >
                {/* ================= CHIT GROUP HEADER (ONLY CHIT VALUE & DATE) ================= */}
                <div
                  onClick={() => toggleExpand(group.key)}
                  className="p-5 sm:p-6 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition-colors border-b-2 border-slate-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Chit Value & Start Date Badge */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {formatINR(group.chitAmount)} Chit
                        </span>

                        <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-black text-xs sm:text-sm border border-indigo-300 flex items-center space-x-1.5">
                          <Calendar className="w-4 h-4 text-indigo-700" />
                          <span>Started on: {formatDate(group.startDate)}</span>
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                          Active Scheme #{idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-xs sm:text-sm font-semibold text-slate-600 flex-wrap gap-y-1">
                        <span>
                          <b>Duration:</b> {group.durationMonths} Months
                        </span>
                        <span>•</span>
                        <span>
                          <b>Installment:</b> {formatINR(group.monthlyInstallment)} / month
                        </span>
                        <span>•</span>
                        <span className="text-indigo-900 font-bold">
                          <b>Total Value:</b> {formatINR(group.totalSchemeValue)}
                        </span>
                        {group.totalDue > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-rose-700 font-black">
                              Total Overdue: {formatINR(group.totalDue)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Enrolled Count, Broadcast Button & Expand Toggle */}
                    <div className="flex items-center space-x-3 self-start lg:self-auto flex-wrap gap-2">
                      {/* Broadcast Specifically to Members in THIS Chit */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBroadcastChit(group.members[0]);
                          setIsBroadcastOpen(true);
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-md transition-all"
                        title={`Send broadcast specifically to members of ${formatINR(group.chitAmount)} chit started ${formatDate(group.startDate)}`}
                      >
                        <Megaphone className="w-4 h-4 text-amber-400" />
                        <span>📢 Broadcast ({group.members.length})</span>
                      </button>

                      {/* Click to Expand / Collapse Members Toggle */}
                      <div className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white border-2 border-indigo-300 text-indigo-950 font-black text-xs sm:text-sm shadow-xs">
                        <Users className="w-4 h-4 text-indigo-700" />
                        <span>
                          {group.members.length} {group.members.length === 1 ? "Member" : "Members"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-700" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Member Name Preview Strip */}
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-bold text-slate-700">Members:</span>
                      <span className="truncate text-slate-600 font-semibold">
                        {memberNamesPreview}
                      </span>
                    </div>
                    <span className="text-indigo-700 font-bold shrink-0 ml-2">
                      {isExpanded ? "▲ Click to hide details" : "▼ Click to view 13 months & members"}
                    </span>
                  </div>
                </div>

                {/* ================= DETAILS SECTION (EXPANDABLE) ================= */}
                {isExpanded && (() => {
                  const currentSubTab = groupSubTab[group.key] || "SCHEDULE";
                  const groupAuctions = auctionsMap[group.key] || [];
                  const takenCount = groupAuctions.filter((a: any) => a.takerName && a.takerName.trim()).length;
                  const selectedMonth = monthFilter[group.key] || "ALL";
                  const monthsToRender = selectedMonth === "ALL"
                    ? Array.from({ length: group.durationMonths }, (_, idx) => idx + 1)
                    : [Number(selectedMonth)];
                  const startDateObj = new Date(group.startDate);

                  return (
                    <div className="p-4 sm:p-6 bg-slate-100/60 border-t-2 border-slate-200 space-y-5 animate-in fade-in duration-200">
                      {/* Sub-Tab Switcher */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupSubTab((prev) => ({ ...prev, [group.key]: "SCHEDULE" }));
                            }}
                            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs ${
                              currentSubTab === "SCHEDULE"
                                ? "bg-indigo-600 text-white shadow-indigo-200"
                                : "bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>📅 {group.durationMonths} Months Schedule & Chit Takers</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                currentSubTab === "SCHEDULE"
                                  ? "bg-indigo-800 text-white"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {takenCount}/{group.durationMonths} Taken
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupSubTab((prev) => ({ ...prev, [group.key]: "MEMBERS" }));
                            }}
                            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs ${
                              currentSubTab === "MEMBERS"
                                ? "bg-indigo-600 text-white shadow-indigo-200"
                                : "bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <Users className="w-4 h-4" />
                            <span>👥 Enrolled Members ({group.members.length})</span>
                          </button>
                        </div>

                        <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                          {formatINR(group.chitAmount)} Chit • Started {formatDate(group.startDate)}
                        </span>
                      </div>

                      {/* View 1: 13-MONTH SCHEDULE & CHIT TAKERS */}
                      {currentSubTab === "SCHEDULE" && (
                        <div className="space-y-4">
                          {/* Month Filter Bar */}
                          <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 flex items-center space-x-2 overflow-x-auto scrollbar-thin">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center space-x-1">
                              <span>Month:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setMonthFilter((prev) => ({ ...prev, [group.key]: "ALL" }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                                selectedMonth === "ALL"
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              All ({group.durationMonths} Months)
                            </button>
                            {Array.from({ length: group.durationMonths }, (_, idx) => idx + 1).map((m) => {
                              const isTaken = groupAuctions.some(
                                (a: any) => a.monthNumber === m && a.takerName?.trim()
                              );
                              const isSelected = selectedMonth === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setMonthFilter((prev) => ({ ...prev, [group.key]: m }))}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 flex items-center space-x-1.5 transition-all ${
                                    isSelected
                                      ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300"
                                      : isTaken
                                      ? "bg-emerald-50 text-emerald-900 border-2 border-emerald-300 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  <span>M{m}</span>
                                  {isTaken && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                </button>
                              );
                            })}
                          </div>

                          {/* Grid / List of Months */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {monthsToRender.map((m) => {
                              const expectedMonthDate = new Date(
                                startDateObj.getFullYear(),
                                startDateObj.getMonth() + m - 1,
                                startDateObj.getDate()
                              );
                              const auction = groupAuctions.find((a: any) => a.monthNumber === m);
                              const isTaken = Boolean(auction && auction.takerName?.trim());

                              return (
                                <div
                                  key={m}
                                  className={`rounded-2xl border-2 p-4 sm:p-5 transition-all shadow-xs ${
                                    isTaken
                                      ? "bg-emerald-50/40 border-emerald-300 hover:border-emerald-400"
                                      : "bg-white border-dashed border-slate-300 hover:border-indigo-300"
                                  }`}
                                >
                                  {/* Header: Month badge + Date + Status */}
                                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                                    <div className="flex items-center space-x-2">
                                      <span
                                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                                          isTaken
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-200 text-slate-800"
                                        }`}
                                      >
                                        Month {m} of {group.durationMonths}
                                      </span>
                                      <span className="text-xs font-bold text-slate-600 flex items-center space-x-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        <span>
                                          {formatDate(
                                            isTaken && auction.paidDate
                                              ? auction.paidDate
                                              : expectedMonthDate.toISOString()
                                          )}
                                        </span>
                                      </span>
                                    </div>

                                    {isTaken ? (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Taken / ఎత్తుకున్నారు</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Available</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Body: Taker Info OR Available Call to action */}
                                  <div className="py-3">
                                    {isTaken ? (
                                      <div className="space-y-2.5">
                                        <div>
                                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            Chit Taker (చీటీ ఎత్తుకున్నవారు):
                                          </span>
                                          <div className="flex items-center space-x-2 mt-0.5">
                                            <h4 className="text-lg sm:text-xl font-black text-slate-900">
                                              👤 {auction.takerName}
                                            </h4>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                          <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 font-bold text-emerald-950">
                                            💰 Payout:{" "}
                                            <span className="font-black text-sm">
                                              {formatINR(auction.payoutAmount || group.chitAmount)}
                                            </span>
                                          </div>
                                          {auction.bidAmount ? (
                                            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-700">
                                              📉 Discount: {formatINR(auction.bidAmount)}
                                            </div>
                                          ) : null}
                                        </div>

                                        {auction.notes && (
                                          <p className="text-xs text-slate-600 italic bg-white/70 p-2 rounded-xl border border-slate-200">
                                            📝 {auction.notes}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="py-2 space-y-2">
                                        <div className="text-xs text-slate-500 font-medium">
                                          Chit payout value:{" "}
                                          <span className="font-black text-slate-800">
                                            {formatINR(group.chitAmount)}
                                          </span>{" "}
                                          (Scheduled for {formatDate(expectedMonthDate.toISOString())})
                                        </div>
                                        <p className="text-xs text-amber-700 font-bold">
                                          ఈ నెలకు ఇంకా ఎవరూ చీటీ ఎత్తుకోలేదు. పేరు రాయడానికి క్రింది బటన్ నొక్కండి.
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Footer Actions */}
                                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                                    {isTaken ? (
                                      <>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            type="button"
                                            onClick={() => openAssignTakerModal(group, m, auction)}
                                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 transition-all shadow-xs"
                                          >
                                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>Edit Taker</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleSendTakerNotice(group, m, auction)}
                                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs"
                                            title="Send WhatsApp confirmation slip to taker"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5 text-white" />
                                            <span>WhatsApp Slip</span>
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleClearTaker(group.key, m)}
                                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all"
                                          title="Clear taker for this month"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openAssignTakerModal(group, m, undefined)}
                                        className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md transition-all"
                                      >
                                        <Edit3 className="w-4 h-4 text-amber-300" />
                                        <span>✍️ Write Chit Taker Name (చీటీ ఎత్తుకున్నవారి పేరు రాయండి)</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* View 2: ENROLLED MEMBERS */}
                      {currentSubTab === "MEMBERS" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                              <Users className="w-4 h-4 text-indigo-700" />
                              <span>
                                Enrolled Members in this Chit ({group.members.length}):
                              </span>
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {formatINR(group.chitAmount)} Chit • Started {formatDate(group.startDate)}
                            </span>
                          </div>

                    <div className="grid grid-cols-1 gap-4">
                      {group.members.map((c) => {
                        const progressPct = Math.round(
                          (c.monthsCompleted / c.durationMonths) * 100
                        );

                        return (
                          <div
                            key={c.id}
                            className="bg-white rounded-2xl border-2 border-slate-300 p-4 sm:p-5 shadow-sm space-y-4 hover:border-indigo-300 transition-all"
                          >
                            {/* Member Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center space-x-3.5">
                                {c.photo ? (
                                  <img
                                    src={c.photo}
                                    alt={c.name}
                                    className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-300 shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                                    {c.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-lg sm:text-xl font-black text-slate-900">
                                      {c.name} {c.surname}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                      {c.activeChitsCount} Active Chits
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-3 text-xs text-slate-600 font-medium mt-0.5">
                                    <span className="flex items-center space-x-1">
                                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                                      <span className="font-mono font-bold">{c.phone}</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center space-x-1">
                                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{c.village}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Overdue / Balance Status */}
                              <div className="flex items-center space-x-2 self-start sm:self-auto">
                                <div
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center space-x-1.5 ${
                                    c.previousDue > 0
                                      ? "bg-rose-50 border-rose-300 text-rose-800"
                                      : "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  }`}
                                >
                                  {c.previousDue > 0 ? (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Overdue: {formatINR(c.previousDue)}</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>All Dues Clear</span>
                                    </>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleWhatsApp(c.phone, c.name, c.previousDue)}
                                  className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-bold text-xs flex items-center space-x-1"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Month Progress Bar */}
                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                              <div className="flex justify-between text-xs sm:text-sm font-bold">
                                <span className="text-slate-700">
                                  Installment Progress: {c.monthsCompleted} of {c.durationMonths} months paid
                                </span>
                                <span className="text-indigo-700">{progressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>

                            {/* Surety & Nominee Quick Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-200 flex items-center space-x-2">
                                <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
                                <div className="truncate">
                                  <span className="font-bold text-sky-950">Surety: </span>
                                  {c.suretyName ? (
                                    <span className="text-slate-800 font-semibold">
                                      {c.suretyName} {c.suretyPhone ? `(${c.suretyPhone})` : ""}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">None</span>
                                  )}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center space-x-2">
                                <HeartHandshake className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div className="truncate">
                                  <span className="font-bold text-emerald-950">Nominee: </span>
                                  {c.nomineeName ? (
                                    <span className="text-slate-800 font-semibold">
                                      {c.nomineeName}{" "}
                                      {c.nomineeRelation ? `(${c.nomineeRelation})` : ""}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">None</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons for this Member */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPayChit(c)}
                                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-sm transition-all"
                                >
                                  <BadgeIndianRupee className="w-4 h-4" />
                                  <span>➕ Add Payment</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setHistoryChit(c)}
                                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Receipts ({c.payments?.length || 0})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setLedgerMemberId(c.memberId)}
                                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold text-xs hover:bg-amber-100 shadow-xs"
                                  title="Member Money Taken & Given Ledger History"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                                  <span>📒 Money History</span>
                                </button>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setEditChit(c)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleMarkComplete(c.id, `${c.name} ${c.surname}`)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Completed</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <RecordPaymentModal
        isOpen={!!payChit}
        onClose={() => setPayChit(null)}
        chit={payChit}
        onSuccess={loadChits}
      />

      <EditChitModal
        isOpen={!!editChit}
        onClose={() => setEditChit(null)}
        chit={editChit}
        onSuccess={loadChits}
      />

      <PaymentHistoryModal
        isOpen={!!historyChit}
        onClose={() => setHistoryChit(null)}
        chit={historyChit}
      />

      <MemberLedgerModal
        isOpen={!!ledgerMemberId}
        onClose={() => setLedgerMemberId(null)}
        memberId={ledgerMemberId}
        onUpdate={loadChits}
      />

      <ChitBroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => {
          setIsBroadcastOpen(false);
          setBroadcastChit(null);
        }}
        initialChit={broadcastChit}
        allChits={chits}
      />

      {/* ================= ASSIGN / EDIT CHIT TAKER MODAL ================= */}
      {editingAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black uppercase">
                  <span>
                    Month {editingAuction.monthNumber} of {editingAuction.group.durationMonths}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Chit Taker (చీటీ ఎత్తుకున్నవారు)
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {formatINR(editingAuction.group.chitAmount)} Chit Scheme • Started{" "}
                  {formatDate(editingAuction.group.startDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAuction(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaker} className="space-y-4">
              {/* Quick select enrolled member */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Quick Select from Enrolled Members:
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-hidden text-sm"
                  value={takerFormData.takerMemberId}
                  onChange={(e) => {
                    const memId = e.target.value;
                    if (!memId) {
                      setTakerFormData((prev) => ({ ...prev, takerMemberId: "" }));
                      return;
                    }
                    const found = editingAuction.group.members.find(
                      (m) => m.memberId === memId || m.id === memId
                    );
                    if (found) {
                      setTakerFormData((prev) => ({
                        ...prev,
                        takerMemberId: memId,
                        takerName: `${found.name} ${found.surname}`.trim(),
                      }));
                    }
                  }}
                >
                  <option value="">-- Choose Enrolled Member or type custom name below --</option>
                  {editingAuction.group.members.map((m) => (
                    <option key={m.id} value={m.memberId || m.id}>
                      {m.name} {m.surname} ({m.phone}) - {m.village}
                    </option>
                  ))}
                </select>
              </div>

              {/* Taker Name */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Person Name (చీటీ ఎత్తుకున్నవారి పేరు) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Goud"
                  value={takerFormData.takerName}
                  onChange={(e) =>
                    setTakerFormData((prev) => ({ ...prev, takerName: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-black text-slate-900 text-base focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              {/* Payout & Bid Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Payout Given (₹)
                  </label>
                  <input
                    type="number"
                    value={takerFormData.payoutAmount}
                    onChange={(e) =>
                      setTakerFormData((prev) => ({ ...prev, payoutAmount: e.target.value }))
                    }
                    placeholder={String(editingAuction.group.chitAmount)}
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 font-black text-slate-900 text-sm focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Auction Discount (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    value={takerFormData.bidAmount}
                    onChange={(e) =>
                      setTakerFormData((prev) => ({ ...prev, bidAmount: e.target.value }))
                    }
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-900 text-sm focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Lifted / Paid Date */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Payment / Lift Date (తేదీ)
                </label>
                <input
                  type="date"
                  value={takerFormData.paidDate}
                  onChange={(e) =>
                    setTakerFormData((prev) => ({ ...prev, paidDate: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-900 text-sm focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Remarks (గమనిక)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash, guarantor is Suresh"
                  value={takerFormData.notes}
                  onChange={(e) =>
                    setTakerFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 font-medium text-slate-900 text-sm focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingAuction(null)}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAuction}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-all flex items-center space-x-2"
                >
                  {savingAuction ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-300" />
                      <span>Save Chit Taker</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= WHATSAPP NOTICE RESULT MODAL ================= */}
      {whatsNoticeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {whatsNoticeResult.directSent ? "WhatsApp Slip Sent!" : "WhatsApp Slip Ready"}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {whatsNoticeResult.directSent
                  ? `Confirmation slip was delivered directly to ${whatsNoticeResult.takerName} (${whatsNoticeResult.phone}).`
                  : `Slip generated for ${whatsNoticeResult.takerName}. Click below to send via WhatsApp Web / App.`}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {whatsNoticeResult.fallbackUrl && (
                <a
                  href={whatsNoticeResult.fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in WhatsApp</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setWhatsNoticeResult(null)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-700 hover:bg-slate-50 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
