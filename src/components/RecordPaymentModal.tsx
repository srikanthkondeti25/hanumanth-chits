"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/formatters";
import { recordPayment } from "@/app/actions";
import { X, BadgeIndianRupee, Calendar, Check, AlertCircle } from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  chit: any;
  onSuccess: () => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  chit,
  onSuccess,
}: RecordPaymentModalProps) {
  if (!isOpen || !chit) return null;

  const [amount, setAmount] = useState<number>(chit.monthlyInstallment || 0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Please enter the payment amount");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await recordPayment({
        chitId: chit.id,
        amount: Number(amount),
        paymentDate,
        paymentMode,
        notes,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to record payment");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              <BadgeIndianRupee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Record Chit Payment</h3>
              <p className="text-sm text-slate-300 font-bold">
                {chit.name} {chit.surname} • {chit.village}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="p-4 m-4 mb-0 rounded-xl bg-rose-50 text-rose-900 border-2 border-rose-300 font-bold text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex justify-between items-center text-sm">
            <div>
              <span className="text-slate-600 font-semibold block">Total Chit Value:</span>
              <span className="text-xl font-black text-slate-900">{formatINR(chit.chitAmount)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-600 font-semibold block">Monthly Installment:</span>
              <span className="text-xl font-black text-emerald-700">
                {formatINR(chit.monthlyInstallment)}
              </span>
            </div>
          </div>

          {/* Amount Paid Input */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-1">
              Amount Paid (₹) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-3 border-emerald-500 font-black text-3xl text-emerald-800 bg-emerald-50/20 focus:bg-white"
            />
            <span className="text-sm font-bold text-emerald-700 mt-1 block">
              {formatINR(amount)}
            </span>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 text-lg"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-1">
              Payment Mode *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CASH", label: "Cash" },
                { id: "UPI", label: "PhonePe / GPay" },
                { id: "BANK", label: "Bank Transfer" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPaymentMode(mode.id)}
                  className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    paymentMode === mode.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-1">
              Notes / Receipt Details
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Receipt #, paid by hand (Optional)"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 font-medium text-slate-900 text-base"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t-2 border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-700 text-base hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Check className="w-6 h-6" />
              <span>{loading ? "Recording..." : "Record Payment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
