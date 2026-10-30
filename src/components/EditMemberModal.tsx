"use client";

import React, { useState } from "react";
import { updateMemberOnly, deleteMember } from "@/app/actions";
import { X, UserCheck, Trash2, Save, AlertCircle, Camera } from "lucide-react";
import { processImageFile } from "@/lib/image-utils";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  onSuccess: () => void;
}

export default function EditMemberModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: EditMemberModalProps) {
  if (!isOpen || !member) return null;

  const [formData, setFormData] = useState({
    name: member.name || "",
    surname: member.surname || "",
    phone: member.phone || "",
    village: member.village || "",
    suretyName: member.suretyName || "",
    suretyPhone: member.suretyPhone || "",
    nomineeName: member.nomineeName || "",
    nomineePhone: member.nomineePhone || "",
    nomineeRelation: member.nomineeRelation || "Wife",
    photo: member.photo || "",
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
      const res = await updateMemberOnly({
        id: member.id,
        ...formData,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to update member");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      confirm(
        `Are you sure you want to delete member profile "${member.name} ${member.surname}" and all associated chits?`
      )
    ) {
      setLoading(true);
      try {
        await deleteMember(member.id);
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete member");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Edit Member Details</h3>
              <p className="text-sm text-slate-300 font-bold">
                {member.surname} {member.name}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-base">
          {/* Photo */}
          <div className="p-3.5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center space-x-4">
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
                  <span>
                    {photoLoading ? "Processing..." : formData.photo ? "Change Photo" : "Upload Photo"}
                  </span>
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

          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Surname / Last Name</label>
              <input
                type="text"
                required
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Village / Town</label>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Surety Info */}
          <div className="p-3.5 rounded-2xl bg-sky-50/50 border-2 border-sky-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Surety Details (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          </div>

          {/* Nominee Info */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Nominee Details (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={formData.nomineeRelation}
                  onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominee Phone</label>
                <input
                  type="tel"
                  value={formData.nomineePhone}
                  onChange={(e) => setFormData({ ...formData, nomineePhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 font-bold text-xs hover:bg-rose-50 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Member</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border-2 border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center space-x-1"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>{loading ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
