export interface MockVixEntry {
  date: string;
  close: number;
}

/**
 * Generate 90 days of mock VIX data centered around 18-22.
 */
export function getMockVixData(days: number = 90): MockVixEntry[] {
  const entries: MockVixEntry[] = [];
  const now = new Date();
  let vix = 19.5;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;

    // Mean-reverting around 20
    const meanReversion = (20 - vix) * 0.05;
    const noise = (Math.sin(i * 0.7) * 0.3 + Math.cos(i * 1.3) * 0.2);
    vix = Math.max(10, Math.min(40, vix + meanReversion + noise));

    entries.push({
      date: date.toISOString().slice(0, 10),
      close: Number(vix.toFixed(2)),
    });
  }

  return entries;
}

/**
 * Get the latest mock VIX value.
 */
export function getMockLatestVix(): { date: string; close: number } {
  const data = getMockVixData();
  return data[data.length - 1];
}
