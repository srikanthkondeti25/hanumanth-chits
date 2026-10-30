"use client";

import React from "react";
import Link from "next/link";
import { Coins, Home, LogOut, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SimpleNavbar() {
  const { isAuthenticated, userName, logout } = useAuth();

  return (
    <header className="bg-slate-900 text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0 group-hover:scale-105 transition-transform">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                Hanumanth Chits & Finance
              </h1>
              <p className="text-sm text-slate-300 font-medium">
                Chit Business & Khatabook Management Book
              </p>
            </div>
          </Link>

          <div className="flex items-center space-x-3 self-start sm:self-auto flex-wrap gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-sm border border-slate-700"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>

                <div className="text-left sm:text-right bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                      Owner Account
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {userName || "Hanumanth (Owner)"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white font-bold text-xs sm:text-sm border border-rose-800 transition-colors shadow-xs"
                  title="Sign out of Hanumanth Chits"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 font-bold text-xs border border-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authentication Required</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
