# 🤖 YlyaBot — AI Digital Twin

<div align="center">
  <img src="https://raw.githubusercontent.com/HoodieYlya13/HoodieYlya13/main/public/header.gif" alt="YlyaBot AI Digital Twin" width="100%" />

  <h3>🧠 RAG-Powered Conversational Engine • Centralized SSoT Grounding • Multi-Repo Vector Ingestion</h3>

  <p>
    <strong>YlyaBot</strong> is an advanced AI Digital Twin and interactive virtual concierge. Built on a serverless, highly optimized vector retrieval architecture, it represents my professional philosophy, engineering decisions, and codebase architectures with 100% factual accuracy and zero hallucination.
  </p>

  <p align="center">
    <a href="https://www.hy13dev.com/ylya-bot"><img src="https://img.shields.io/badge/Live_Chat-YlyaBot-orange?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Live Chat" /></a>
    <a href="https://github.com/HoodieYlya13/portfolio"><img src="https://img.shields.io/badge/Parent_Repository-Portfolio-blue?style=for-the-badge&logo=github&logoColor=white" alt="Parent Repo" /></a>
    <a href="https://raw.githubusercontent.com/HoodieYlya13/HoodieYlya13/main/profile.json"><img src="https://img.shields.io/badge/Data_Source-SSoT_profile.json-green?style=for-the-badge&logo=json&logoColor=white" alt="SSoT profile.json" /></a>
  </p>
</div>

---

## 🏗️ System Architecture & RAG Pipeline

YlyaBot does not rely on generic pre-trained LLM assumptions. Instead, it utilizes a dual-layer grounding architecture combining **Stateless System Prompt Injection** (for personal bio/timeline data fetched live from a centralized Single Source of Truth) and a **Multi-Repository Vector Store** (for deep architectural and codebase queries).

```mermaid
flowchart TD
    %% Core Inputs
    ProfileJSON[("📄 profile.json<br>(Central SSoT Repo)")]
    Repos[("📦 14 GitHub Repositories<br>(Ecosystem Matrices)")]

    %% Ingestion Pipeline
    subgraph IngestionPipeline ["🧬 Codebase Ingestion & Vectorization Engine"]
        PortJSON["📄 portfolio.json<br>(Repo Content Manifest)"]
        Parser["⚙️ Multi-Chunk Markdown Aggregator"]
        Embedder["🧠 gemini-embedding-2 (768-dim)"]
        VectorDB[("🗄️ Supabase Postgres + pgvector<br>(Idempotent Upsert Store)")]
    end

    %% Runtime Query Flow
    subgraph Runtime ["⚡ Edge Serverless Route Engine (Next.js)"]
        UserQuery["👤 User Message Input"]
        QueryEmbed["⚡ Query Vectorization (768-dim)"]
        SemanticSearch["🔍 Stored SQL RPC match_portfolio_embeddings"]
        SysPrompt["🛠️ Markdown System Prompt Weaver"]
        LLM["🤖 Inference Engine (gemini-2.5-flash)"]
        StreamResponse["🛰️ Text Streams Response Output"]
    end

    %% Flow Connections
    ProfileJSON -.->|Concurrent Promise Fetch| SysPrompt
    Repos -->|Triggers on push/merge| PortJSON
    PortJSON --> Parser
    Parser --> Embedder
    Embedder -->|Highly Efficient Upsert Array| VectorDB

    UserQuery --> QueryEmbed
    QueryEmbed --> SemanticSearch
    VectorDB -->|Cosine-Distance Metric Math| SemanticSearch
    SemanticSearch -->|Top 4 Domain-Specific Chunks| SysPrompt
    SysPrompt -->|Grounding Data Context| LLM
    LLM -->|Chunked Binary Buffers| StreamResponse
    StreamResponse -->|Custom Front-End Chunk Decoder| UserQuery

    %% Styling
    classDef main fill:#6366f1,stroke:#312e81,stroke-width:2px,color:#fff;
    classDef runtime fill:#1f2937,stroke:#374151,stroke-width:1px,color:#fff;
    classDef ingest fill:#10b981,stroke:#065f46,stroke-width:1px,color:#fff;
    class SSoT main;
    class IngestionPipeline,PortJSON,Parser,Embedder,VectorDB ingest;
    class Runtime,UserQuery,QueryEmbed,SemanticSearch,SysPrompt,LLM,StreamResponse runtime;
```

---

## 🧬 How the LLM is "Ragged" (Deep Technical Breakdown)

To avoid feeding thousands of lines of raw source files into an LLM context—which degrades retrieval precision and inflates latency—YlyaBot uses a structured **Repository-to-Vector (R2V) Corpus Ingestion Pipeline**.

### 1. The Repository Manifest: `portfolio.json`
Every repository across my GitHub account contains an exhaustive, standardized `portfolio.json` file in its root directory. This manifest acts as a structured semantic blueprint of the repository:

```json
{
  "routing": {
    "repo_name": "honey-pot",
    "project_name": "Honey Pot Server Simulator"
  },
  "project_meta": {
    "role": "Full-Stack & Security Engineer",
    "development_phase": "Completed / Simulation Sandbox",
    "languages": ["TypeScript", "JavaScript", "SQL", "Docker"],
    "frameworks_and_tools": ["Next.js", "React", "Prisma ORM", "PostgreSQL"]
  },
  "comprehensive_description": "An interactive full-stack Honeypot application designed for enterprise security research and attacker behavior monitoring...",
  "engineering_highlights": [
    "Intentionally Engineered Security Defects mimicking common misconfigurations.",
    "Comprehensive Forensic Logging Layer capturing attacker telemetry directly to centralized log files."
  ],
  "measurable_metrics": {
    "execution_latency": "Command execution response under 50ms...",
    "ui_performance": "Lighthouse Performance score of 98/100...",
    "operational_cost": "$0/month runtime footprint."
  },
  "star_challenges": [
    {
      "situation": "The honeypot must record every single step of the attacker silently...",
      "action": "Developed custom logging functions in the Next.js API routes...",
      "result": "Administrators monitor attacker behavior in real time with zero operational indicators leaked."
    }
  ],
  "architectural_deep_dive": {
    "text": "The system's architecture is a multi-tier sandbox environment orchestrated entirely via Docker Compose..."
  },
  "lessons_learned": "Exposing shell commands demands absolute containerized DevSecOps isolation boundaries..."
}
```

### 2. CI/CD Automated Processing
When a repository codebase is pushed or a pull request is merged into `main`, a custom GitHub Action workflow triggers. This workflow runs an automated script that pulls a centralized parser from my `ylya-bot` master repository, splitting the manifest data into 6 highly contextual markdown paragraphs mapped to strict data segments (Overview, Benchmarks, STAR Challenges, Systems Architecture).

The script then requests a compressed 768-dimensional mathematical vector matrix from Google AI Studio's `gemini-embedding-2` engine and uses an idempotent SQL `.upsert()` call to securely seed a remote Supabase PostgreSQL database instance.

### 3. Stored DB-Level Match Execution (RPC)
When a user submits a prompt, rather than wasting memory calculating array values inside our serverless runtime environment, the system utilizes a custom native PostgreSQL Remote Procedure Call (RPC) function to calculate Cosine-Distance Math directly on the database cluster:

```sql
CREATE OR REPLACE FUNCTION match_portfolio_embeddings (
  query_embedding vector(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (id BIGINT, project_id TEXT, project_name TEXT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    portfolio_embeddings.id, portfolio_embeddings.project_id, portfolio_embeddings.project_name, portfolio_embeddings.content, portfolio_embeddings.metadata,
    1 - (portfolio_embeddings.embedding <=> query_embedding) AS similarity
  FROM portfolio_embeddings
  WHERE 1 - (portfolio_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY portfolio_embeddings.embedding <=> query_embedding ASC LIMIT match_count;
END;
$$;
```

---

## ⚡ High-Performance React Server Action

The backend uses a parallel data architecture encapsulated entirely within a modern Next.js 16 Server Action. When invoked, it dispatches concurrent asynchronous promises via `Promise.all` to fetch the global profile SSoT data and generate query vector coordinates simultaneously, significantly lowering time-to-first-byte (TTFB). To prevent abuse, it executes an Upstash Redis-backed sliding window rate limiter (max 10 messages/minute) identified by client cookies.

```typescript
// app/ylya-bot/actions.ts
import { streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { checkRateLimit } from "@/lib/ratelimit";

export async function askYlyaBot(input: { messages: Array<{ role: string; content: string }> }) {
  await checkRateLimit("chatbot"); // Enforce Upstash sliding window rate limiting
  
  const [profileData, embeddingRes] = await Promise.all([
    getFullProfile(),
    fetch(embeddingUrl, { /* ... generative embedding body ... */ })
  ]);
  
  const stream = createStreamableValue("");
  
  (async () => {
    try {
      const { textStream } = streamText({
        model: google("gemini-2.5-flash"),
        system: systemPrompt,
        messages: messages as any,
      });

      for await (const textDelta of textStream) {
        stream.update(textDelta);
      }
      stream.done();
    } catch (err) {
      stream.error(err);
    }
  })();

  return { output: stream.value };
}
```

---

## 🛰️ Typesafe Client-Side Stream Consumption

Instead of adding bloated external state-tracking packages or manual binary decoders, the user interface utilizes the Vercel AI SDK's `@ai-sdk/rsc` package to read the streamed tokens from the Server Action as a standard async iterator, updating message states on-the-fly.

```typescript
// app/ylya-bot/page.tsx
import { readStreamableValue } from "@ai-sdk/rsc";
import { askYlyaBot } from "./actions";

// Client-side handler inside page component
const { output } = await askYlyaBot({ messages: apiMessages });

for await (const delta of readStreamableValue(output)) {
  if (delta !== undefined) {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === newBotMessageId
          ? { ...msg, text: (msg.text || "") + delta }
          : msg
      )
    );
  }
}
```

---

## 🎨 Premium Design Aesthetics

The user interface follows a modern, responsive minimalist design system matching the rest of the application ecosystem:
- **Translucent Micro-Glass:** Interactive cards feature custom high-blur backdrops (`backdrop-blur-xl bg-card/30 border-border/60`) for smooth visual composition.
- **Strict Color Tokens:** Utilizes explicit theme identifiers to display application metrics states (`--apple-orange` for links/strong typography text, `--apple-green` for execution heartbeats, `--apple-blue` for inline syntax data capsules).
- **Absolute Redirection Contours:** Prompts enforce internal site routing constraints, rendering responsive local app sub-paths (e.g., `[Insights](/projects/honey-pot)`) instead of leaking ugly raw markdown source URLs.

---

<div align="center">
  <sub>YlyaBot AI Engine • Created with ❤️ and precision • Centralized SSoT v1.5.0</sub>
</div>
