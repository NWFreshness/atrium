export const EMAIL_FAILURE_LIMIT = 5;
export const IP_FAILURE_LIMIT = 20;
export const WINDOW_MS = 15 * 60 * 1000;

export type ThrottleRow = {
  subject: string;
  failedCount: number;
  windowStartedAt: Date;
};

export type ThrottleStore = {
  get(subject: string): Promise<ThrottleRow | null>;
  put(row: ThrottleRow): Promise<void>;
  delete(subject: string): Promise<void>;
};

export type ThrottleAttempt = {
  email: string;
  ip?: string;
};

export type ThrottleClock = () => Date;

export type ThrottleDecision = { ok: true } | { ok: false };

export function emailSubject(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}

export function ipSubject(ip: string): string {
  return `ip:${ip}`;
}

export function subjectsOf(attempt: ThrottleAttempt): string[] {
  const keys = [emailSubject(attempt.email)];
  if (attempt.ip) {
    keys.push(ipSubject(attempt.ip));
  }
  return keys;
}

function limitFor(subject: string): number {
  return subject.startsWith("ip:") ? IP_FAILURE_LIMIT : EMAIL_FAILURE_LIMIT;
}

function blocked(row: ThrottleRow | null, now: Date, limit: number): boolean {
  if (!row) {
    return false;
  }
  if (now.getTime() - row.windowStartedAt.getTime() >= WINDOW_MS) {
    return false;
  }
  return row.failedCount >= limit;
}

export async function assertNotThrottled(
  store: ThrottleStore,
  attempt: ThrottleAttempt,
  now: ThrottleClock = () => new Date(),
): Promise<ThrottleDecision> {
  const at = now();
  for (const subject of subjectsOf(attempt)) {
    const row = await store.get(subject);
    if (blocked(row, at, limitFor(subject))) {
      return { ok: false };
    }
  }
  return { ok: true };
}

export async function recordFailure(
  store: ThrottleStore,
  attempt: ThrottleAttempt,
  now: ThrottleClock = () => new Date(),
): Promise<void> {
  const at = now();
  for (const subject of subjectsOf(attempt)) {
    const row = await store.get(subject);
    const windowExpired =
      !row || at.getTime() - row.windowStartedAt.getTime() >= WINDOW_MS;
    await store.put({
      subject,
      failedCount: windowExpired ? 1 : row.failedCount + 1,
      windowStartedAt: windowExpired ? at : row.windowStartedAt,
    });
  }
}

export async function clearFailures(
  store: ThrottleStore,
  attempt: ThrottleAttempt,
): Promise<void> {
  for (const subject of subjectsOf(attempt)) {
    await store.delete(subject);
  }
}

export function requestIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || undefined;
}
