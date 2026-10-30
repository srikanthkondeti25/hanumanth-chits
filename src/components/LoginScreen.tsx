"use client";

import React, { useState } from "react";
import { loginUserAction } from "@/app/actions";
import {
  Coins,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
} from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (displayName: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginUserAction({
        username,
        password,
        rememberMe,
      });

      if (res.success && res.username) {
        onLoginSuccess(res.username);
      } else {
        setError(res.error || "Incorrect username or password. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-300 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 text-center relative border-b-4 border-amber-500">
          <div className="w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl mb-3">
            <Coins className="w-9 h-9" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Hanumanth Chits
          </h2>
          <p className="text-sm font-bold text-amber-400 mt-1">
            Chit Business Management Book
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Password Protection</span>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (e.g. admin)"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-11 pr-12 py-3 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Keep me signed in for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  <span>Sign In to Hanumanth Chits</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
