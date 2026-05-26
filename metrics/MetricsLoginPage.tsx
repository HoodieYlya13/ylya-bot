"use client";

import { useState, useActionState, useEffect } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Terminal,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { loginAction } from "./actions";

export default function MetricsLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [password, setPassword] = useState("");

  const [state, formAction, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success) window.location.reload();
    else if (state?.error) {
      const shakeTimer = setTimeout(() => setShouldShake(true), 0);
      const resetTimer = setTimeout(() => setShouldShake(false), 500);
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [state]);

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-background px-4 overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[50%] rounded-full bg-apple-orange/8 dark:bg-apple-orange/5 blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[50%] rounded-full bg-apple-blue/6 dark:bg-apple-blue/4 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]" />

      <div className="w-full max-w-[420px] z-10">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border/40 text-[10px] font-mono text-muted-foreground select-none">
            <Terminal className="size-3 text-apple-green" />
            <span>Secure Gatekeeper</span>
          </div>
        </div>

        <div
          className={`relative p-8 rounded-3xl border border-border/70 bg-card/35 backdrop-blur-xl shadow-2xl transition-all duration-300 overflow-hidden ${
            shouldShake ? "animate-shake" : ""
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-[2px] bg-linear-to-r from-apple-orange/60 via-apple-yellow/50 to-apple-blue/60 rounded-t-3xl" />

          <div className="flex flex-col items-center text-center gap-4 mb-8 mt-2">
            <div className="relative flex items-center justify-center size-14">
              <div className="absolute inset-0 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-xl blur-md opacity-25" />
              <div className="relative size-12 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-xl flex items-center justify-center shadow-lg">
                <Lock className="size-5 text-white dark:text-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                Bot Metrics Gateway
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px]">
                Authentication required. Enter the administration password to
                access ylya-bot analytical telemetries.
              </p>
            </div>
          </div>

          {state?.error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-xl bg-destructive/10 border border-destructive/25 text-xs text-destructive animate-fade-in font-medium leading-relaxed">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-destructive" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            <div className="relative flex items-center w-full">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                disabled={isPending}
                autoFocus
                className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-muted/20 border border-border/80 focus:border-apple-orange/50 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-apple-orange/10 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-4 p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={isPending || !password.trim()}
              className="w-full py-3.5 rounded-2xl bg-apple-orange hover:bg-apple-orange/95 disabled:opacity-30 disabled:pointer-events-none text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer border-none shadow-sm shadow-apple-orange/20"
            >
              <span>{isPending ? "Authenticating..." : "Unlock Console"}</span>
              {!isPending && (
                <ArrowRight className="size-4" strokeWidth={2.5} />
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-apple-orange transition-colors font-mono"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
