"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/formatters";
import { updateChitAndMember, deleteChit } from "@/app/actions";
import { X, Edit3, Trash2, Save, AlertCircle, Camera } from "lucide-react";
import { processImageFile } from "@/lib/image-utils";

interface EditChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  chit: any;
  onSuccess: () => void;
}

export default function EditChitModal({
  isOpen,
  onClose,
  chit,
  onSuccess,
}: EditChitModalProps) {
  if (!isOpen || !chit) return null;

  const [formData, setFormData] = useState({
    name: chit.name || "",
    surname: chit.surname || "",
    phone: chit.phone || "",
    village: chit.village || "",
    suretyName: chit.suretyName || "",
    suretyPhone: chit.suretyPhone || "",
    nomineeName: chit.nomineeName || "",
    nomineePhone: chit.nomineePhone || "",
    nomineeRelation: chit.nomineeRelation || "Wife",
    photo: chit.photo || "",
    chitAmount: chit.chitAmount || 100000,
    durationMonths: chit.durationMonths || 20,
    monthlyInstallment: chit.monthlyInstallment || 5000,
    startDate: chit.startDate ? chit.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    previousDue: chit.previousDue || 0,
    notes: chit.notes || "",
  });

  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    try {
      const dataUrl = await processImageFile(file);
      setFormData((prev) => ({ ...prev, photo: dataUrl }));
    } catch (err: any) {
      alert(err.message || "Failed to process photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoRemove = () => {
    setFormData((prev) => ({ ...prev, photo: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateChitAndMember({
        chitId: chit.id,
        memberId: chit.memberId,
        ...formData,
        chitAmount: Number(formData.chitAmount),
        durationMonths: Number(formData.durationMonths),
        monthlyInstallment: Number(formData.monthlyInstallment),
        previousDue: Number(formData.previousDue || 0),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Update failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this chit entry?")) {
      setLoading(true);
      try {
        await deleteChit(chit.id);
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Edit Chit & Member Details</h3>
              <p className="text-sm text-slate-300 font-bold">
                {chit.name} {chit.surname}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-base">
          {/* Member Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-3">
            <h4 className="font-black text-slate-900 text-lg border-b pb-2">1. Member Details</h4>

            {/* Member Photo in Edit Modal */}
            <div className="bg-white p-3.5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center space-x-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                {formData.photo ? (
                  <img
                    src={formData.photo}
                    alt="Member Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <span className="block text-sm font-bold text-slate-800">Member Photo</span>
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{photoLoading ? "Processing..." : formData.photo ? "Change Photo" : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.photo && (
                    <button
                      type="button"
                      onClick={handlePhotoRemove}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Surname / Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-mono font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Village / Town</label>
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Chit Scheme Details */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border-2 border-amber-200 space-y-3">
            <h4 className="font-black text-slate-900 text-lg border-b border-amber-200 pb-2">
              2. Chit Financial Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Chit Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.chitAmount}
                  onChange={(e) => setFormData({ ...formData, chitAmount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Duration (Months)</label>
                <input
                  type="number"
                  required
                  value={formData.durationMonths}
                  onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monthly Installment (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.monthlyInstallment}
                  onChange={(e) => setFormData({ ...formData, monthlyInstallment: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-rose-800 mb-1">
                  Previous Due / Balance (₹)
                </label>
                <input
                  type="number"
                  value={formData.previousDue}
                  onChange={(e) => setFormData({ ...formData, previousDue: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-rose-300 font-bold text-rose-700 bg-white text-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Remarks (Optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 font-medium text-slate-900 bg-white text-sm"
              />
            </div>
          </div>

          {/* Surety & Nominee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-sky-50/50 p-4 rounded-2xl border-2 border-sky-200 space-y-3">
              <h4 className="font-black text-slate-900 text-base border-b border-sky-200 pb-1">
                3. Surety Details (Optional)
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Surety Name (Optional)</label>
                <input
                  type="text"
                  value={formData.suretyName}
                  onChange={(e) => setFormData({ ...formData, suretyName: e.target.value })}
                  placeholder="Surety name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Surety Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.suretyPhone}
                  onChange={(e) => setFormData({ ...formData, suretyPhone: e.target.value })}
                  placeholder="Mobile number"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white text-sm"
                />
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-emerald-200 space-y-3">
              <h4 className="font-black text-slate-900 text-base border-b border-emerald-200 pb-1">
                4. Nominee Details (Optional)
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominee Name (Optional)</label>
                <input
                  type="text"
                  value={formData.nomineeName}
                  onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                  placeholder="Nominee name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.nomineeRelation}
                    onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nominee Phone</label>
                  <input
                    type="tel"
                    value={formData.nomineePhone}
                    onChange={(e) => setFormData({ ...formData, nomineePhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t-2 border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-xl border-2 border-rose-300 text-rose-700 font-bold text-sm hover:bg-rose-50 flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Chit</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border-2 border-slate-300 font-bold text-slate-700 text-sm hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-md flex items-center space-x-2"
              >
                <Save className="w-5 h-5 text-amber-400" />
                <span>{loading ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
