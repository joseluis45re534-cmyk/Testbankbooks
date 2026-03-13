import { storage } from "./storage";
import { generateBlogPostFromKeyword } from "./blogGenerator";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

async function runScheduledBlogGeneration(force = false): Promise<{ generated: number; total: number }> {
  try {
    const config = await storage.getBlogScheduleConfig();
    if (!config) return { generated: 0, total: 0 };
    if (!config.enabled && !force) return { generated: 0, total: 0 };

    const now = new Date();
    if (!force && config.nextRunAt && config.nextRunAt > now) {
      return { generated: 0, total: 0 };
    }

    const postsPerDay = config.postsPerDay || 7;
    const keywords = await storage.getPendingSeoKeywords(postsPerDay);

    if (keywords.length === 0) {
      console.log("[scheduler] No pending keywords to process");
      const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await storage.upsertBlogScheduleConfig({ lastRunAt: now, nextRunAt: nextRun });
      return { generated: 0, total: 0 };
    }

    let generated = 0;
    for (const kw of keywords) {
      try {
        const post = generateBlogPostFromKeyword(kw.keyword, kw.category || undefined);
        const saved = await storage.createBlogPost({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          category: post.category,
          published: true,
          productId: null,
        });
        await storage.updateSeoKeywordStatus(kw.id, "used", saved.slug);
        generated++;
        console.log(`[scheduler] Generated blog post: "${post.title}"`);
      } catch (err) {
        console.error(`[scheduler] Failed to generate post for keyword "${kw.keyword}":`, err);
      }
    }

    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await storage.upsertBlogScheduleConfig({ lastRunAt: now, nextRunAt: nextRun });
    console.log(`[scheduler] Completed: generated ${generated}/${keywords.length} posts. Next run: ${nextRun.toISOString()}`);

    return { generated, total: keywords.length };
  } catch (err) {
    console.error("[scheduler] Run failed:", err);
    return { generated: 0, total: 0 };
  }
}

export async function triggerManualRun(): Promise<{ generated: number; total: number }> {
  return runScheduledBlogGeneration(true);
}

export function initScheduler(): void {
  setTimeout(async () => {
    console.log("[scheduler] Startup check running...");
    await runScheduledBlogGeneration();
  }, 8000);

  schedulerInterval = setInterval(async () => {
    await runScheduledBlogGeneration();
  }, 60 * 60 * 1000);

  console.log("[scheduler] Blog post scheduler initialized (checks every hour)");
}
