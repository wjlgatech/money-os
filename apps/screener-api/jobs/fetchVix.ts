import { db } from "../lib/db";
import { vixData, pipelineStatus } from "../lib/db/schema";
import { fetchVix } from "../lib/fetchers/vix";
import { eq } from "drizzle-orm";

export async function fetchVixJob() {
  if (!db) throw new Error("Database not configured");

  await db
    .insert(pipelineStatus)
    .values({ jobName: "vix", status: "running", total: 1, completed: 0 })
    .onConflictDoUpdate({
      target: pipelineStatus.jobName,
      set: { status: "running", updatedAt: new Date() },
    });

  try {
    const { date, close } = await fetchVix();

    await db
      .insert(vixData)
      .values({ date, close: String(close) })
      .onConflictDoUpdate({
        target: vixData.date,
        set: { close: String(close) },
      });

    await db
      .update(pipelineStatus)
      .set({
        status: "idle",
        completed: 1,
        total: 1,
        latestDate: date,
        lastRunAt: new Date(),
        errorMsg: null,
        updatedAt: new Date(),
      })
      .where(eq(pipelineStatus.jobName, "vix"));

    return { date, close };
  } catch (err) {
    await db
      .update(pipelineStatus)
      .set({
        status: "error",
        errorMsg: (err as Error).message,
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pipelineStatus.jobName, "vix"));

    throw err;
  }
}
