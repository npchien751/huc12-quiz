import { Watershed } from './geo-utils';

export type QuizMode = 'explore' | 'tap-to-name' | 'name-the-tap' | 'speed-round';

export interface QuizConfig {
  mode: QuizMode;
  basin: string | 'all'; // HUC8 code or 'all'
  watersheds: Watershed[];
}

export interface QuizState {
  mode: QuizMode;
  basin: string | 'all';
  watersheds: Watershed[];
  queue: Watershed[];
  current: Watershed | null;
  found: Set<string>;
  missed: Set<string>;
  score: number;
  timeRemaining: number;
  startedAt: number;
  status: 'idle' | 'active' | 'finished';
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Get time limit in seconds based on watershed count
export function getTimeLimit(count: number): number {
  if (count <= 5) return 120;
  if (count <= 20) return 300;
  if (count <= 50) return 600;
  return 1200;
}

export function createQuizState(config: QuizConfig): QuizState {
  const shuffled = shuffle(config.watersheds);
  const timeLimit = config.mode === 'explore' ? 0 : getTimeLimit(config.watersheds.length);

  return {
    mode: config.mode,
    basin: config.basin,
    watersheds: config.watersheds,
    queue: shuffled.slice(1),
    current: shuffled[0] || null,
    found: new Set(),
    missed: new Set(),
    score: 0,
    timeRemaining: timeLimit,
    startedAt: Date.now(),
    status: config.mode === 'explore' ? 'active' : 'idle',
  };
}

export function startQuiz(state: QuizState): QuizState {
  return {
    ...state,
    status: 'active',
    startedAt: Date.now(),
  };
}

export function handleCorrectAnswer(state: QuizState, huc12: string): QuizState {
  const found = new Set(state.found);
  found.add(huc12);

  const nextQueue = [...state.queue];
  const next = nextQueue.shift() || null;

  const isFinished = !next && found.size + state.missed.size >= state.watersheds.length;

  return {
    ...state,
    found,
    score: state.score + 1,
    queue: nextQueue,
    current: next,
    status: isFinished ? 'finished' : state.status,
  };
}

export function handleWrongAnswer(state: QuizState, _tappedHuc12: string): QuizState {
  // In tap-to-name mode, just deduct score but keep same current prompt
  return {
    ...state,
    score: Math.max(0, state.score - 0.5),
  };
}

export function handleSkip(state: QuizState): QuizState {
  if (!state.current) return state;

  const missed = new Set(state.missed);
  missed.add(state.current.huc12);

  const nextQueue = [...state.queue];
  const next = nextQueue.shift() || null;

  const isFinished = !next;

  return {
    ...state,
    missed,
    queue: nextQueue,
    current: next,
    status: isFinished ? 'finished' : state.status,
  };
}

export function handleTimerTick(state: QuizState): QuizState {
  if (state.status !== 'active' || state.mode === 'explore') return state;

  const timeRemaining = state.timeRemaining - 1;

  if (timeRemaining <= 0) {
    // Mark all remaining as missed
    const missed = new Set(state.missed);
    if (state.current) missed.add(state.current.huc12);
    for (const w of state.queue) missed.add(w.huc12);

    return {
      ...state,
      timeRemaining: 0,
      missed,
      status: 'finished',
    };
  }

  return { ...state, timeRemaining };
}

export function handleSpeedRoundGuess(
  state: QuizState,
  input: string,
  matchFn: (input: string, name: string) => boolean
): { state: QuizState; matchedHuc12: string | null } {
  // Find first unmatched watershed whose name matches
  const allUnfound = state.watersheds.filter(
    (w) => !state.found.has(w.huc12)
  );

  const match = allUnfound.find((w) => matchFn(input, w.name));

  if (match) {
    const found = new Set(state.found);
    found.add(match.huc12);

    const isFinished = found.size >= state.watersheds.length;

    return {
      state: {
        ...state,
        found,
        score: state.score + 1,
        status: isFinished ? 'finished' : state.status,
      },
      matchedHuc12: match.huc12,
    };
  }

  return { state, matchedHuc12: null };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
