"use client";

import React from "react";
import { formatINR, formatDate } from "@/lib/formatters";
import { X, Receipt, BadgeIndianRupee } from "lucide-react";

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chit: any;
}

export default function PaymentHistoryModal({
  isOpen,
  onClose,
  chit,
}: PaymentHistoryModalProps) {
  if (!isOpen || !chit) return null;

  const payments = chit.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            {chit.photo ? (
              <img
                src={chit.photo}
                alt={`${chit.name} ${chit.surname}`}
                className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-black">Payment History & Receipts</h3>
              <p className="text-sm text-slate-300 font-bold">
                {chit.name} {chit.surname} • {chit.village}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-5 bg-slate-50 border-b-2 border-slate-200 grid grid-cols-3 gap-2 text-center text-sm font-bold">
          <div className="bg-white p-3 rounded-xl border">
            <span className="text-slate-500 text-xs block">Total Paid:</span>
            <span className="text-xl font-black text-emerald-700">{formatINR(chit.totalPaid)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border">
            <span className="text-slate-500 text-xs block">Months Completed:</span>
            <span className="text-xl font-black text-slate-900">
              {chit.monthsCompleted} / {chit.durationMonths}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border">
            <span className="text-slate-500 text-xs block">Previous Due:</span>
            <span
              className={`text-xl font-black ${
                chit.previousDue > 0 ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {formatINR(chit.previousDue)}
            </span>
          </div>
        </div>

        {/* Payments List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
          {payments.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-bold text-base">
              No payments recorded yet for this chit
            </div>
          ) : (
            payments.map((p: any, idx: number) => (
              <div
                key={p.id || idx}
                className="p-4 rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-between text-base"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      Month #{p.monthNumber || idx + 1}
                    </span>
                    <span className="font-bold text-slate-700">{formatDate(p.paymentDate)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                      {p.paymentMode}
                    </span>
                  </div>
                  {p.notes && (
                    <p className="text-xs text-slate-500 mt-1 font-medium">{p.notes}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-emerald-700">{formatINR(p.amount)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-base hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
