import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getFullProfile } from "@/lib/github";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
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

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    const embeddingUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${process.env.GEMINI_API_KEY}`;

    const [profileData, embeddingRes] = await Promise.all([
      getFullProfile(),
      fetch(embeddingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: latestMessage }] },
          outputDimensionality: 768,
        }),
      }),
    ]);

    if (!embeddingRes.ok)
      throw new Error(
        `Gemini Embedding API network error: ${embeddingRes.statusText}`,
      );

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

    if (dbError) throw dbError;

    const typedChunks = matchedChunks as SupabaseVectorChunk[];

    const contextString =
      typedChunks && typedChunks.length > 0
        ? typedChunks
            .map(
              (chunk) =>
                `[Project Code: ${chunk.project_name} | ID: ${chunk.project_id}]\n${chunk.content}`,
            )
            .join("\n\n")
        : "No specific engineering repository logs found matching this concept.";

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
2. **Contact & Resume Requests**: If asked for Ylya's resume, LinkedIn, GitHub, email, or phone number, retrieve the exact values from the DYNAMIC PROFILE MATRIX (e.g., downloadable resume link is "${profileData?.communication.links.downloadable_resume || 'https://www.hy13dev.com/Resume_Ylya_Martchenko.pdf'}") and present them clearly as professional hyperlinks.
3. **CRITICAL ROUTING BOUNDARY**: Never output absolute external production web links (e.g., do not write out raw .com domains or full GitHub repo URLs) when discussing individual projects. Instead, check the project's ID parameter (e.g., 'honey-pot', 'teslimitless', or 'codemafia') and output a clean internal redirection router link exactly like this: "[View Code and Insights](/projects/repo_name)" (e.g. "[View Code and Insights](/projects/teslimitless)").
4. **Relocation & Work Style**: If asked about relocation, target regions, or preferred work style, reference the placements matrix (e.g. Luxembourg, Switzerland, North America; Remote/Hybrid).
5. If an implementation detail is not present in the matrices, say: "I don't have explicit repository execution records on that mechanism yet, but you can sync directly with Ylya at ylyamartchenko@gmail.com or [Or contact me here](/contact)."

DYNAMIC PROFILE MATRIX (IDENTITY, EDUCATION, & HISTORY):
${profileContextStr}

DYNAMIC PORTFOLIO MATRIX (GROUND TRUTH CODING CHUNKS):
${contextString}
`;

    const responseStream = await streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: messages,
    });

    return responseStream.toTextStreamResponse();
  } catch (error) {
    console.error("🔴 Critical Serverless Route Exception:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Route Processor Crash" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
