"use client";

import { useState } from "react";
import {
  Bot,
  Clock,
  Globe,
  Activity,
  LogOut,
  RefreshCw,
  Search,
  Calendar,
  MapPin,
  Laptop,
  Fingerprint,
  MessageSquare,
  ChevronRight,
  X,
  Database,
  ArrowLeft,
} from "lucide-react";
import { logoutAction } from "./actions";
import Link from "next/link";

export interface LogEntry {
  id: string;
  created_at: string;
  user_query: string;
  bot_response: string;
  model_used: string;
  latency_ms: number;
  user_ip: string;
  city: string;
  country: string;
  region: string;
  timezone: string;
  postal_code: string;
  user_agent: string;
  ja4_fingerprint: string;
}

interface MetricsDashboardProps {
  dbStats: { totalCount: number; avgLatency: number };
  dbError: string;
  recentLogs: LogEntry[];
  redisStats: {
    totalRequests: number;
    dailyBreakdown: Array<{ date: string; count: number }>;
    models: Record<string, string | number>;
    countries: Record<string, string | number>;
  } | null;
}

export default function MetricsDashboard({
  dbStats,
  dbError,
  recentLogs,
  redisStats,
}: MetricsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");

  const getFlagEmoji = (countryCode: string) => {
    if (!countryCode || countryCode === "unknown") return "🌐";
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch {
      return countryCode;
    }
  };

  const filteredLogs = (() => {
    if (!searchTerm.trim()) return recentLogs;
    const term = searchTerm.toLowerCase();
    return recentLogs.filter(
      (log) =>
        log.user_query?.toLowerCase().includes(term) ||
        log.bot_response?.toLowerCase().includes(term) ||
        log.city?.toLowerCase().includes(term) ||
        log.country?.toLowerCase().includes(term) ||
        log.model_used?.toLowerCase().includes(term) ||
        log.ja4_fingerprint?.toLowerCase().includes(term),
    );
  })();

  const totalQueries = redisStats?.totalRequests || dbStats.totalCount;

  const modelsDistribution = (() => {
    const counts: Record<string, number> = {};

    const MODELS_ORDER = [
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-3.1-flash-lite",
      "gemma-4-31b-it",
    ];
    MODELS_ORDER.forEach((m) => {
      counts[m] = 0;
    });

    if (redisStats?.models && Object.keys(redisStats.models).length > 0)
      Object.entries(redisStats.models).forEach(([k, v]) => {
        counts[k] = Number(v);
      });
    else
      recentLogs.forEach((log) => {
        if (log.model_used)
          counts[log.model_used] = (counts[log.model_used] || 0) + 1;
      });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(counts).map(([name, val]) => ({
      name,
      count: val,
      percentage: Math.round((val / total) * 100),
    }));
  })();

  const countriesDistribution = (() => {
    const list: Array<{ code: string; count: number; percentage: number }> = [];
    const counts: Record<string, number> = {};

    if (redisStats?.countries && Object.keys(redisStats.countries).length > 0)
      Object.entries(redisStats.countries).forEach(([k, v]) => {
        counts[k] = Number(v);
      });
    else
      recentLogs.forEach((log) => {
        if (log.country) counts[log.country] = (counts[log.country] || 0) + 1;
      });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    Object.entries(counts).forEach(([code, val]) => {
      list.push({
        code,
        count: val,
        percentage: Math.round((val / total) * 100),
      });
    });

    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const maxDailyCount = (() => {
    if (!redisStats?.dailyBreakdown) return 1;
    return Math.max(...redisStats.dailyBreakdown.map((d) => d.count), 1);
  })();

  const getDevicePlatform = (ua: string) => {
    if (!ua) return "Unknown Client";
    if (ua.includes("iPhone")) return "iPhone / Mobile iOS";
    if (ua.includes("iPad")) return "iPad / Mobile iOS";
    if (ua.includes("Android")) return "Android Device";
    if (ua.includes("Macintosh")) return "Mac / macOS";
    if (ua.includes("Windows")) return "PC / Windows";
    if (ua.includes("Linux")) return "PC / Linux";
    return "Web Client";
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background font-sans overflow-x-hidden text-foreground selection:bg-apple-orange/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[50%] rounded-full bg-apple-orange/6 dark:bg-apple-orange/4 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[50%] rounded-full bg-apple-blue/5 dark:bg-apple-blue/3 blur-[130px]" />
      </div>

      <header className="w-full border-b border-border/40 shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center py-3 px-3 sm:py-4 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/"
              className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border/40 bg-transparent flex items-center justify-center cursor-pointer"
              aria-label="Back to Home"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
            </Link>
            <div className="relative hidden sm:flex items-center justify-center size-9 shrink-0">
              <div className="absolute inset-0 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-lg blur-sm opacity-20" />
              <div className="relative size-8 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-lg flex items-center justify-center shadow-md">
                <Bot className="size-4 text-white dark:text-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                YlyaBot Analytics Suite
                <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-apple-green/10 text-apple-green border border-apple-green/20 items-center gap-1 animate-pulse">
                  <span className="size-1 rounded-full bg-apple-green" />
                  Live
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 sm:p-2 hover:bg-muted/50 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/40 bg-transparent flex items-center gap-1.5 text-xs font-mono"
            >
              <RefreshCw className="size-3" />
              <span className="hidden sm:inline">Reload</span>
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-1.5 sm:p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all cursor-pointer border border-border/40 bg-transparent flex items-center gap-1.5 text-xs font-mono"
              >
                <LogOut className="size-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 z-10 flex flex-col gap-6">
        {dbError && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-500 animate-fade-in font-medium leading-relaxed shadow-xs">
            <Database className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                Supabase Table Migration Required
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {dbError}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2">
          <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border/30 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 sm:flex-none px-2.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 sm:flex-none px-2.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "logs"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Recent Logs
              {filteredLogs.length > 0 && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-apple-orange/10 text-apple-orange">
                  {filteredLogs.length}
                </span>
              )}
            </button>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground/80">
            Analytics Node: Vercel Edge Serverless
          </span>
        </div>

        {activeTab === "overview" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md flex flex-col justify-between min-h-[110px] group shadow-xs">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Conversations
                  </span>
                  <MessageSquare className="size-4 text-apple-orange group-hover:scale-110 transition-transform duration-300 animate-pulse" />
                </div>
                <div className="mt-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {totalQueries}
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Rolling query count
                  </p>
                </div>
              </div>

              <div className="relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md flex flex-col justify-between min-h-[110px] group shadow-xs">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Average Latency
                  </span>
                  <Clock className="size-4 text-apple-blue group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="mt-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {dbStats.avgLatency || "N/A"}{" "}
                    <span className="text-xs font-semibold text-muted-foreground font-mono">
                      ms
                    </span>
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Embed & stream start speed
                  </p>
                </div>
              </div>

              <div className="relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md flex flex-col justify-between min-h-[110px] group shadow-xs">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Visitor Locations
                  </span>
                  <Globe className="size-4 text-apple-green group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="mt-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {Object.keys(redisStats?.countries || {}).length ||
                      countriesDistribution.length ||
                      0}
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Geographical unique domains
                  </p>
                </div>
              </div>

              <div className="relative p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md flex flex-col justify-between min-h-[110px] group shadow-xs">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Interface State
                  </span>
                  <Activity className="size-4 text-apple-green group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="mt-2">
                  <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-1.5 text-apple-green">
                    Nominal
                  </h2>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Rate limiter & models secure
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md shadow-xs">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-6">
                  <Calendar className="size-4 text-apple-orange" />
                  14-Day Activity Flow
                </h3>

                {redisStats?.dailyBreakdown &&
                redisStats.dailyBreakdown.length > 0 ? (
                  <div className="h-[200px] w-full flex items-end justify-between gap-1.5 md:gap-3 px-2">
                    {redisStats.dailyBreakdown.map((day, idx) => {
                      const percentage = Math.max(
                        (day.count / maxDailyCount) * 100,
                        3,
                      );
                      const dateShort = day.date.substring(5);
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                        >
                          <div className="absolute opacity-0 group-hover:opacity-100 bg-foreground text-background text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm transition-all duration-200 mb-[220px] pointer-events-none z-20">
                            {day.count}
                          </div>

                          <div
                            style={{ height: `${percentage}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 relative ${
                              day.count > 0
                                ? "bg-linear-to-t from-apple-orange/80 to-apple-orange hover:bg-apple-orange/95 shadow-xs"
                                : "bg-muted/30"
                            }`}
                          />
                          <span className="text-[8px] sm:text-[9px] font-mono text-muted-foreground tracking-tight select-none rotate-45 sm:rotate-0 mt-1">
                            {dateShort}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] w-full flex items-center justify-center border border-dashed border-border/50 rounded-xl text-xs text-muted-foreground font-mono">
                    No historical volume logs populated yet.
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Activity className="size-4 text-apple-orange" />
                    Model Fallback Chain Usage
                  </h3>

                  <div className="flex flex-col gap-3.5 mt-4">
                    {modelsDistribution.map((model, idx) => {
                      const barColors = [
                        "bg-apple-orange",
                        "bg-apple-blue",
                        "bg-apple-green",
                        "bg-apple-yellow",
                        "bg-muted-foreground",
                      ];
                      const dotColors = [
                        "bg-apple-orange",
                        "bg-apple-blue",
                        "bg-apple-green",
                        "bg-apple-yellow",
                        "bg-muted",
                      ];

                      return (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono flex items-center gap-1.5">
                              <span
                                className={`size-1.5 rounded-full ${dotColors[idx % dotColors.length]}`}
                              />
                              {model.name}
                            </span>
                            <span className="font-mono font-semibold text-muted-foreground">
                              {model.count} ({model.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColors[idx % barColors.length]}`}
                              style={{ width: `${model.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 text-[9px] font-mono text-muted-foreground leading-relaxed">
                  * Prioritized Model fallback starts at Flash-Latest and
                  cascades dynamically upon quota exhaustions.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md shadow-xs">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Globe className="size-4 text-apple-orange" />
                  Top Visiting Countries
                </h3>

                <div className="flex flex-col gap-4 mt-4">
                  {countriesDistribution.length > 0 ? (
                    countriesDistribution.map((country, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base select-none">
                            {getFlagEmoji(country.code)}
                          </span>
                          <span className="font-semibold font-mono">
                            {country.code === "unknown"
                              ? "Anonymized / VPN"
                              : country.code}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 max-w-[140px] justify-end">
                          <span className="font-mono text-muted-foreground shrink-0">
                            {country.count} ({country.percentage}%)
                          </span>
                          <div className="h-1 w-12 bg-muted/30 rounded-full overflow-hidden shrink-0 hidden sm:block">
                            <div
                              className="h-full rounded-full bg-apple-orange"
                              style={{ width: `${country.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground font-mono text-center py-6 border border-dashed border-border/40 rounded-xl">
                      No country telemetry resolved.
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Activity className="size-4 text-apple-orange" />
                    Systems Diagnostic & TLS Analytics
                  </h3>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Analyzing client connections resolves highly granular
                    fingerprinting signatures natively:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">
                        TLS Standard Signature
                      </span>
                      <span className="text-xs font-semibold font-mono text-apple-orange flex items-center gap-1.5">
                        <Fingerprint className="size-3.5" />
                        JA4 Active
                      </span>
                      <span className="text-[9px] text-muted-foreground/80 mt-1 leading-relaxed">
                        Client signatures hash cipher protocols for bot
                        isolation.
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">
                        IP Proxy Routing Layer
                      </span>
                      <span className="text-xs font-semibold font-mono text-apple-blue flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        iCloud Relay Safe
                      </span>
                      <span className="text-[9px] text-muted-foreground/80 mt-1 leading-relaxed">
                        Secure edge proxies isolate full consumer identifiers.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-muted-foreground/80 leading-relaxed mt-4 pt-3 border-t border-border/40">
                  Dashboard powered by Vercel Edge Serverless nodes
                  communicating natively with Supabase & Upstash clusters.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-5 rounded-2xl border border-border/70 bg-card/35 backdrop-blur-md shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="size-4 text-apple-orange" />
                Recruiter Conversations History Log
              </h3>

              <div className="relative flex items-center w-full sm:max-w-xs">
                <Search className="absolute left-3.5 size-3.5 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Filter queries, countries, fingerprint..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/30 border border-border/80 focus:border-apple-orange/40 text-xs text-foreground placeholder-muted-foreground/70 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-border/40 bg-card/30">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 font-semibold text-muted-foreground select-none">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">User Prompt</th>
                    <th className="p-3 text-right">Speed</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                      const relativeTime = new Date(
                        log.created_at,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const relativeDate = new Date(
                        log.created_at,
                      ).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-muted/20 transition-all cursor-pointer group"
                        >
                          <td className="p-3 whitespace-nowrap font-mono text-muted-foreground">
                            <div>{relativeDate}</div>
                            <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                              {relativeTime}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-sm mr-1.5 select-none">
                              {getFlagEmoji(log.country)}
                            </span>
                            <span className="font-semibold font-mono">
                              {log.city || "Anonymized"}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-medium bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                              {log.model_used
                                ?.replace("-latest", "")
                                .replace("-flash", "") || "gemini"}
                            </span>
                          </td>
                          <td className="p-3 max-w-[240px] truncate font-medium">
                            {log.user_query}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap font-mono font-semibold text-apple-blue">
                            {log.latency_ms
                              ? `${log.latency_ms.toLocaleString()} ms`
                              : "N/A"}
                          </td>
                          <td className="p-3 text-right">
                            <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-foreground/80 group-hover:translate-x-0.5 transition-all" />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground font-mono"
                      >
                        No conversation transcripts matched search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] font-mono text-muted-foreground text-center sm:text-left select-none">
              Showing {filteredLogs.length} of {recentLogs.length} logged
              digital twin interaction profiles.
            </div>
          </div>
        )}
      </main>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border/80 bg-card/90 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-linear-to-r from-apple-orange via-apple-yellow to-apple-blue" />

            <div className="p-5 border-b border-border/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">
                  {getFlagEmoji(selectedLog.country)}
                </span>
                <div>
                  <h3 className="font-semibold text-sm">
                    Conversation Inspector
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Query Session UUID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-none">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 border border-border/40 p-4 rounded-2xl shrink-0 font-mono text-[10px] text-muted-foreground">
                <div className="flex flex-col gap-0.5">
                  <span className="uppercase text-[8px] text-muted-foreground/60">
                    Location details
                  </span>
                  <span className="font-semibold text-foreground truncate flex items-center gap-1">
                    <MapPin className="size-3 text-apple-orange" />
                    {selectedLog.city || "Anonymized"},{" "}
                    {selectedLog.country || "Anonymized"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="uppercase text-[8px] text-muted-foreground/60">
                    Timezone
                  </span>
                  <span className="font-semibold text-foreground truncate">
                    {selectedLog.timezone || "Europe/Paris"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="uppercase text-[8px] text-muted-foreground/60">
                    Execution Speed
                  </span>
                  <span className="font-semibold text-apple-blue flex items-center gap-1">
                    <Clock className="size-3" />
                    {selectedLog.latency_ms} ms
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="uppercase text-[8px] text-muted-foreground/60">
                    Active Model
                  </span>
                  <span className="font-semibold text-foreground truncate">
                    {selectedLog.model_used}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[85%] p-4 rounded-2xl rounded-tr-xs bg-linear-to-tr from-apple-orange/15 to-apple-orange/5 border border-apple-orange/20 text-xs md:text-sm leading-relaxed">
                    <p className="font-semibold text-[10px] text-apple-orange uppercase tracking-wider mb-1 select-none">
                      Recruiter Question
                    </p>
                    <p className="text-foreground">{selectedLog.user_query}</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-start">
                  <div className="size-7 rounded-lg bg-linear-to-br from-apple-orange to-apple-yellow text-white dark:text-foreground flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="max-w-[85%] p-4 rounded-2xl rounded-tl-xs bg-muted/40 border border-border/40 text-xs md:text-sm leading-relaxed">
                    <p className="font-semibold text-[10px] text-apple-blue uppercase tracking-wider mb-1 select-none flex justify-between items-center">
                      <span>Digital Twin Answer</span>
                      <span className="font-mono lowercase text-[9px] text-muted-foreground/80">
                        Stream complete
                      </span>
                    </p>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {selectedLog.bot_response}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/30 pt-4 shrink-0 flex flex-col gap-2 font-mono text-[9px] text-muted-foreground/80 select-all">
                <div className="flex items-center gap-1.5">
                  <Laptop className="size-3 text-muted-foreground/60" />
                  <span className="font-semibold">
                    {getDevicePlatform(selectedLog.user_agent)}
                  </span>
                  <span className="text-muted-foreground/45">|</span>
                  <span className="truncate max-w-[350px]">
                    {selectedLog.user_agent}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Fingerprint className="size-3 text-muted-foreground/60" />
                  <span className="font-semibold">JA4 Fingerprint:</span>
                  <span>
                    {selectedLog.ja4_fingerprint || "unknown / disabled"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="size-3 text-muted-foreground/60" />
                  <span className="font-semibold">Session Real IP:</span>
                  <span>{selectedLog.user_ip}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
