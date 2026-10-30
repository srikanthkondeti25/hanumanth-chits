"use client";

import React, { useEffect, useState } from "react";
import { formatINR, formatDate } from "@/lib/formatters";
import {
  getFinanceSummaryAction,
  getFinanceCustomersAction,
  createFinanceCustomerAction,
  updateFinanceCustomerAction,
  deleteFinanceCustomerAction,
  getCustomerLedgerAction,
  addFinanceEntryAction,
  updateFinanceEntryAction,
  deleteFinanceEntryAction,
  sendFinanceWhatsAppStatementAction,
  getAllMembers,
} from "@/app/actions";
import {
  Wallet,
  Users,
  Search,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  MessageCircle,
  Phone,
  Printer,
  ChevronLeft,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Calendar,
  X,
  CreditCard,
  Building,
  Coins,
  Send,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

interface FinanceBookProps {
  onBackToChits?: () => void;
}

export default function FinanceBook({ onBackToChits }: FinanceBookProps) {
  // Main state
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalGave: 0,
    totalGot: 0,
    netMarketDue: 0,
    totalCustomers: 0,
    customersWithDue: 0,
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DUE" | "SETTLED" | "GIVE">("ALL");

  // Selected customer passbook view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any | null>(null);

  // Available chit members for quick pick
  const [chitMembers, setChitMembers] = useState<any[]>([]);

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [entryModalType, setEntryModalType] = useState<"GAVE" | "GOT">("GAVE");
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [showInterestCalcModal, setShowInterestCalcModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [whatsAppModalData, setWhatsAppModalData] = useState<any | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states: New Customer
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    surname: "",
    phone: "",
    village: "",
    notes: "",
    memberId: "",
    hasOpeningBalance: false,
    openingType: "GAVE" as "GAVE" | "GOT",
    openingAmount: "",
    openingDate: new Date().toISOString().slice(0, 10),
    openingDescription: "Opening Balance (ప్రారంభ బకాయి)",
    openingPaymentMode: "CASH",
  });

  // Form states: New / Edit Entry
  const [entryFormData, setEntryFormData] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    paymentMode: "CASH",
    interestRate: "2", // default 2% per month
  });

  // Form states: Interest Calculator
  const [calcData, setCalcData] = useState({
    principal: "50000",
    rate: "2", // 2% per month / 2 Rs per 100
    months: "3",
    days: "0",
  });

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, custRes, membersRes] = await Promise.all([
        getFinanceSummaryAction(),
        getFinanceCustomersAction(statusFilter, search),
        getAllMembers().catch(() => []),
      ]);

      if (sumRes.success) {
        setSummary({
          totalGave: sumRes.totalGave,
          totalGot: sumRes.totalGot,
          netMarketDue: sumRes.netMarketDue,
          totalCustomers: sumRes.totalCustomers,
          customersWithDue: sumRes.customersWithDue,
        });
      }

      if (custRes.success) {
        setCustomers(custRes.customers);
      }

      if (Array.isArray(membersRes)) {
        setChitMembers(membersRes);
      }
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Load customer ledger passbook
  const loadCustomerLedger = async (customerId: string) => {
    setLedgerLoading(true);
    setActionError(null);
    try {
      const res = await getCustomerLedgerAction(customerId);
      if (res.success) {
        setLedgerData(res);
      } else {
        setActionError(res.error || "Failed to load customer ledger");
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    loadCustomerLedger(id);
  };

  const handleBackToCustomerList = () => {
    setSelectedCustomerId(null);
    setLedgerData(null);
    loadData();
  };

  // Submit New Customer
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.name.trim()) {
      alert("Please enter customer name");
      return;
    }
    if (!newCustomerData.phone.trim()) {
      alert("Please enter phone number");
      return;
    }

    try {
      const res = await createFinanceCustomerAction({
        name: newCustomerData.name,
        surname: newCustomerData.surname,
        phone: newCustomerData.phone,
        village: newCustomerData.village,
        notes: newCustomerData.notes,
        memberId: newCustomerData.memberId || undefined,
        openingBalanceType: newCustomerData.hasOpeningBalance ? newCustomerData.openingType : undefined,
        openingAmount: newCustomerData.hasOpeningBalance ? Number(newCustomerData.openingAmount) : undefined,
        openingDate: newCustomerData.hasOpeningBalance ? newCustomerData.openingDate : undefined,
        openingDescription: newCustomerData.hasOpeningBalance ? newCustomerData.openingDescription : undefined,
        openingPaymentMode: newCustomerData.openingPaymentMode,
      });

      if (res.success && res.customer) {
        setShowAddCustomerModal(false);
        // Reset form
        setNewCustomerData({
          name: "",
          surname: "",
          phone: "",
          village: "",
          notes: "",
          memberId: "",
          hasOpeningBalance: false,
          openingType: "GAVE",
          openingAmount: "",
          openingDate: new Date().toISOString().slice(0, 10),
          openingDescription: "Opening Balance (ప్రారంభ బకాయి)",
          openingPaymentMode: "CASH",
        });
        loadData();
        // Immediately open newly created customer ledger
        handleSelectCustomer(res.customer.id);
      } else {
        alert(res.error || "Failed to create customer");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create customer");
    }
  };

  // Quick pick from existing Chit Member
  const handlePickChitMember = (memberId: string) => {
    if (!memberId) {
      setNewCustomerData((prev) => ({ ...prev, memberId: "" }));
      return;
    }
    const mem = chitMembers.find((m) => m.id === memberId);
    if (mem) {
      setNewCustomerData((prev) => ({
        ...prev,
        memberId: mem.id,
        name: mem.name || "",
        surname: mem.surname || "",
        phone: mem.phone || "",
        village: mem.village || "",
      }));
    }
  };

  // Submit Add / Edit Entry
  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    const numAmount = Number(entryFormData.amount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      if (editingEntry) {
        const res = await updateFinanceEntryAction(editingEntry.id, {
          type: entryModalType,
          amount: numAmount,
          date: entryFormData.date,
          description: entryFormData.description,
          paymentMode: entryFormData.paymentMode,
          interestRate: entryFormData.interestRate ? Number(entryFormData.interestRate) : undefined,
        });
        if (res.success) {
          setShowAddEntryModal(false);
          setEditingEntry(null);
          loadCustomerLedger(selectedCustomerId);
        } else {
          alert(res.error || "Failed to update entry");
        }
      } else {
        const res = await addFinanceEntryAction({
          customerId: selectedCustomerId,
          type: entryModalType,
          amount: numAmount,
          date: entryFormData.date,
          description: entryFormData.description,
          paymentMode: entryFormData.paymentMode,
          interestRate: entryFormData.interestRate ? Number(entryFormData.interestRate) : undefined,
        });
        if (res.success) {
          setShowAddEntryModal(false);
          loadCustomerLedger(selectedCustomerId);
        } else {
          alert(res.error || "Failed to add entry");
        }
      }
    } catch (err: any) {
      alert(err.message || "Operation failed");
    }
  };

  const openAddEntryModal = (type: "GAVE" | "GOT") => {
    setEntryModalType(type);
    setEditingEntry(null);
    setEntryFormData({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      description: type === "GAVE" ? "Cash Loan / Hand Loan (అప్పు ఇచ్చినది)" : "Payment Received (వచ్చిన వసూలు)",
      paymentMode: "CASH",
      interestRate: "2",
    });
    setShowAddEntryModal(true);
  };

  const openEditEntryModal = (entry: any) => {
    setEditingEntry(entry);
    setEntryModalType(entry.type);
    setEntryFormData({
      amount: String(entry.amount),
      date: entry.date.slice(0, 10),
      description: entry.description || "",
      paymentMode: entry.paymentMode || "CASH",
      interestRate: entry.interestRate ? String(entry.interestRate) : "2",
    });
    setShowAddEntryModal(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await deleteFinanceEntryAction(entryId);
      if (res.success && selectedCustomerId) {
        loadCustomerLedger(selectedCustomerId);
      } else {
        alert(res.error || "Failed to delete entry");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete entry");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomerId || !ledgerData?.customer) return;
    if (
      !confirm(
        `Are you sure you want to delete customer "${ledgerData.customer.name}" and all their financial history? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await deleteFinanceCustomerAction(selectedCustomerId);
      if (res.success) {
        handleBackToCustomerList();
      } else {
        alert(res.error || "Failed to delete customer");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  };

  // WhatsApp Statement Send
  const handleSendWhatsAppStatement = async () => {
    if (!selectedCustomerId) return;
    setActionError(null);
    try {
      const res = await sendFinanceWhatsAppStatementAction(selectedCustomerId);
      if (res.success) {
        setWhatsAppModalData(res);
      } else {
        alert(res.error || "Failed to prepare WhatsApp statement");
      }
    } catch (err: any) {
      alert(err.message || "Failed to send WhatsApp message");
    }
  };

  // Interest Calculations
  const calcPrincipal = Number(calcData.principal) || 0;
  const calcRate = Number(calcData.rate) || 0;
  const calcMonths = Number(calcData.months) || 0;
  const calcDays = Number(calcData.days) || 0;

  const monthlyInterest = (calcPrincipal * calcRate) / 100;
  const dailyInterest = monthlyInterest / 30;
  const totalAccruedInterest = Math.round(monthlyInterest * calcMonths + dailyInterest * calcDays);
  const grandTotalPayable = calcPrincipal + totalAccruedInterest;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ================= TOP BRANDING & MODE HEADER ================= */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl border-4 border-amber-500 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider border border-amber-500/30">
                Khatabook Ledger
              </span>
              <span className="text-xs text-slate-400 font-bold">Hanumanth Finance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              Finance Operations (ఖాతా పుస్తకం)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Daily/Monthly loans, interest tracking, customer balances & WhatsApp statements
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowInterestCalcModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm border border-slate-700 flex items-center space-x-1.5 shadow-sm"
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>Interest Calculator (వడ్డీ లెక్కలు)</span>
          </button>

          {onBackToChits && (
            <button
              type="button"
              onClick={onBackToChits}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm"
            >
              <Coins className="w-4 h-4" />
              <span>Go to Chit Business</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= DASHBOARD SUMMARY STATS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total You Gave (అప్పు / ఇచ్చినవి) */}
        <div className="bg-white p-5 rounded-3xl border-3 border-rose-300 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-700">
              You Gave (ఇచ్చిన అప్పు)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 font-bold" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">
            {formatINR(summary.totalGave)}
          </p>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Total principal & credit given out
          </p>
        </div>

        {/* Card 2: Total You Got (వసూలు / వచ్చినవి) */}
        <div className="bg-white p-5 rounded-3xl border-3 border-emerald-300 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
              You Got (వచ్చిన వసూలు)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 font-bold" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
            {formatINR(summary.totalGot)}
          </p>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Total payments & returns collected
          </p>
        </div>

        {/* Card 3: Net Market Due (మార్కెట్లో ఉన్న బకాయి) */}
        <div className="bg-amber-50 p-5 rounded-3xl border-4 border-amber-400 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">
              Net Market Balance (రావాల్సిన బకాయి)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center">
              <Coins className="w-5 h-5 font-bold" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-2">
            {formatINR(summary.netMarketDue)}
          </p>
          <div className="flex items-center justify-between text-xs font-bold text-amber-900 mt-1">
            <span>
              {summary.customersWithDue} of {summary.totalCustomers} customers have dues
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-black text-[10px]">
              {summary.netMarketDue >= 0 ? "You will get" : "You will give"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= CONDITIONAL: CUSTOMER PASSBOOK vs CUSTOMERS LIST ================= */}
      {selectedCustomerId && ledgerData ? (
        /* ================= DETAIL VIEW: CUSTOMER KHATABOOK PASSBOOK ================= */
        <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
          {/* Back button & Customer Header */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-3 border-slate-300 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <button
                  type="button"
                  onClick={handleBackToCustomerList}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 transition-colors"
                  title="Back to all customers"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                      {ledgerData.customer.name} {ledgerData.customer.surname}
                    </h3>
                    {ledgerData.customer.village && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300">
                        📍 {ledgerData.customer.village}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 mt-1 text-sm font-semibold text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>+91 {ledgerData.customer.phone}</span>
                    </span>
                    {ledgerData.customer.notes && (
                      <span className="text-xs text-slate-400 italic">
                        • {ledgerData.customer.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center space-x-2 flex-wrap gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSendWhatsAppStatement}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm"
                  title="Send statement via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 fill-current text-white" />
                  <span>Send WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 border border-slate-300"
                  title="Print customer ledger"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300"
                  title="Delete customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Balance Banner */}
            <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                  Net Balance Status (ప్రస్తుత నికర బకాయి)
                </span>
                <div className="flex items-baseline space-x-3 mt-0.5">
                  <span
                    className={`text-3xl sm:text-4xl font-black ${
                      ledgerData.netBalance > 0
                        ? "text-rose-700"
                        : ledgerData.netBalance < 0
                        ? "text-emerald-700"
                        : "text-slate-800"
                    }`}
                  >
                    {formatINR(Math.abs(ledgerData.netBalance))}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      ledgerData.netBalance > 0
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : ledgerData.netBalance < 0
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-slate-100 text-slate-800 border border-slate-300"
                    }`}
                  >
                    {ledgerData.netBalance > 0
                      ? "🔴 You will get (రావాలి)"
                      : ledgerData.netBalance < 0
                      ? "🟢 You will give (ఇవ్వాలి / అడ్వాన్స్)"
                      : "✅ Settled (సరిపోయింది)"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Total Given</span>
                  <span className="text-rose-700 font-black text-sm">
                    {formatINR(ledgerData.totalGave)}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-300" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Total Received</span>
                  <span className="text-emerald-700 font-black text-sm">
                    {formatINR(ledgerData.totalGot)}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-300" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Entries</span>
                  <span className="text-slate-800 font-black text-sm">
                    {ledgerData.entries.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= 2 BIG KHATABOOK ACTION BUTTONS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* BIG RED: YOU GAVE */}
            <button
              type="button"
              onClick={() => openAddEntryModal("GAVE")}
              className="py-5 px-6 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="text-left">
                <div className="flex items-center space-x-1.5 text-xs text-rose-200 font-bold uppercase tracking-wider">
                  <span>Outflow / Loan / Debit</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black">
                  🔴 YOU GAVE (ఇచ్చారు)
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-7 h-7" />
              </div>
            </button>

            {/* BIG GREEN: YOU GOT */}
            <button
              type="button"
              onClick={() => openAddEntryModal("GOT")}
              className="py-5 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="text-left">
                <div className="flex items-center space-x-1.5 text-xs text-emerald-200 font-bold uppercase tracking-wider">
                  <span>Inflow / Recovery / Credit</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black">
                  🟢 YOU GOT (వచ్చింది)
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownLeft className="w-7 h-7" />
              </div>
            </button>
          </div>

          {/* ================= RUNNING BALANCE TRANSACTION TIMELINE ================= */}
          <div className="bg-white rounded-3xl border-3 border-slate-300 shadow-md overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-slate-700" />
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  Transactions & Running Balance History
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                {ledgerData.entries.length} recorded entries
              </span>
            </div>

            {ledgerData.entries.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <p className="text-base font-bold">No entries recorded yet for this customer.</p>
                <p className="text-xs text-slate-400">
                  Click <b>"YOU GAVE"</b> or <b>"YOU GOT"</b> above to record the first financial entry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description / Mode</th>
                      <th className="py-3 px-4 text-right text-rose-700">You Gave (ఇచ్చినవి)</th>
                      <th className="py-3 px-4 text-right text-emerald-700">You Got (వచ్చినవి)</th>
                      <th className="py-3 px-4 text-right">Balance (బకాయి)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ledgerData.entries.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formatDate(e.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{e.description || "-"}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                              {e.paymentMode}
                            </span>
                            {e.interestRate && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                                {e.interestRate}% / mo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-base text-rose-700 whitespace-nowrap">
                          {e.type === "GAVE" ? formatINR(e.amount) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-base text-emerald-700 whitespace-nowrap">
                          {e.type === "GOT" ? formatINR(e.amount) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-base whitespace-nowrap">
                          <span
                            className={
                              e.runningBalance > 0
                                ? "text-rose-700"
                                : e.runningBalance < 0
                                ? "text-emerald-700"
                                : "text-slate-700"
                            }
                          >
                            {formatINR(Math.abs(e.runningBalance))}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 block">
                            {e.runningBalance > 0
                              ? "You will get"
                              : e.runningBalance < 0
                              ? "You will give"
                              : "Settled"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => openEditEntryModal(e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                              title="Edit entry"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(e.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= LIST VIEW: ALL FINANCE CUSTOMERS ================= */
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters, Add Button */}
          <div className="bg-white p-4 rounded-3xl border-3 border-slate-300 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyUp={(e) => e.key === "Enter" && loadData()}
                placeholder="Search customers by name, phone, or village..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-300 text-sm font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All ({summary.totalCustomers})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DUE")}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  statusFilter === "DUE"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                🔴 You'll Get ({summary.customersWithDue})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("SETTLED")}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  statusFilter === "SETTLED"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                ✅ Settled
              </button>
            </div>

            {/* Add Customer Button */}
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Add Customer (కొత్త ఖాతా)</span>
            </button>
          </div>

          {/* Customer List Cards */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-600 font-bold text-sm mt-3">Loading Khatabook Ledger...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-3 border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">No Customers Found</h4>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {search
                    ? "No customers match your search query."
                    : "Start managing your finance loans & collections by adding your first customer."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm inline-flex items-center space-x-2 shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Customer Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c.id)}
                  className="bg-white p-5 rounded-3xl border-3 border-slate-300 hover:border-amber-500 hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 font-black text-lg flex items-center justify-center border-2 border-slate-300 group-hover:border-amber-500 group-hover:bg-amber-50 transition-colors shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                        {c.name} {c.surname}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold flex items-center space-x-1.5 mt-0.5">
                        <span>📞 +91 {c.phone}</span>
                        {c.village && <span>• 📍 {c.village}</span>}
                      </p>
                      {c.lastEntryDate && (
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                          Last entry: {formatDate(c.lastEntryDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xl sm:text-2xl font-black block ${
                        c.netBalance > 0
                          ? "text-rose-700"
                          : c.netBalance < 0
                          ? "text-emerald-700"
                          : "text-slate-700"
                      }`}
                    >
                      {formatINR(Math.abs(c.netBalance))}
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1 ${
                        c.netBalance > 0
                          ? "bg-rose-100 text-rose-900 border border-rose-300"
                          : c.netBalance < 0
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {c.netBalance > 0
                        ? "You'll Get (రావాలి)"
                        : c.netBalance < 0
                        ? "You'll Give"
                        : "Settled"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: ADD CUSTOMER ================= */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b-4 border-amber-500">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-white">Add Customer / Party (కొత్త ఖాతాదారుడు)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-5 sm:p-6 space-y-4">
              {/* Option: Quick Pick from Chit Members */}
              {chitMembers.length > 0 && (
                <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-300 space-y-1.5">
                  <label className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                    ⚡ Quick Pick from Existing Chit Members:
                  </label>
                  <select
                    value={newCustomerData.memberId}
                    onChange={(e) => handlePickChitMember(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-amber-400 text-xs font-bold bg-white text-slate-900 outline-none"
                  >
                    <option value="">-- Or enter new person below --</option>
                    {chitMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.surname} ({m.village}) - {m.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name & Surname */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    placeholder="e.g. Ramesh"
                    className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Surname / House</label>
                  <input
                    type="text"
                    value={newCustomerData.surname}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, surname: e.target.value })
                    }
                    placeholder="e.g. Goud"
                    className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Phone & Village */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newCustomerData.phone}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, phone: e.target.value })
                    }
                    placeholder="10-digit number"
                    className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Village / Town</label>
                  <input
                    type="text"
                    value={newCustomerData.village}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, village: e.target.value })
                    }
                    placeholder="e.g. Siddipet"
                    className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-900 uppercase">Notes / Reference</label>
                <input
                  type="text"
                  value={newCustomerData.notes}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, notes: e.target.value })}
                  placeholder="e.g. Known through market, monthly finance"
                  className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold outline-none focus:border-amber-500"
                />
              </div>

              {/* Opening Balance Checkbox */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={newCustomerData.hasOpeningBalance}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        hasOpeningBalance: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Has existing opening balance? (ప్రారంభ బకాయి ఉందా?)</span>
                </label>

                {newCustomerData.hasOpeningBalance && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNewCustomerData({ ...newCustomerData, openingType: "GAVE" })
                        }
                        className={`py-2 px-3 rounded-xl font-black text-xs ${
                          newCustomerData.openingType === "GAVE"
                            ? "bg-rose-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        🔴 You Gave (వారు ఇవ్వాలి)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewCustomerData({ ...newCustomerData, openingType: "GOT" })
                        }
                        className={`py-2 px-3 rounded-xl font-black text-xs ${
                          newCustomerData.openingType === "GOT"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        🟢 You Got (అడ్వాన్స్)
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 uppercase">
                        Opening Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={newCustomerData.openingAmount}
                        onChange={(e) =>
                          setNewCustomerData({
                            ...newCustomerData,
                            openingAmount: e.target.value,
                          })
                        }
                        placeholder="e.g. 20000"
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-base font-black text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md"
                >
                  Save & Open Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT FINANCIAL ENTRY ================= */}
      {showAddEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-8">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                entryModalType === "GAVE" ? "bg-rose-700" : "bg-emerald-700"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
                  {entryModalType === "GAVE" ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingEntry
                      ? "Edit Entry"
                      : entryModalType === "GAVE"
                      ? "Record: YOU GAVE (ఇచ్చారు / అప్పు)"
                      : "Record: YOU GOT (వచ్చింది / వసూలు)"}
                  </h3>
                  <p className="text-xs text-white/80 font-medium">
                    Customer: {ledgerData?.customer?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEntryModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEntrySubmit} className="p-5 sm:p-6 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setEntryModalType("GAVE")}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    entryModalType === "GAVE"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-700"
                  }`}
                >
                  🔴 YOU GAVE (ఇచ్చినవి)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryModalType("GOT")}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    entryModalType === "GOT"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-700"
                  }`}
                >
                  🟢 YOU GOT (వచ్చినవి)
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-900 uppercase">Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xl text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    autoFocus
                    value={entryFormData.amount}
                    onChange={(e) => setEntryFormData({ ...entryFormData, amount: e.target.value })}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-3.5 rounded-2xl border-2 border-slate-300 text-2xl font-black text-slate-900 focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Date *</label>
                  <input
                    type="date"
                    required
                    value={entryFormData.date}
                    onChange={(e) => setEntryFormData({ ...entryFormData, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Payment Mode</label>
                  <select
                    value={entryFormData.paymentMode}
                    onChange={(e) =>
                      setEntryFormData({ ...entryFormData, paymentMode: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-sm font-bold text-slate-900 outline-none bg-white"
                  >
                    <option value="CASH">💵 Cash (నగదు)</option>
                    <option value="UPI">📱 UPI / PhonePe / GPay</option>
                    <option value="BANK">🏛️ Bank Transfer</option>
                    <option value="CHEQUE">📝 Cheque</option>
                  </select>
                </div>
              </div>

              {/* Description / Quick Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase">
                  Details / Reason (వివరాలు)
                </label>
                <input
                  type="text"
                  value={entryFormData.description}
                  onChange={(e) =>
                    setEntryFormData({ ...entryFormData, description: e.target.value })
                  }
                  placeholder="e.g. Hand loan, monthly interest, advance"
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-sm font-semibold outline-none focus:border-indigo-600"
                />
                {/* Quick Helper Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pt-1">
                  {entryModalType === "GAVE" ? (
                    <>
                      {["Hand Loan", "Personal Advance", "Monthly Finance", "Emergency"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setEntryFormData({ ...entryFormData, description: tag })
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold shrink-0"
                          >
                            + {tag}
                          </button>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      {["Interest Payment", "Principal Returned", "Cash Settled", "Partial Pay"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setEntryFormData({ ...entryFormData, description: tag })
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold shrink-0"
                          >
                            + {tag}
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Optional Interest Rate % */}
              {entryModalType === "GAVE" && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-amber-950 block">Monthly Interest</span>
                    <span className="text-[10px] text-amber-800">
                      Standard is 2% per month (₹2 per ₹100)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 w-24">
                    <input
                      type="number"
                      step="0.5"
                      value={entryFormData.interestRate}
                      onChange={(e) =>
                        setEntryFormData({ ...entryFormData, interestRate: e.target.value })
                      }
                      className="w-full p-1.5 rounded-lg border border-amber-400 text-sm font-black text-amber-950 text-center"
                    />
                    <span className="text-xs font-black text-amber-950">%</span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-white font-black text-sm shadow-md ${
                    entryModalType === "GAVE"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {editingEntry ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUILT-IN INTEREST CALCULATOR ================= */}
      {showInterestCalcModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b-4 border-amber-500">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Interest Calculator</h3>
                  <p className="text-xs text-amber-400 font-bold">వడ్డీ లెక్కల కాలిక్యులేటర్</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInterestCalcModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Principal */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-900 uppercase">
                  Principal Amount (అసలు మొత్తం ₹)
                </label>
                <input
                  type="number"
                  value={calcData.principal}
                  onChange={(e) => setCalcData({ ...calcData, principal: e.target.value })}
                  placeholder="50000"
                  className="w-full p-3 rounded-2xl border-2 border-slate-300 text-xl font-black text-slate-900 outline-none focus:border-amber-500"
                />
              </div>

              {/* Rate & Duration */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">
                    Rate % (నెలకు)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={calcData.rate}
                    onChange={(e) => setCalcData({ ...calcData, rate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-base font-black text-slate-900 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">e.g. ₹2 వడ్డీ</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Months (నెలలు)</label>
                  <input
                    type="number"
                    value={calcData.months}
                    onChange={(e) => setCalcData({ ...calcData, months: e.target.value })}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-base font-black text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 uppercase">Days (రోజులు)</label>
                  <input
                    type="number"
                    value={calcData.days}
                    onChange={(e) => setCalcData({ ...calcData, days: e.target.value })}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-base font-black text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Computed Breakdown Card */}
              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-amber-950 font-bold">
                  <span>Monthly Interest (నెలవారీ వడ్డీ):</span>
                  <span className="font-black text-sm">{formatINR(monthlyInterest)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-amber-950 font-bold">
                  <span>Total Interest Accrued (మొత్తం వడ్డీ):</span>
                  <span className="font-black text-base text-rose-700">
                    +{formatINR(totalAccruedInterest)}
                  </span>
                </div>
                <div className="pt-2 border-t border-amber-300/80 flex items-center justify-between">
                  <span className="text-sm font-black text-amber-950">
                    Total Payable (అసలు + వడ్డీ):
                  </span>
                  <span className="text-2xl font-black text-amber-950">
                    {formatINR(grandTotalPayable)}
                  </span>
                </div>
              </div>

              {/* Add to Ledger Option */}
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInterestCalcModal(false);
                    setEntryModalType("GAVE");
                    setEntryFormData({
                      amount: String(totalAccruedInterest),
                      date: new Date().toISOString().slice(0, 10),
                      description: `Interest: ${calcMonths}m ${calcDays}d @ ${calcRate}% on ${formatINR(
                        calcPrincipal
                      )}`,
                      paymentMode: "CASH",
                      interestRate: String(calcRate),
                    });
                    setShowAddEntryModal(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md"
                >
                  Apply {formatINR(totalAccruedInterest)} Interest to Customer Ledger
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: WHATSAPP STATEMENT STATUS ================= */}
      {whatsAppModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-8">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">WhatsApp Statement Sent</h3>
                  <p className="text-xs text-emerald-200 font-semibold">
                    Customer: {whatsAppModalData.customerName} (+91 {whatsAppModalData.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModalData(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {whatsAppModalData.directSent ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold flex items-start space-x-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-sm block text-emerald-950">
                      Message Delivered Directly via Linked WhatsApp!
                    </span>
                    <span>
                      The statement was dispatched directly to +91 {whatsAppModalData.phone} using
                      Hanumanth Chits WhatsApp Gateway.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-bold flex items-start space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-sm block text-amber-950">
                      Direct WhatsApp Delivery Status
                    </span>
                    <span>
                      {whatsAppModalData.gatewayError ||
                        "WhatsApp gateway is not linked. You can open and send via WhatsApp Web / App directly below."}
                    </span>
                  </div>
                </div>
              )}

              {/* Message Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase">
                  Statement Message Content:
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-slate-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {whatsAppModalData.message}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <a
                  href={whatsAppModalData.webWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open WhatsApp Web / App</span>
                </a>

                <button
                  type="button"
                  onClick={() => setWhatsAppModalData(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
