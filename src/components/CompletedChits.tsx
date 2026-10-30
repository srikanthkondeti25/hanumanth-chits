"use client";

import React, { useEffect, useState } from "react";
import { formatINR, formatDate } from "@/lib/formatters";
import { getCompletedChits, reopenChit } from "@/app/actions";
import PaymentHistoryModal from "@/components/PaymentHistoryModal";
import {
  CheckCircle2,
  Calendar,
  RotateCcw,
  Receipt,
  Phone,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  Layers,
} from "lucide-react";

export default function CompletedChits() {
  const [chits, setChits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyChit, setHistoryChit] = useState<any>(null);

  const loadCompleted = async () => {
    try {
      setLoading(true);
      const res = await getCompletedChits();
      setChits(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompleted();
  }, []);

  const handleReopen = async (chitId: string, name: string) => {
    if (confirm(`Are you sure you want to reopen this chit for ${name}?`)) {
      try {
        await reopenChit(chitId);
        loadCompleted();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              ✅ Completed Chits
            </h2>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-sm border border-emerald-300">
              {chits.length} Chits
            </span>
          </div>
          <p className="text-base text-slate-600 mt-1 font-medium">
            Archived finished chits and receipt records
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
        </div>
      ) : chits.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-300 space-y-2">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">No completed chits yet</h3>
          <p className="text-base text-slate-500">
            Finished chits will appear here once marked as completed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {chits.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b-2 border-slate-100">
                <div className="flex items-start space-x-3.5">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                    {c.photo ? (
                      <img
                        src={c.photo}
                        alt={`${c.name} ${c.surname}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 text-amber-400 flex items-center justify-center font-black text-xl uppercase">
                        {c.surname ? c.surname.charAt(0) : c.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <h3 className="text-2xl font-black text-slate-900">
                        {c.surname} {c.name}
                      </h3>
                      <span className="px-3 py-0.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300">
                        {c.village}
                      </span>
                      <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                        Completed
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Completed Date: {c.completedDate ? formatDate(c.completedDate) : "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{c.phone}</span>
                  </a>
                </div>
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-2xl border">
                  <span className="text-xs font-bold text-slate-500 block">Chit Amount:</span>
                  <span className="text-xl font-black text-slate-900">{formatINR(c.chitAmount)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border">
                  <span className="text-xs font-bold text-slate-500 block">Total Duration:</span>
                  <span className="text-xl font-black text-slate-900">{c.durationMonths} Months</span>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 block">Total Collected:</span>
                  <span className="text-xl font-black text-emerald-700">{formatINR(c.totalPaid)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border">
                  <span className="text-xs font-bold text-slate-500 block">Surety:</span>
                  <span className="text-base font-black text-slate-900 block truncate">
                    {c.suretyName || "None"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-between items-center text-sm">
                <button
                  onClick={() => setHistoryChit(c)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span>Receipt Details ({c.payments?.length || 0})</span>
                </button>

                <button
                  onClick={() => handleReopen(c.id, `${c.name} ${c.surname}`)}
                  className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl text-indigo-700 hover:bg-indigo-50 font-bold border border-indigo-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reopen Chit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={!!historyChit}
        onClose={() => setHistoryChit(null)}
        chit={historyChit}
      />
    </div>
  );
}
