export interface QuizAttempt {
  id: number;
  mode: string;
  basin: string;
  score: number;
  total: number;
  time_seconds: number;
  completed_at: string;
}

export interface WatershedStat {
  huc12: string;
  times_correct: number;
  times_missed: number;
  last_seen: string;
}

// ---- localStorage-based persistence (works on all platforms) ----

function getStoredAttempts(): QuizAttempt[] {
  try {
    const raw = localStorage.getItem('quiz_attempts');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setStoredAttempts(attempts: QuizAttempt[]) {
  try { localStorage.setItem('quiz_attempts', JSON.stringify(attempts)); } catch {}
}

function getStoredStats(): Record<string, WatershedStat> {
  try {
    const raw = localStorage.getItem('watershed_stats');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setStoredStats(stats: Record<string, WatershedStat>) {
  try { localStorage.setItem('watershed_stats', JSON.stringify(stats)); } catch {}
}

export async function getDatabase(): Promise<void> {
  // No-op for web; localStorage needs no initialization
}

export async function saveQuizAttempt(
  mode: string,
  basin: string,
  score: number,
  total: number,
  timeSeconds: number
): Promise<void> {
  const attempts = getStoredAttempts();
  attempts.unshift({
    id: Date.now(),
    mode,
    basin,
    score,
    total,
    time_seconds: timeSeconds,
    completed_at: new Date().toISOString(),
  });
  setStoredAttempts(attempts.slice(0, 100));
}

export async function updateWatershedStats(
  correct: string[],
  missed: string[]
): Promise<void> {
  const stats = getStoredStats();
  const now = new Date().toISOString();
  for (const huc12 of correct) {
    const s = stats[huc12] || { huc12, times_correct: 0, times_missed: 0, last_seen: '' };
    s.times_correct++;
    s.last_seen = now;
    stats[huc12] = s;
  }
  for (const huc12 of missed) {
    const s = stats[huc12] || { huc12, times_correct: 0, times_missed: 0, last_seen: '' };
    s.times_missed++;
    s.last_seen = now;
    stats[huc12] = s;
  }
  setStoredStats(stats);
}

export async function getRecentAttempts(limit = 20): Promise<QuizAttempt[]> {
  return getStoredAttempts().slice(0, limit);
}

export async function getWatershedStats(): Promise<WatershedStat[]> {
  return Object.values(getStoredStats()).sort(
    (a, b) => b.times_missed - a.times_missed
  );
}

export async function getLearnedCount(): Promise<number> {
  const stats = Object.values(getStoredStats());
  return stats.filter(
    s => s.times_correct >= 3 && s.times_correct / (s.times_correct + s.times_missed) > 0.8
  ).length;
}
