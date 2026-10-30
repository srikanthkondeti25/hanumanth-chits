"use client";

import React, { useEffect, useState } from "react";
import { formatINR } from "@/lib/formatters";
import { addNewChitMember, getAllMembers, createChitForMember } from "@/app/actions";
import {
  User,
  Phone,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  BadgeIndianRupee,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Users,
  UserPlus,
} from "lucide-react";
import { processImageFile } from "@/lib/image-utils";

interface AddNewChitProps {
  onSuccess: () => void;
}

export default function AddNewChit({ onSuccess }: AddNewChitProps) {
  const [entryMode, setEntryMode] = useState<"EXISTING_MEMBER" | "NEW_MEMBER">("EXISTING_MEMBER");
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    village: "",
    suretyName: "",
    suretyPhone: "",
    nomineeName: "",
    nomineePhone: "",
    nomineeRelation: "Wife",
    chitAmount: 100000,
    durationMonths: 20,
    monthlyInstallment: 5000,
    startDate: new Date().toISOString().slice(0, 10),
    previousDue: 0,
    notes: "",
    photo: "",
  });

  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load registered members for the dropdown
  useEffect(() => {
    async function fetchMembers() {
      const list = await getAllMembers();
      setExistingMembers(list);
      if (list.length > 0) {
        setSelectedMemberId(list[0].id);
      } else {
        setEntryMode("NEW_MEMBER");
      }
    }
    fetchMembers();
  }, []);

  const selectedMember = existingMembers.find((m) => m.id === selectedMemberId);

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
    setMessage(null);
    setLoading(true);

    try {
      if (entryMode === "EXISTING_MEMBER") {
        if (!selectedMemberId) {
          setMessage({
            type: "error",
            text: "Please select an existing member",
          });
          setLoading(false);
          return;
        }

        const res = await createChitForMember({
          memberId: selectedMemberId,
          chitAmount: Number(formData.chitAmount),
          durationMonths: Number(formData.durationMonths),
          monthlyInstallment: Number(formData.monthlyInstallment),
          startDate: formData.startDate,
          previousDue: Number(formData.previousDue || 0),
          notes: formData.notes,
        });

        if (res.success) {
          setMessage({
            type: "success",
            text: `Chit assigned successfully to ${selectedMember?.name} ${selectedMember?.surname}!`,
          });
          setTimeout(() => {
            onSuccess();
          }, 1200);
        } else {
          setMessage({ type: "error", text: res.error || "Failed to assign chit" });
        }
      } else {
        // New Member + Chit together
        if (!formData.name.trim() || !formData.surname.trim()) {
          setMessage({
            type: "error",
            text: "Please enter First Name & Surname",
          });
          setLoading(false);
          return;
        }

        if (!formData.phone.trim()) {
          setMessage({
            type: "error",
            text: "Please enter Phone Number",
          });
          setLoading(false);
          return;
        }

        if (!formData.village.trim()) {
          setMessage({
            type: "error",
            text: "Please enter Village / Town",
          });
          setLoading(false);
          return;
        }

        const res = await addNewChitMember({
          ...formData,
          chitAmount: Number(formData.chitAmount),
          durationMonths: Number(formData.durationMonths),
          monthlyInstallment: Number(formData.monthlyInstallment),
          previousDue: Number(formData.previousDue || 0),
        });

        if (res.success) {
          setMessage({
            type: "success",
            text: `New member and chit saved successfully for ${res.memberName}!`,
          });
          setTimeout(() => {
            onSuccess();
          }, 1200);
        } else {
          setMessage({ type: "error", text: res.error || "Failed to save chit details" });
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border-2 border-slate-300 shadow-xl overflow-hidden p-6 sm:p-8">
      {/* Banner */}
      <div className="border-b-2 border-slate-200 pb-5 mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          ➕ Add New Chit
        </h2>
        <p className="text-base sm:text-lg text-slate-600 mt-1 font-medium">
          Select a registered member or enter new member details along with chit terms.
        </p>

        {/* Mode Selector Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={() => setEntryMode("EXISTING_MEMBER")}
            className={`py-3.5 px-4 rounded-2xl font-black text-base flex items-center justify-center space-x-2 border-2 transition-all ${
              entryMode === "EXISTING_MEMBER"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <Users className="w-5 h-5 text-amber-400" />
            <span>1. Select Existing Member ({existingMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode("NEW_MEMBER")}
            className={`py-3.5 px-4 rounded-2xl font-black text-base flex items-center justify-center space-x-2 border-2 transition-all ${
              entryMode === "NEW_MEMBER"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>2. New Member + Chit Details</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl mb-6 text-base font-bold flex items-center space-x-3 border-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-400"
              : "bg-rose-50 text-rose-900 border-rose-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* MODE 1: SELECT EXISTING MEMBER */}
        {entryMode === "EXISTING_MEMBER" && (
          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-300 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 pb-2 border-b-2 border-slate-200">
              <Users className="w-6 h-6 text-indigo-700" />
              <h3 className="text-xl font-black">Select Registered Person</h3>
            </div>

            {existingMembers.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm font-bold">
                No members registered yet. Please switch to &quot;New Member + Chit Details&quot; above.
              </div>
            ) : (
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">
                  Select Member from List *
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 font-bold text-slate-900 text-lg bg-white"
                >
                  {existingMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.surname} {m.name} — {m.village} ({m.phone})
                    </option>
                  ))}
                </select>

                {/* Selected Member Preview Card */}
                {selectedMember && (
                  <div className="mt-4 p-4 rounded-2xl bg-white border-2 border-indigo-200 flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                      {selectedMember.photo ? (
                        <img
                          src={selectedMember.photo}
                          alt={selectedMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-black text-xl text-indigo-700">
                          {selectedMember.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h4 className="text-xl font-black text-slate-900">
                        {selectedMember.surname} {selectedMember.name}
                      </h4>
                      <p className="text-sm font-bold text-slate-600">
                        Phone: {selectedMember.phone} • Village: {selectedMember.village}
                      </p>
                      <div className="text-xs text-slate-500 font-semibold pt-1">
                        Surety: {selectedMember.suretyName || "None"} ({selectedMember.suretyPhone || "N/A"}) • Nominee: {selectedMember.nomineeName || "None"} ({selectedMember.nomineeRelation || "N/A"})
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: REGISTER NEW MEMBER */}
        {entryMode === "NEW_MEMBER" && (
          <>
            {/* SECTION 1: MEMBER PERSONAL DETAILS */}
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 pb-2 border-b-2 border-slate-200">
                <User className="w-6 h-6 text-indigo-700" />
                <h3 className="text-xl font-black">1. Member Personal Details</h3>
              </div>

              {/* Member Photo Upload */}
              <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                  {formData.photo ? (
                    <img
                      src={formData.photo}
                      alt="Member Photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-8 h-8" />
                      <span className="text-[10px] font-bold mt-1">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <label className="block text-base font-black text-slate-800">
                    📸 Member Photo (Optional)
                  </label>
                  <p className="text-xs text-slate-500 font-medium">
                    Upload from phone camera or select from device gallery
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all">
                      <Camera className="w-4 h-4" />
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
                        className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Surname / Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    placeholder="e.g. Reddy"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Srinivas"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-mono font-bold text-slate-900 bg-white text-lg"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Village / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="e.g. Tadipatri"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: SURETY DETAILS */}
            <div className="bg-sky-50/40 p-6 rounded-2xl border-2 border-sky-200 space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 pb-2 border-b-2 border-sky-200">
                <ShieldCheck className="w-6 h-6 text-sky-700" />
                <h3 className="text-xl font-black">Surety Details (Optional)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Surety Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.suretyName}
                    onChange={(e) => setFormData({ ...formData, suretyName: e.target.value })}
                    placeholder="Enter surety name if any"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Surety Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.suretyPhone}
                    onChange={(e) => setFormData({ ...formData, suretyPhone: e.target.value })}
                    placeholder="Mobile number"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-mono font-bold text-slate-900 bg-white text-lg"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: NOMINEE DETAILS */}
            <div className="bg-emerald-50/40 p-6 rounded-2xl border-2 border-emerald-200 space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 pb-2 border-b-2 border-emerald-200">
                <HeartHandshake className="w-6 h-6 text-emerald-700" />
                <h3 className="text-xl font-black">Nominee Details (Optional)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Nominee Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    placeholder="Enter nominee name if any"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.nomineeRelation}
                    onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-base"
                  >
                    <option value="Wife">Wife</option>
                    <option value="Husband">Husband</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1">
                    Nominee Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.nomineePhone}
                    onChange={(e) => setFormData({ ...formData, nomineePhone: e.target.value })}
                    placeholder="Mobile number"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-mono font-bold text-slate-900 bg-white text-lg"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* CHIT SCHEME DETAILS (COMMON TO BOTH MODES) */}
        <div className="bg-amber-50/40 p-6 rounded-2xl border-2 border-amber-200 space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 pb-2 border-b-2 border-amber-200">
            <BadgeIndianRupee className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-black">Chit Scheme & Financial Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-black text-slate-900 text-xl focus:border-amber-600 bg-white"
              />
              <span className="text-sm font-bold text-amber-800 mt-1 block">
                {formatINR(formData.chitAmount)}
              </span>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 mb-1">
                Duration (Months) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={formData.durationMonths}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-black text-slate-900 text-xl focus:border-amber-600 bg-white"
              />
              <span className="text-sm font-semibold text-slate-600 mt-1 block">
                {formData.durationMonths} Months
              </span>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 mb-1">
                Monthly Installment (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.monthlyInstallment}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyInstallment: Number(e.target.value) })
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-black text-slate-900 text-xl focus:border-amber-600 bg-white"
              />
              <span className="text-sm font-bold text-emerald-700 mt-1 block">
                {formatINR(formData.monthlyInstallment)} / Month
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-base font-bold text-slate-800 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-white text-base"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 mb-1">
                Previous Due / Balance (₹)
              </label>
              <input
                type="number"
                min={0}
                value={formData.previousDue}
                onChange={(e) =>
                  setFormData({ ...formData, previousDue: Number(e.target.value) })
                }
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-rose-700 bg-white text-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-bold text-slate-800 mb-1">
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Installment due on 5th of every month (Optional)"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 font-medium text-slate-900 bg-white text-base"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl sm:text-2xl shadow-xl flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            <Save className="w-7 h-7" />
            <span>
              {loading
                ? "Saving..."
                : entryMode === "EXISTING_MEMBER"
                ? "💾 Assign Chit to Member"
                : "💾 Save New Member & Chit"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
