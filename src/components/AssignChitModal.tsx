"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/formatters";
import { createChitForMember } from "@/app/actions";
import { X, BadgeIndianRupee, Calendar, Check, AlertCircle, PlusCircle } from "lucide-react";

interface AssignChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  onSuccess: () => void;
}

export default function AssignChitModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: AssignChitModalProps) {
  if (!isOpen || !member) return null;

  const [formData, setFormData] = useState({
    chitAmount: 100000,
    durationMonths: 20,
    monthlyInstallment: 5000,
    startDate: new Date().toISOString().slice(0, 10),
    previousDue: 0,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (amount: number) => {
    const months = formData.durationMonths > 0 ? formData.durationMonths : 20;
    const autoInst = Math.round(amount / months);
    setFormData((prev) => ({
      ...prev,
      chitAmount: amount,
      monthlyInstallment: autoInst,
    }));
  };

  const handleDurationChange = (months: number) => {
    const validMonths = months > 0 ? months : 1;
    const autoInst = Math.round(formData.chitAmount / validMonths);
    setFormData((prev) => ({
      ...prev,
      durationMonths: validMonths,
      monthlyInstallment: autoInst,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await createChitForMember({
        memberId: member.id,
        chitAmount: Number(formData.chitAmount),
        durationMonths: Number(formData.durationMonths),
        monthlyInstallment: Number(formData.monthlyInstallment),
        startDate: formData.startDate,
        previousDue: Number(formData.previousDue || 0),
        notes: formData.notes,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to assign chit");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Assign Chit to Member</h3>
              <p className="text-sm text-slate-300 font-bold">
                {member.surname} {member.name} • {member.village}
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

        {error && (
          <div className="p-4 m-4 mb-0 rounded-xl bg-rose-50 text-rose-900 border-2 border-rose-300 font-bold text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Member mini card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center shrink-0 border">
              {member.photo ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-slate-700 text-base">
                  {member.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-sm">
              <span className="font-black text-slate-900 block text-base">
                {member.surname} {member.name}
              </span>
              <span className="text-slate-600 font-medium">
                {member.phone} • {member.village}
              </span>
            </div>
          </div>

          {/* Chit Amount */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-1">
              Total Chit Value (Chit Amount ₹) *
            </label>
            <input
              type="number"
              required
              step={5000}
              min={10000}
              value={formData.chitAmount}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-3 border-amber-500 font-black text-2xl text-slate-900 bg-amber-50/20 focus:bg-white"
            />
            <span className="text-sm font-bold text-amber-800 mt-1 block">
              {formatINR(formData.chitAmount)}
            </span>
          </div>

          {/* Duration & Installment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Duration (Months) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={formData.durationMonths}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Monthly Installment (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.monthlyInstallment}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyInstallment: Number(e.target.value) })
                }
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-emerald-700 text-lg"
              />
            </div>
          </div>

          {/* Start Date & Previous Due */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-rose-800 mb-1">
                Previous Due / Balance (₹)
              </label>
              <input
                type="number"
                min={0}
                value={formData.previousDue}
                onChange={(e) =>
                  setFormData({ ...formData, previousDue: Number(e.target.value) })
                }
                className="w-full px-3 py-2.5 rounded-xl border-2 border-rose-300 font-bold text-rose-700 text-base"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Due on 5th of every month (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 font-medium text-slate-900 text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t-2 border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg flex items-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>{loading ? "Assigning..." : "Assign Chit"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
