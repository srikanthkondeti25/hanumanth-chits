"use client";

import React, { useEffect, useState } from "react";
import { formatINR } from "@/lib/formatters";
import { getAllMembers, createMember } from "@/app/actions";
import { processImageFile } from "@/lib/image-utils";
import AssignChitModal from "@/components/AssignChitModal";
import EditMemberModal from "@/components/EditMemberModal";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  PlusCircle,
  Edit,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookOpen,
} from "lucide-react";
import MemberLedgerModal from "@/components/MemberLedgerModal";

interface MembersDirectoryProps {
  onChitAssigned: () => void;
}

export default function MembersDirectory({ onChitAssigned }: MembersDirectoryProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Modals state
  const [assignMember, setAssignMember] = useState<any>(null);
  const [editMember, setEditMember] = useState<any>(null);
  const [ledgerMemberId, setLedgerMemberId] = useState<string | null>(null);

  // New member form state
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
    photo: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await getAllMembers(searchQuery);
      setMembers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [searchQuery]);

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

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!formData.name.trim() || !formData.surname.trim()) {
      setFormMessage({
        type: "error",
        text: "Please enter First Name & Surname",
      });
      return;
    }

    if (!formData.phone.trim()) {
      setFormMessage({
        type: "error",
        text: "Please enter Phone Number",
      });
      return;
    }

    if (!formData.village.trim()) {
      setFormMessage({
        type: "error",
        text: "Please enter Village / Town",
      });
      return;
    }

    setFormLoading(true);
    try {
      const res = await createMember(formData);
      if (res.success) {
        setFormMessage({
          type: "success",
          text: `Member registered successfully! (${formData.name} ${formData.surname})`,
        });
        setFormData({
          name: "",
          surname: "",
          phone: "",
          village: "",
          suretyName: "",
          suretyPhone: "",
          nomineeName: "",
          nomineePhone: "",
          nomineeRelation: "Wife",
          photo: "",
        });
        loadMembers();
        setTimeout(() => {
          setShowAddForm(false);
          setFormMessage(null);
        }, 1500);
      } else {
        setFormMessage({ type: "error", text: res.error || "Failed to save member" });
      }
    } catch (err: any) {
      setFormMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hello ${name},\nGreetings from Hanumanth Chits.\nContacting you regarding your chit account.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              👥 Registered Members Directory
            </h2>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-black text-sm border border-indigo-300">
              {members.length} Members
            </span>
          </div>
          <p className="text-base text-slate-600 mt-1 font-medium">
            Manage registered members, contact information, surety, and nominee records
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-md transition-all self-start sm:self-auto shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          <span>{showAddForm ? "Close Form" : "➕ Add New Member"}</span>
        </button>
      </div>

      {/* Add New Member Collapsible Form */}
      {showAddForm && (
        <div className="bg-white rounded-3xl border-3 border-indigo-500 shadow-xl p-6 sm:p-8 animate-in fade-in duration-300 space-y-6">
          <div className="border-b-2 border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                ➕ Register New Person
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                Enter person details. Once saved, you can easily assign them to any chit.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700 font-bold text-sm"
            >
              Cancel
            </button>
          </div>

          {formMessage && (
            <div
              className={`p-4 rounded-2xl text-base font-bold flex items-center space-x-3 border-2 ${
                formMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-400"
                  : "bg-rose-50 text-rose-900 border-rose-400"
              }`}
            >
              {formMessage.type === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <span>{formMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateMember} className="space-y-6">
            {/* Member Photo */}
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 shadow-sm">
                {formData.photo ? (
                  <img
                    src={formData.photo}
                    alt="Member Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-7 h-7 text-slate-400" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <span className="block text-base font-black text-slate-800">
                  📸 Member Photo (Optional)
                </span>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm">
                    <Camera className="w-4 h-4" />
                    <span>
                      {photoLoading
                        ? "Processing..."
                        : formData.photo
                        ? "Change Photo"
                        : "Upload Photo"}
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
                      onClick={() => setFormData({ ...formData, photo: "" })}
                      className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Details */}
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

            {/* Surety & Nominee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-sky-50/50 p-4 rounded-2xl border-2 border-sky-200 space-y-3">
                <div className="flex items-center space-x-1.5 text-sky-900 font-black text-base border-b border-sky-200 pb-1">
                  <ShieldCheck className="w-5 h-5 text-sky-700" />
                  <span>Surety Details (Optional)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Surety Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.suretyName}
                    onChange={(e) => setFormData({ ...formData, suretyName: e.target.value })}
                    placeholder="Enter surety name if any"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Surety Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.suretyPhone}
                    onChange={(e) => setFormData({ ...formData, suretyPhone: e.target.value })}
                    placeholder="Mobile number"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-emerald-200 space-y-3">
                <div className="flex items-center space-x-1.5 text-emerald-900 font-black text-base border-b border-emerald-200 pb-1">
                  <HeartHandshake className="w-5 h-5 text-emerald-700" />
                  <span>Nominee Details (Optional)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nominee Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    placeholder="Enter nominee name if any"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                    <select
                      value={formData.nomineeRelation}
                      onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                      className="w-full px-2 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-xs"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nominee Phone (Optional)</label>
                    <input
                      type="tel"
                      value={formData.nomineePhone}
                      onChange={(e) => setFormData({ ...formData, nomineePhone: e.target.value })}
                      placeholder="Phone number"
                      className="w-full px-2 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl shadow-lg flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-6 h-6" />
              <span>
                {formLoading ? "Saving..." : "💾 Save Member"}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-xs">
        <div className="relative">
          <Search className="w-6 h-6 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, surname, village, phone number..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-900 text-lg focus:border-indigo-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Members Cards List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-300 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">No members registered yet</h3>
          <p className="text-base text-slate-500">
            Click &quot;Add New Member&quot; button above to register your first chit member.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-3xl border-3 border-slate-300 p-6 shadow-md hover:border-indigo-400 transition-all space-y-4"
            >
              {/* Member Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-slate-100">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                    {m.photo ? (
                      <img
                        src={m.photo}
                        alt={`${m.name} ${m.surname}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-indigo-900 text-amber-400 flex items-center justify-center font-black text-xl sm:text-2xl uppercase">
                        {m.surname ? m.surname.charAt(0) : m.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                        {m.surname} {m.name}
                      </h3>
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm border border-slate-300 flex items-center space-x-1">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{m.village}</span>
                      </span>
                    </div>

                    {/* Chit Portfolio Status Badges */}
                    <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold mt-2 flex-wrap gap-y-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {m.activeCount} Active Chits
                      </span>
                      {m.completedCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.completedCount} Completed Chits
                        </span>
                      )}
                      {m.totalDue > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-black">
                          Total Due: {formatINR(m.totalDue)}
                        </span>
                      )}
                      {m.transactionsCount > 0 ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full border font-black text-xs ${
                            m.netLedgerBalance > 0
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : m.netLedgerBalance < 0
                              ? "bg-purple-100 text-purple-900 border-purple-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          📒 Ledger Net: {m.netLedgerBalance > 0 ? `Member Owes ` : m.netLedgerBalance < 0 ? `You Owe ` : `Settled `}
                          {formatINR(Math.abs(m.netLedgerBalance))}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs">
                          Ledger: Empty
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contacts */}
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <a
                    href={`tel:${m.phone}`}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 font-bold text-sm border border-sky-300"
                  >
                    <Phone className="w-4 h-4 text-sky-600" />
                    <span>{m.phone}</span>
                  </a>

                  <button
                    onClick={() => handleWhatsApp(m.phone, `${m.name} ${m.surname}`)}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300"
                    title="Send WhatsApp message"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                  </button>
                </div>
              </div>

              {/* Surety & Nominee Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-200 flex items-center space-x-3">
                  <ShieldCheck className="w-6 h-6 text-sky-700 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-sky-900 block">Surety:</span>
                    {m.suretyName ? (
                      <>
                        <span className="font-black text-slate-900">{m.suretyName}</span>
                        {m.suretyPhone && (
                          <span className="text-xs text-slate-600 font-mono ml-2 font-bold">
                            ({m.suretyPhone})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Not Added</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center space-x-3">
                  <HeartHandshake className="w-6 h-6 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Nominee:</span>
                    {m.nomineeName ? (
                      <>
                        <span className="font-black text-slate-900">{m.nomineeName}</span>
                        {m.nomineeRelation && (
                          <span className="text-xs text-emerald-800 font-bold ml-1">
                            ({m.nomineeRelation})
                          </span>
                        )}
                        {m.nomineePhone && (
                          <span className="text-xs text-slate-600 font-mono ml-2 font-bold">
                            • {m.nomineePhone}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Not Added</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {/* ONE-CLICK ACTION: ADD THIS PERSON TO A CHIT */}
                  <button
                    onClick={() => setAssignMember(m)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>➕ Assign to Chit</span>
                  </button>

                  {/* EDITABLE FINANCIAL HISTORY / LEDGER BUTTON */}
                  <button
                    onClick={() => setLedgerMemberId(m.id)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md transition-all"
                  >
                    <BookOpen className="w-5 h-5 text-slate-950" />
                    <span>📒 Money History</span>
                  </button>
                </div>

                <button
                  onClick={() => setEditMember(m)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100"
                >
                  <Edit className="w-4 h-4 text-slate-500" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AssignChitModal
        isOpen={!!assignMember}
        onClose={() => setAssignMember(null)}
        member={assignMember}
        onSuccess={() => {
          loadMembers();
          onChitAssigned();
        }}
      />

      <EditMemberModal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        member={editMember}
        onSuccess={loadMembers}
      />

      <MemberLedgerModal
        isOpen={!!ledgerMemberId}
        onClose={() => setLedgerMemberId(null)}
        memberId={ledgerMemberId}
        onUpdate={loadMembers}
      />
    </div>
  );
}
