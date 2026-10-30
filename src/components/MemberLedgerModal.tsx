"use client";

import React, { useEffect, useState } from "react";
import { formatINR, formatDate } from "@/lib/formatters";
import {
  getMemberTransactions,
  addMemberTransaction,
  updateMemberTransaction,
  deleteMemberTransaction,
} from "@/app/actions";
import {
  X,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  Calendar,
  Save,
  MessageCircle,
  AlertCircle,
  Receipt,
  Scale,
} from "lucide-react";

interface MemberLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  onUpdate?: () => void;
}

export default function MemberLedgerModal({
  isOpen,
  onClose,
  memberId,
  onUpdate,
}: MemberLedgerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // New Transaction Form state
  const [txType, setTxType] = useState<"TAKEN" | "GIVEN">("TAKEN");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Form state
  const [editFormData, setEditFormData] = useState({
    type: "TAKEN" as "TAKEN" | "GIVEN",
    amount: 0,
    date: "",
    description: "",
    paymentMode: "CASH",
  });

  const loadData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await getMemberTransactions(memberId);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      loadData();
      setEditingTxId(null);
      setError(null);
      setAmount("");
      setDescription("");
    }
  }, [isOpen, memberId]);

  if (!isOpen) return null;

  // Add new transaction
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a reason or description");
      return;
    }

    setFormSubmitting(true);
    setError(null);
    try {
      const res = await addMemberTransaction({
        memberId: memberId!,
        type: txType,
        amount: Number(amount),
        date,
        description,
        paymentMode,
      });

      if (res.success) {
        setAmount("");
        setDescription("");
        loadData();
        if (onUpdate) onUpdate();
      } else {
        setError(res.error || "Failed to add entry");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Start editing a transaction
  const startEditing = (tx: any) => {
    setEditingTxId(tx.id);
    setEditFormData({
      type: tx.type,
      amount: tx.amount,
      date: tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: tx.description,
      paymentMode: tx.paymentMode || "CASH",
    });
  };

  // Save edited transaction
  const handleSaveEdit = async (id: string) => {
    try {
      const res = await updateMemberTransaction({
        id,
        ...editFormData,
        amount: Number(editFormData.amount),
      });

      if (res.success) {
        setEditingTxId(null);
        loadData();
        if (onUpdate) onUpdate();
      } else {
        alert(res.error || "Failed to update entry");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  // Delete transaction
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this ledger entry?")) {
      try {
        const res = await deleteMemberTransaction(id);
        if (res.success) {
          loadData();
          if (onUpdate) onUpdate();
        } else {
          alert(res.error || "Failed to delete");
        }
      } catch (err: any) {
        alert(err.message || "An error occurred");
      }
    }
  };

  // WhatsApp Share Ledger
  const handleShareWhatsApp = () => {
    if (!data?.member) return;
    const m = data.member;
    const cleanPhone = m.phone.replace(/\D/g, "");
    const balanceText =
      data.netBalance > 0
        ? `Current Balance Due (Owes): ${formatINR(data.netBalance)}`
        : data.netBalance < 0
        ? `Amount We Owe Member: ${formatINR(Math.abs(data.netBalance))}`
        : "Account Settled (Zero Balance)";

    const msg = encodeURIComponent(
      `Hello ${m.name} ${m.surname},\nHere is your financial ledger statement from Hanumanth Chits:\n` +
        `• Total Money Taken: ${formatINR(data.totalTaken)}\n` +
        `• Total Money Given / Paid: ${formatINR(data.totalGiven)}\n` +
        `• Net Status: ${balanceText}\n\n` +
        `Thank you.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            {data?.member?.photo ? (
              <img
                src={data.member.photo}
                alt="Member"
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shrink-0">
                <BookOpen className="w-7 h-7" />
              </div>
            )}
            <div>
              <h3 className="text-xl sm:text-2xl font-black flex items-center space-x-2">
                <span>Money History & Ledger</span>
              </h3>
              <p className="text-sm text-slate-300 font-bold">
                {data?.member?.surname} {data?.member?.name} • {data?.member?.village} ({data?.member?.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Financial Balance Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Taken */}
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300">
                  <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
                    <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                    <span>Total Taken</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">
                    {formatINR(data?.totalTaken || 0)}
                  </p>
                  <span className="text-xs text-rose-600 font-semibold block">
                    Total money taken by member
                  </span>
                </div>

                {/* Total Given / Paid */}
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
                  <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span>Total Given / Paid</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                    {formatINR(data?.totalGiven || 0)}
                  </p>
                  <span className="text-xs text-emerald-600 font-semibold block">
                    Total money paid by member
                  </span>
                </div>

                {/* Net Balance */}
                <div
                  className={`p-4 rounded-2xl border-2 ${
                    (data?.netBalance || 0) > 0
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : (data?.netBalance || 0) < 0
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                    <Scale className="w-4 h-4" />
                    <span>Net Balance</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black mt-1">
                    {formatINR(Math.abs(data?.netBalance || 0))}
                  </p>
                  <span className="text-xs font-black block mt-0.5">
                    {(data?.netBalance || 0) > 0
                      ? "⚠️ Member Owes You"
                      : (data?.netBalance || 0) < 0
                      ? "🟢 You Owe Member"
                      : "✅ All Settled"}
                  </span>
                </div>
              </div>

              {/* Add New Transaction Form */}
              <div className="bg-slate-50 rounded-2xl border-2 border-slate-300 p-4 sm:p-5 space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 pb-2 border-b border-slate-200">
                  <PlusCircle className="w-5 h-5 text-indigo-700" />
                  <h4 className="text-lg font-black">
                    ➕ Record Money Taken / Given
                  </h4>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-300 font-bold text-sm flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {/* Type Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType("TAKEN")}
                      className={`py-3 px-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 border-2 transition-all ${
                        txType === "TAKEN"
                          ? "bg-rose-600 text-white border-rose-600 shadow-md scale-[1.01]"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <ArrowDownLeft className="w-5 h-5" />
                      <span>🔴 Money Taken</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxType("GIVEN")}
                      className={`py-3 px-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 border-2 transition-all ${
                        txType === "GIVEN"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.01]"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      <span>🟢 Money Given / Paid</span>
                    </button>
                  </div>

                  {/* Amount & Date & Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="₹ Amount"
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-black text-slate-900 text-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-base"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">PhonePe / GPay</option>
                        <option value="BANK">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  {/* Description with Quick Chips */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-slate-700">
                        Description / Reason *
                      </label>
                      <span className="text-xs text-slate-500 font-semibold">Quick suggestions:</span>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        "Chit Auction Prize Lifted",
                        "Monthly Installment Paid",
                        "Hand Loan / Advance Taken",
                        "Loan Repaid / Returned",
                        "Dividend Adjusted",
                        "Interest Paid",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setDescription(chip)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-indigo-100 text-slate-800 hover:text-indigo-900 font-bold text-xs transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Chit prize money given, or monthly installment paid"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-base"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-base shadow-md flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5 text-amber-400" />
                    <span>
                      {formSubmitting ? "Saving..." : "💾 Save Ledger Entry"}
                    </span>
                  </button>
                </form>
              </div>

              {/* Transactions History Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                    <Receipt className="w-5 h-5 text-indigo-700" />
                    <span>All Ledger Entries ({data?.transactions?.length || 0})</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    * Every entry can be edited or deleted
                  </span>
                </div>

                {data?.transactions?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold text-base">
                    No ledger entries recorded yet. Use the form above to add an entry.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data?.transactions?.map((tx: any) => {
                      const isEditing = editingTxId === tx.id;

                      if (isEditing) {
                        return (
                          <div
                            key={tx.id}
                            className="p-4 rounded-2xl bg-amber-50 border-3 border-amber-400 shadow-md space-y-3"
                          >
                            <span className="text-xs font-black text-amber-900 uppercase">
                              ✏️ Edit Ledger Entry
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">
                                  Type
                                </label>
                                <select
                                  value={editFormData.type}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      type: e.target.value as "TAKEN" | "GIVEN",
                                    })
                                  }
                                  className="w-full px-2 py-2 rounded-xl border border-slate-300 font-bold text-sm bg-white"
                                >
                                  <option value="TAKEN">Money Taken</option>
                                  <option value="GIVEN">Money Given / Paid</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  value={editFormData.amount}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      amount: Number(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-2 rounded-xl border border-slate-300 font-black text-sm bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={editFormData.date}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      date: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 py-2 rounded-xl border border-slate-300 font-bold text-sm bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">
                                  Payment Mode
                                </label>
                                <select
                                  value={editFormData.paymentMode}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      paymentMode: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 py-2 rounded-xl border border-slate-300 font-bold text-sm bg-white"
                                >
                                  <option value="CASH">CASH</option>
                                  <option value="UPI">UPI</option>
                                  <option value="BANK">BANK</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-0.5">
                                Description
                              </label>
                              <input
                                type="text"
                                value={editFormData.description}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    description: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm bg-white"
                              />
                            </div>

                            <div className="flex justify-end space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingTxId(null)}
                                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(tx.id)}
                                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5 text-amber-400" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                tx.type === "TAKEN"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {tx.type === "TAKEN" ? (
                                <ArrowDownLeft className="w-6 h-6" />
                              ) : (
                                <ArrowUpRight className="w-6 h-6" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-black ${
                                    tx.type === "TAKEN"
                                      ? "bg-rose-100 text-rose-900"
                                      : "bg-emerald-100 text-emerald-900"
                                  }`}
                                >
                                  {tx.type === "TAKEN" ? "🔴 Money Taken" : "🟢 Money Given"}
                                </span>
                                <span className="text-xs text-slate-500 font-bold">
                                  {formatDate(tx.date)}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                                  {tx.paymentMode}
                                </span>
                              </div>
                              <p className="text-base font-bold text-slate-900 mt-0.5">
                                {tx.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <span
                              className={`text-xl sm:text-2xl font-black ${
                                tx.type === "TAKEN" ? "text-rose-700" : "text-emerald-700"
                              }`}
                            >
                              {tx.type === "TAKEN" ? "-" : "+"}
                              {formatINR(tx.amount)}
                            </span>

                            {/* Action Buttons: Edit and Delete */}
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => startEditing(tx)}
                                className="p-2 rounded-xl text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200"
                                title="Edit this entry"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200"
                                title="Delete this entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500 font-bold">
            Hanumanth Chits • Easy Financial Ledger Book
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
