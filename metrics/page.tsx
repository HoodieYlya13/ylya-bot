import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import MetricsLoginPage from "./MetricsLoginPage";
import MetricsDashboard, { LogEntry } from "./MetricsDashboard";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);

interface RedisStats {
  totalRequests: number;
  dailyBreakdown: Array<{ date: string; count: number }>;
  models: Record<string, string | number>;
  countries: Record<string, string | number>;
}

export default async function MetricsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bot_metrics_auth_token")?.value;

  let isAuthenticated = false;
  if (token) {
    const payload = await verifyJWT(token);
    if (payload) isAuthenticated = true;
  }

  if (!isAuthenticated) return <MetricsLoginPage />;

  let recentLogs: LogEntry[] = [];
  let dbStats = { totalCount: 0, avgLatency: 0 };
  let dbError = "";

  try {
    const { data, error } = await supabase
      .from("ylyabot_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (
        error.message?.includes("does not exist") ||
        error.code === "PGRST204" ||
        error.message?.includes("schema cache")
      )
        dbError =
          "Table public.ylyabot_logs does not exist. Please execute the SQL migration inside your Supabase dashboard!";
      else dbError = error.message;
    } else if (data) {
      recentLogs = data as LogEntry[];

      const { data: allStats, error: allStatsError } = await supabase
        .from("ylyabot_logs")
        .select("latency_ms");

      if (!allStatsError && allStats) {
        const sum = allStats.reduce(
          (acc, row) => acc + (row.latency_ms || 0),
          0,
        );
        dbStats = {
          totalCount: allStats.length,
          avgLatency:
            allStats.length > 0 ? Math.round(sum / allStats.length) : 0,
        };
      }
    }
  } catch (dbErr) {
    dbError = dbErr instanceof Error ? dbErr.message : String(dbErr);
  }

  let redisStats: RedisStats | null = null;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const redis = new Redis({ url: redisUrl, token: redisToken });

      const days: string[] = [];
      const dayKeys: string[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split("T")[0];
        days.push(dayStr);
        dayKeys.push(`ylyabot:metrics:daily:${dayStr}`);
      }

      const [totalRequests, dailyValues, modelsHash, countriesHash] =
        await Promise.all([
          redis.get("ylyabot:metrics:total_requests"),
          redis.mget(...dayKeys),
          redis.hgetall("ylyabot:metrics:models"),
          redis.hgetall("ylyabot:metrics:countries"),
        ]);

      const dailyBreakdown = days.map((day, idx) => ({
        date: day,
        count: Number(dailyValues[idx] || 0),
      }));

      redisStats = {
        totalRequests: Number(totalRequests || 0),
        dailyBreakdown,
        models: (modelsHash || {}) as Record<string, string | number>,
        countries: (countriesHash || {}) as Record<string, string | number>,
      };
    } catch (redisErr) {
      const errorMsg =
        redisErr instanceof Error ? redisErr.message : String(redisErr);
      console.warn(
        "⚠️ Failed to load Redis aggregate metrics on server render:",
        errorMsg,
      );
    }
  }

  return (
    <MetricsDashboard
      dbStats={dbStats}
      dbError={dbError}
      recentLogs={recentLogs}
      redisStats={redisStats}
    />
  );
}
