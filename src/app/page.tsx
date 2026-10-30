"use client";

import React, { useState } from "react";
import MembersDirectory from "@/components/MembersDirectory";
import AddNewChit from "@/components/AddNewChit";
import ExistingChits from "@/components/ExistingChits";
import CompletedChits from "@/components/CompletedChits";
import FinanceBook from "@/components/FinanceBook";
import LoginScreen from "@/components/LoginScreen";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  PlusCircle,
  ListFilter,
  CheckCircle,
  Coins,
  Wallet,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [mainMode, setMainMode] = useState<"CHITS" | "FINANCE">("CHITS");
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "ADD" | "EXISTING" | "COMPLETED">("MEMBERS");

  // 1. Loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-bold text-base">
          Securing Hanumanth Chits & Finance...
        </p>
      </div>
    );
  }

  // 2. Gatekeeper: If NOT authenticated, show Login Screen only!
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={login} />;
  }

  // 3. Authenticated: Render Full Management Book
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* ================= TOP LEVEL MODE SWITCHER ================= */}
      <div className="bg-slate-900 p-2 sm:p-2.5 rounded-3xl border-3 border-amber-500 shadow-xl">
        <div className="grid grid-cols-2 gap-2">
          {/* Mode 1: Chit Business Book */}
          <button
            type="button"
            onClick={() => setMainMode("CHITS")}
            className={`py-3.5 px-3 sm:px-5 rounded-2xl font-black text-sm sm:text-lg transition-all flex items-center justify-center space-x-2 sm:space-x-3 ${
              mainMode === "CHITS"
                ? "bg-amber-500 text-slate-950 shadow-lg scale-[1.01]"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <div className="text-left">
              <span className="block font-black leading-tight">Chit Business</span>
              <span className="text-[10px] sm:text-xs opacity-80 block font-bold">
                చీటీల నిర్వహణ పుస్తకం
              </span>
            </div>
          </button>

          {/* Mode 2: Finance Operations (Khatabook) */}
          <button
            type="button"
            onClick={() => setMainMode("FINANCE")}
            className={`py-3.5 px-3 sm:px-5 rounded-2xl font-black text-sm sm:text-lg transition-all flex items-center justify-center space-x-2 sm:space-x-3 ${
              mainMode === "FINANCE"
                ? "bg-amber-500 text-slate-950 shadow-lg scale-[1.01]"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <div className="text-left">
              <span className="block font-black leading-tight">Finance (Khatabook)</span>
              <span className="text-[10px] sm:text-xs opacity-80 block font-bold">
                ఫైనాన్స్ & ఖాతా పుస్తకం
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ================= CONDITIONAL CONTENT: CHITS vs FINANCE ================= */}
      {mainMode === "FINANCE" ? (
        <FinanceBook onBackToChits={() => setMainMode("CHITS")} />
      ) : (
        <div className="space-y-6">
          {/* Chit Tabs Bar (Elder-friendly, large buttons) */}
          <div className="bg-white p-2.5 rounded-3xl border-3 border-slate-300 shadow-md">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Tab 1: Members (People Directory) */}
              <button
                type="button"
                onClick={() => setActiveTab("MEMBERS")}
                className={`flex items-center justify-center space-x-2.5 py-4 px-3 rounded-2xl font-black text-sm sm:text-base transition-all ${
                  activeTab === "MEMBERS"
                    ? "bg-indigo-700 text-white shadow-lg scale-[1.01]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span className="font-black text-base sm:text-lg">1. Members (People)</span>
              </button>

              {/* Tab 2: Add New Chit */}
              <button
                type="button"
                onClick={() => setActiveTab("ADD")}
                className={`flex items-center justify-center space-x-2.5 py-4 px-3 rounded-2xl font-black text-sm sm:text-base transition-all ${
                  activeTab === "ADD"
                    ? "bg-emerald-600 text-white shadow-lg scale-[1.01]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <PlusCircle className="w-5 h-5 shrink-0" />
                <span className="font-black text-base sm:text-lg">2. Add New Chit</span>
              </button>

              {/* Tab 3: Existing Running Chits */}
              <button
                type="button"
                onClick={() => setActiveTab("EXISTING")}
                className={`flex items-center justify-center space-x-2.5 py-4 px-3 rounded-2xl font-black text-sm sm:text-base transition-all ${
                  activeTab === "EXISTING"
                    ? "bg-slate-900 text-white shadow-lg scale-[1.01]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ListFilter className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-black text-base sm:text-lg">3. Running Chits</span>
              </button>

              {/* Tab 4: Completed Chits */}
              <button
                type="button"
                onClick={() => setActiveTab("COMPLETED")}
                className={`flex items-center justify-center space-x-2.5 py-4 px-3 rounded-2xl font-black text-sm sm:text-base transition-all ${
                  activeTab === "COMPLETED"
                    ? "bg-amber-600 text-white shadow-lg scale-[1.01]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="font-black text-base sm:text-lg">4. Completed Chits</span>
              </button>
            </div>
          </div>

          {/* Render Active Section */}
          <div>
            {activeTab === "MEMBERS" && (
              <MembersDirectory onChitAssigned={() => setActiveTab("EXISTING")} />
            )}
            {activeTab === "ADD" && (
              <AddNewChit onSuccess={() => setActiveTab("EXISTING")} />
            )}
            {activeTab === "EXISTING" && (
              <ExistingChits onGoToAddNew={() => setActiveTab("ADD")} />
            )}
            {activeTab === "COMPLETED" && <CompletedChits />}
          </div>
        </div>
      )}
    </div>
  );
}
