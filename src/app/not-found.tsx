"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Auto redirect back to home after 1 second if landed on an old page
    const timer = setTimeout(() => {
      router.replace("/");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-3 border-slate-300 p-8 text-center max-w-md w-full shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Home className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Redirecting to Home...
        </h2>
        <p className="text-base text-slate-600 font-medium">
          Opening Hanumanth Chits Management Book
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-amber-400" />
            <span>Go to Home Page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
