// fallow-ignore-file unused-file
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_KEY ||
  !process.env.GEMINI_API_KEY
) {
  console.error(
    "❌ Missing vital authentication environment configurations. Terminating sync pipeline.",
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runPipeline() {
  try {
    const targetPath = path.join(process.cwd(), "portfolio.json");
    if (!fs.existsSync(targetPath)) {
      console.log(
        "⚠️ No portfolio.json file discovered in execution node. Skipping pipeline update.",
      );
      process.exit(0);
    }

    const payload = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    const {
      routing,
      project_meta,
      comprehensive_description,
      engineering_highlights,
      measurable_metrics,
      star_challenges,
      architectural_deep_dive,
      lessons_learned,
    } = payload;

    const projectId = routing.repo_name;
    const projectName = routing.project_name;

    console.log(
      `📦 Converting markdown vectors via Gemini for: ${projectName}...`,
    );

    const textChunks = [];
    const sharedMeta = {
      role: project_meta.role,
      phase: project_meta.development_phase,
      languages: project_meta.languages,
      frameworks: project_meta.frameworks_and_tools,
    };

    textChunks.push({
      text: `# Project Overview: ${projectName}\n* **Repository ID:** ${projectId}\n* **Languages:** ${project_meta.languages.join(", ")}\n\n## Summary\n${comprehensive_description}`,
      metadata: { ...sharedMeta, segment_type: "overview" },
    });

    textChunks.push({
      text: `# Engineering Benchmarks: ${projectName}\n\n## Metrics\n* **Latency:** ${measurable_metrics.execution_latency}\n* **UI Performance:** ${measurable_metrics.ui_performance}\n* **Overhead Cost:** ${measurable_metrics.operational_cost}\n\n## Accomplishments\n${engineering_highlights.map((h) => `- ${h}`).join("\n")}`,
      metadata: { ...sharedMeta, segment_type: "benchmarks" },
    });

    star_challenges.forEach((challenge, idx) => {
      textChunks.push({
        text: `# Technical Challenge [${idx + 1}] for ${projectName}\n* **Situation:** ${challenge.situation}\n* **Action:** ${challenge.action}\n* **Result:** ${challenge.result}`,
        metadata: { ...sharedMeta, segment_type: `challenge_${idx + 1}` },
      });
    });

    let archText = `# Structural Deep Dive: ${projectName}\n${architectural_deep_dive.text}\n\n## Engineering Retrospective\n${lessons_learned}`;
    if (architectural_deep_dive.illustration)
      archText += `\n\n* **System Diagram Reference:** ${architectural_deep_dive.illustration.alt}`;

    textChunks.push({
      text: archText,
      metadata: { ...sharedMeta, segment_type: "architecture" },
    });

    console.log(`🧹 Dropping legacy vectors for ${projectId}...`);
    await supabase
      .from("portfolio_embeddings")
      .delete()
      .eq("project_id", projectId);

    for (let i = 0; i < textChunks.length; i++) {
      console.log(
        `⚡ Generating Gemini 768-dim vector [${i + 1}/${textChunks.length}]...`,
      );

      const response = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: textChunks[i].text,
        config: {
          outputDimensionality: 768,
        },
      });

      const embeddingValues = response.embeddings[0].values;

      const { error } = await supabase.from("portfolio_embeddings").upsert({
        project_id: projectId,
        project_name: projectName,
        chunk_index: i,
        content: textChunks[i].text,
        embedding: embeddingValues,
        metadata: textChunks[i].metadata,
      });

      if (error) throw error;
    }

    try {
      console.log(
        `🧹 [sync-portfolio] Starting garbage collection of orphaned project vectors...`,
      );
      const githubRes = await fetch(
        "https://api.github.com/users/HoodieYlya13/repos?per_page=100",
        {
          headers: { "User-Agent": "YlyaBot-Sync-Engine" },
        },
      );
      if (githubRes.ok) {
        const repos = await githubRes.json();
        const activeRepoNames = new Set(repos.map((r) => r.name.toLowerCase()));

        const { data: dbRepos, error: dbErr } = await supabase
          .from("portfolio_embeddings")
          .select("project_id");

        if (!dbErr && dbRepos) {
          const dbProjectIds = [
            ...new Set(dbRepos.map((item) => item.project_id)),
          ];

          for (const dbId of dbProjectIds) {
            const lowerDbId = dbId.toLowerCase();
            if (!activeRepoNames.has(lowerDbId) && lowerDbId !== "portfolio") {
              console.log(
                `🗑️ [sync-portfolio] Pruning orphaned project vectors for: ${dbId}`,
              );
              const { error: pruneErr } = await supabase
                .from("portfolio_embeddings")
                .delete()
                .eq("project_id", dbId);
              if (pruneErr) {
                console.error(
                  `❌ [sync-portfolio] Failed to prune ${dbId}:`,
                  pruneErr.message,
                );
              }
            }
          }
        } else if (dbErr) throw dbErr;
      } else
        console.warn(
          `⚠️ [sync-portfolio] GitHub API returned status ${githubRes.status}, skipping pruning to avoid false deletions.`,
        );
    } catch (gcErr) {
      console.warn(
        "⚠️ [sync-portfolio] Garbage collection warning:",
        gcErr.message,
      );
    }

    try {
      console.log(
        `🔍 [sync-portfolio] Querying Supabase for total unique indexed repositories...`,
      );
      const { data: uniqueRepos, error: dbErr } = await supabase
        .from("portfolio_embeddings")
        .select("project_id");

      if (!dbErr && uniqueRepos) {
        const uniqueIds = new Set(uniqueRepos.map((item) => item.project_id));
        const totalCount = uniqueIds.size;

        if (totalCount > 0) {
          const scriptDir = path.dirname(fileURLToPath(import.meta.url));
          const readmePath = path.join(scriptDir, "README.md");
          if (fs.existsSync(readmePath)) {
            let readmeContent = fs.readFileSync(readmePath, "utf8");
            const updatedReadme = readmeContent.replace(
              /Repos\[\("📦 \d+ GitHub Repositories<br>\(Ecosystem Matrices\)"\)\]/g,
              `Repos[("📦 ${totalCount} GitHub Repositories<br>(Ecosystem Matrices)")]`,
            );
            fs.writeFileSync(readmePath, updatedReadme, "utf8");
            console.log(
              `⚙️ [sync-portfolio] Automatically updated README.md with current repo count: ${totalCount}`,
            );
          }
        }
      } else if (dbErr) throw dbErr;
    } catch (readmeErr) {
      console.warn(
        "⚠️ [sync-portfolio] Failed to automatically update README.md repo count:",
        readmeErr.message,
      );
    }

    console.log(`✅ Pipeline conversion run complete for: ${projectId}.`);
  } catch (err) {
    console.error("Critical Pipeline Execution Failure:", err);
    process.exit(1);
  }
}

runPipeline();
