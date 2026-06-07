"use server";

import { streamText, type ModelMessage } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import { getFullProfile } from "@/lib/github";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";
import { cookies, headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { after } from "next/server";

const apiKey = process.env.GEMINI_API_KEY || "";

function getGoogleClient() {
  return createGoogleGenerativeAI({
    apiKey,
  });
}

const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemma-4-31b-it",
  "gemini-flash-latest",
];

function getPacificMidnightExpiry(): Date {
  const now = new Date();
  const pacificStr = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const pacificDate = new Date(pacificStr);
  const midnightPacific = new Date(pacificStr);
  midnightPacific.setHours(24, 0, 0, 0);
  const diffMs = midnightPacific.getTime() - pacificDate.getTime();
  return new Date(now.getTime() + diffMs);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
});

const askYlyaBotInputSchema = z.object({
  messages: z.array(messageSchema),
});

interface SupabaseVectorChunk {
  id: number;
  project_id: string;
  project_name: string;
  content: string;
  metadata: {
    role: string;
    phase: string;
    languages: string[];
    frameworks: string[];
    segment_type: string;
  };
  similarity: number;
}

function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  let details = "";
  try {
    details += " " + JSON.stringify(err);
  } catch {}
  if (typeof err === "object") {
    const record = err as Record<string, unknown>;
    if ("message" in record && typeof record.message === "string")
      details += " " + record.message;

    if ("errors" in record && Array.isArray(record.errors))
      for (const e of record.errors)
        if (
          e &&
          typeof e === "object" &&
          "message" in e &&
          typeof (e as Record<string, unknown>).message === "string"
        )
          details += " " + (e as Record<string, unknown>).message;
        else details += " " + String(e);
  }
  return (details + " " + String(err)).toLowerCase();
}

export async function askYlyaBot(input: {
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
  }>;
}) {
  const startTime = Date.now();
  let firstTokenLatencyMs = 0;

  const validated = askYlyaBotInputSchema.safeParse(input);
  if (!validated.success) throw new Error("Invalid request payload");

  await checkRateLimit("chatbot");

  const { messages } = validated.data;
  const latestMessage = messages[messages.length - 1].content;

  const headerStore = await headers();
  const ip =
    headerStore.get("x-real-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  const city = decodeURIComponent(headerStore.get("x-vercel-ip-city") || "");
  const country = headerStore.get("x-vercel-ip-country") || "";
  const region = headerStore.get("x-vercel-ip-country-region") || "";
  const timezone = headerStore.get("x-vercel-ip-timezone") || "";
  const postalCode = headerStore.get("x-vercel-ip-postal-code") || "";
  const userAgent = headerStore.get("user-agent") || "";
  const ja4 = headerStore.get("x-vercel-ja4-digest") || "";

  const embeddingUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;

  let resolveStreamFinished: (
    value: { text: string; model: string } | null,
  ) => void = () => {};
  const streamFinishedPromise = new Promise<{
    text: string;
    model: string;
  } | null>((resolve) => {
    resolveStreamFinished = resolve;
  });

  after(async () => {
    try {
      const result = await streamFinishedPromise;
      if (!result) return;

      const { text: fullResponseText, model: successModel } = result;
      const latencyMs = firstTokenLatencyMs || Date.now() - startTime;

      await supabase
        .from("ylyabot_logs")
        .insert({
          user_query: latestMessage,
          bot_response: fullResponseText,
          model_used: successModel,
          latency_ms: latencyMs,
          user_ip: ip,
          city,
          country,
          region,
          timezone,
          postal_code: postalCode,
          user_agent: userAgent,
          ja4_fingerprint: ja4,
        })
        .then(({ error }) => {
          if (error) {
            console.warn(
              "⚠️ Failed to log ylya-bot interaction to Supabase in background:",
              error.message,
            );
          }
        });

      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (redisUrl && redisToken) {
        const redis = new Redis({ url: redisUrl, token: redisToken });
        const today = new Date().toISOString().split("T")[0];
        await Promise.all([
          redis.incr("ylyabot:metrics:total_requests"),
          redis.incr(`ylyabot:metrics:daily:${today}`),
          redis.hincrby("ylyabot:metrics:models", successModel, 1),
          country
            ? redis.hincrby("ylyabot:metrics:countries", country, 1)
            : Promise.resolve(),
        ]).catch((redisErr) => {
          console.warn(
            "⚠️ Failed to increment Redis aggregate metrics in background:",
            redisErr,
          );
        });
      }
    } catch (afterErr) {
      console.warn("⚠️ Error in after() background handler:", afterErr);
    }
  });

  let profileData = null;
  let contextString =
    "No specific engineering repository logs found matching this concept.";

  try {
    const [profile, embeddingRes] = await Promise.all([
      getFullProfile(),
      fetch(embeddingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: latestMessage }] },
          outputDimensionality: 768,
        }),
      }).catch((err) => {
        console.warn("⚠️ Embedding network query failed:", err);
        return null;
      }),
    ]);

    profileData = profile;

    if (embeddingRes && embeddingRes.ok) {
      const embeddingData = await embeddingRes.json();
      const queryEmbedding = embeddingData.embedding.values;

      const { data: matchedChunks, error: dbError } = await supabase.rpc(
        "match_portfolio_embeddings",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.25,
          match_count: 4,
        },
      );

      if (!dbError && matchedChunks && matchedChunks.length > 0) {
        const typedChunks = matchedChunks as SupabaseVectorChunk[];
        contextString = typedChunks
          .map(
            (chunk) =>
              `[Project Code: ${chunk.project_name} | ID: ${chunk.project_id}]\n${chunk.content}`,
          )
          .join("\n\n");
      }
    }
  } catch (dataErr) {
    console.warn(
      "⚠️ Data pre-fetching caught expected error, continuing cleanly:",
      dataErr,
    );
  }

  const profileContextStr = profileData
    ? `
### Identity & Status
- **Full Name:** ${profileData.identity.full_name}
- **Current Position:** ${profileData.identity.current_status}
- **Location:** ${profileData.identity.current_location}
- **Nationality:** ${profileData.identity.nationality}
- **Active Code Base Experience Since:** ${profileData.identity.coding_experience_since}

### Work Styles & Placement Preferences
- **Preferred Work Arrangement:** ${profileData.placement_preferences.preference}
- **Target Regions:** ${profileData.placement_preferences.target_regions.join(", ")}
- **Preferred Technical Domains:** ${profileData.placement_preferences.technical_domains.join(", ")}

### Primary Technical Matrix
- **Core Web Architecture Stack:** ${profileData.skills_matrix.primary_web_stack.join(", ")}
- **Backend & Distributed Relational Services:** ${profileData.skills_matrix.backend_and_data.join(", ")}
- **DevOps, Infrastructure Isolation & Run-times:** ${profileData.skills_matrix.devops_and_systems.join(", ")}
- **Polyglot Systems Languages Known:** ${profileData.skills_matrix.polyglot_languages.join(", ")}
- **AI Implementation Engineering Frameworks:** ${profileData.skills_matrix.ai_engineering.join(", ")}
- **Ecosystem Tools & Utilities:** ${profileData.skills_matrix.ecosystem_tools.join(", ")}
- **Key Leadership Traits:** ${profileData.skills_matrix.leadership_traits.join(", ")}

### Linguistic Capabilities
- **Languages:** ${profileData.communication.languages.map((l) => `${l.name} (${l.cefr} - ${l.label})`).join(", ")}

### Communication & Professional Channels
- **Email:** ylyamartchenko@gmail.com
${profileData.communication.channels.map((c) => `- **${c.platform}:** ${c.value}`).join("\n")}
- **Live Portfolio:** ${profileData.communication.links.live_portfolio}
- **Downloadable Resume (PDF):** ${profileData.communication.links.downloadable_resume}

### Verified Professional Engineering Milestones
${profileData.timeline_engineering.map((job) => `- **${job.role}** at ${job.company} (${job.location}) [${job.range}]:\n  ${job.bullets.map((b) => `  * ${b}`).join("\n")}`).join("\n")}

### Foundational Experience & Early Leadership
${profileData.timeline_foundational.map((item) => `- **${item.role}** at ${item.company} (${item.location}) [${item.range}]:\n  ${item.bullets.map((b) => `  * ${b}`).join("\n")}`).join("\n")}

### Academic & Technical Education
${profileData.academic_history.map((edu) => `- **${edu.degree}** - ${edu.institution} (${edu.location}) [${edu.range}]:\n  * ${edu.summary}`).join("\n")}
`
    : "Dynamic profile metrics currently unavailable.";

  const systemPrompt = `
You are YlyaBot, the interactive AI clone of Ylya Martchenko. You are engaging with technical recruiters, hiring managers, CTOs, and developers who are evaluating Ylya's professional profile, engineering depth, and project work.

YOUR VOICE & PERSONALITY:
- Match the mindset of a highly capable, autonomous Systems Architect and Full Stack Engineer.
- Be direct, confident, articulate, and deeply technical.
- Keep responses clean, professional, and dense with technical context. Use scannable markdown formatting, structured lists, and bold highlighting.

YOUR RULES OF ENGAGEMENT:
1. Rely entirely on the DYNAMIC PROFILE MATRIX and DYNAMIC PORTFOLIO MATRIX provided below to answer questions about Ylya's work history, skills, contact channels, and codebases.
2. **Contact & Resume Requests**: If asked for Ylya's resume, LinkedIn, GitHub, email, or phone number, retrieve the exact values from the DYNAMIC PROFILE MATRIX (e.g., downloadable resume link is "${profileData?.communication.links.downloadable_resume || "https://resume.hy13dev.com"}") and present them clearly as professional hyperlinks. Always invite the user to also sync via [Or contact me here](/contact) to connect!
3. **CRITICAL ROUTING BOUNDARY**: Never output absolute external production web links (e.g., do not write out raw .com domains or full GitHub repo URLs) when discussing individual projects. Instead, check the project's ID parameter (e.g., 'honey-pot', 'teslimitless', or 'codemafia') and output a clean internal redirection router link exactly like this: "[View Code and Insights](/projects/repo_name)" (e.g. "[View Code and Insights](/projects/teslimitless)").
4. **Relocation & Work Style**: If asked about relocation, target regions, or preferred work style, reference the placements matrix (e.g. Luxembourg, Switzerland, North America; Remote/Hybrid).
5. If an implementation detail is not present in the matrices, say: "I don't have explicit repository execution records on that mechanism yet, but you can sync directly with Ylya at ylyamartchenko@gmail.com or [Or contact me here](/contact)."

DYNAMIC PROFILE MATRIX (IDENTITY, EDUCATION, & HISTORY):
${profileContextStr}

DYNAMIC PORTFOLIO MATRIX (GROUND TRUTH CODING CHUNKS):
${contextString}
`;

  const cookieStore = await cookies();

  const activeModels = MODELS.filter((model) => {
    return !cookieStore.get(`ylyabot_exhausted_${model}`);
  });

  const stream = createStreamableValue("");

  let firstChunk = "";
  let successModel = "";
  let activeReader: ReadableStreamDefaultReader<string> | null = null;

  for (const model of activeModels) {
    try {
      console.log(`Trying model: ${model}`);
      const googleClient = getGoogleClient();
      const result = streamText({
        model: googleClient(model),
        system: systemPrompt,
        messages: messages as unknown as ModelMessage[],
      });

      Promise.resolve(result.text).catch(() => {});
      Promise.resolve(result.usage).catch(() => {});
      Promise.resolve(result.finishReason).catch(() => {});

      const reader = result.textStream.getReader();
      const { value } = await reader.read();
      firstTokenLatencyMs = Date.now() - startTime;

      successModel = model;
      activeReader = reader;
      if (value) firstChunk = value;
      break;
    } catch (err) {
      console.error(`🔴 Model ${model} failed to initialize:`, err);
      const errorMsgLower = extractErrorMessage(err);
      const isQuota =
        errorMsgLower.includes("quota") ||
        errorMsgLower.includes("exhausted") ||
        errorMsgLower.includes("429") ||
        errorMsgLower.includes("resource_exhausted") ||
        errorMsgLower.includes("rate-limits") ||
        errorMsgLower.includes("nooutputgenerated");

      if (isQuota) {
        try {
          const expiry = getPacificMidnightExpiry();
          cookieStore.set(`ylyabot_exhausted_${model}`, "true", {
            expires: expiry,
            path: "/",
          });
          console.log(
            `🍪 Excluded model "${model}" with cookie expiring at midnight Pacific time.`,
          );
        } catch (cookieErr) {
          console.error("⚠️ Failed to set model exhaustion cookie:", cookieErr);
        }
      }
    }
  }

  if (!successModel || !activeReader) {
    const fallbackMsg =
      "⚠️ **Gemini API Quota Exceeded**\n\nYlya's Gemini API free tier daily quota has been reached for my digital twin's LLM connection. Please try again tomorrow, or feel free to contact Ylya directly at ylyamartchenko@gmail.com or [Or contact me here](/contact) to connect!";
    stream.update(fallbackMsg);
    stream.done();
    return { output: stream.value };
  }

  if (firstChunk) stream.update(firstChunk);

  let fullResponseText = "";

  (async () => {
    try {
      while (true) {
        const { value, done } = await activeReader.read();
        if (done) break;
        if (value) {
          stream.update(value);
          fullResponseText += value;
        }
      }
      stream.done();
      resolveStreamFinished({ text: fullResponseText, model: successModel });
    } catch (err) {
      console.error("🔴 Background streaming reader loop failed:", err);
      stream.done();
      resolveStreamFinished(null);
    } finally {
      try {
        activeReader.releaseLock();
      } catch {}
    }
  })();

  return { output: stream.value };
}
