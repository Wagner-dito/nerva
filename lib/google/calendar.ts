import "server-only";

import { serverEnv } from "@/lib/env.server";

export type AvailableSlot = {
  startISO: string;
  endISO: string;
  humanLabel: string;
};

type BookingWindow = {
  slotDurationMinutes: number;
  daysAhead: number;
  windows: { dow: number; startHour: number; endHour: number }[];
  timeZone: string;
};

const DEFAULT_WINDOW: BookingWindow = {
  slotDurationMinutes: 30,
  daysAhead: 14,
  windows: [
    { dow: 1, startHour: 9, endHour: 12 },
    { dow: 1, startHour: 14, endHour: 18 },
    { dow: 2, startHour: 9, endHour: 12 },
    { dow: 2, startHour: 14, endHour: 18 },
    { dow: 3, startHour: 9, endHour: 12 },
    { dow: 3, startHour: 14, endHour: 18 },
    { dow: 4, startHour: 9, endHour: 12 },
    { dow: 4, startHour: 14, endHour: 18 },
    { dow: 5, startHour: 9, endHour: 12 },
    { dow: 5, startHour: 14, endHour: 18 },
  ],
  timeZone: "America/Sao_Paulo",
};

const BRT_OFFSET_HOURS = 3;
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

type CachedToken = { accessToken: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const cached = tokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: serverEnv.GOOGLE_CLIENT_ID,
    client_secret: serverEnv.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error("[google/calendar] refresh token failed:", res.status);
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  const expiresIn = data.expires_in ?? 3600;
  tokenCache.set(refreshToken, {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return data.access_token;
}

type BusyPeriod = { start?: string; end?: string };

async function freeBusyQuery(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  timeZone: string
): Promise<BusyPeriod[]> {
  const res = await fetch(`${CALENDAR_API_BASE}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone,
      items: [{ id: calendarId }],
    }),
  });

  if (!res.ok) {
    console.error("[google/calendar] freeBusy failed:", res.status);
    return [];
  }

  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: BusyPeriod[] }>;
  };
  return data.calendars?.[calendarId]?.busy ?? [];
}

export async function listAvailableSlots(params: {
  refreshToken: string;
  calendarId: string;
  max: number;
  now?: Date;
  window?: BookingWindow;
}): Promise<AvailableSlot[]> {
  const { refreshToken, calendarId, max } = params;
  const window = params.window ?? DEFAULT_WINDOW;
  const now = params.now ?? new Date();

  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return [];

  const rangeEnd = new Date(
    now.getTime() + window.daysAhead * 24 * 3600_000
  );
  const busy = await freeBusyQuery(
    accessToken,
    calendarId,
    now.toISOString(),
    rangeEnd.toISOString(),
    window.timeZone
  );

  const slots: AvailableSlot[] = [];
  const slotMs = window.slotDurationMinutes * 60_000;

  const brtNow = new Date(now.getTime() - BRT_OFFSET_HOURS * 3600_000);
  const startY = brtNow.getUTCFullYear();
  const startM = brtNow.getUTCMonth();
  const startD = brtNow.getUTCDate();

  for (let d = 0; d < window.daysAhead; d++) {
    const brtMidnight = new Date(Date.UTC(startY, startM, startD + d, 0, 0));
    const dow = brtMidnight.getUTCDay();
    const todayWindows = window.windows.filter((w) => w.dow === dow);

    for (const w of todayWindows) {
      let slotStart = new Date(
        Date.UTC(
          startY,
          startM,
          startD + d,
          w.startHour + BRT_OFFSET_HOURS,
          0
        )
      );
      const slotEndLimit = new Date(
        Date.UTC(
          startY,
          startM,
          startD + d,
          w.endHour + BRT_OFFSET_HOURS,
          0
        )
      );

      if (slotStart.getTime() < now.getTime()) {
        slotStart = new Date(
          Math.ceil(now.getTime() / slotMs) * slotMs
        );
      }

      while (slotStart.getTime() + slotMs <= slotEndLimit.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotMs);
        if (!overlapsBusy(slotStart, slotEnd, busy)) {
          slots.push({
            startISO: slotStart.toISOString(),
            endISO: slotEnd.toISOString(),
            humanLabel: humanLabel(slotStart, window.timeZone),
          });
          if (slots.length >= max) return slots;
        }
        slotStart = new Date(slotStart.getTime() + slotMs);
      }
    }
  }
  return slots;
}

function overlapsBusy(
  start: Date,
  end: Date,
  busy: BusyPeriod[]
): boolean {
  const s = start.getTime();
  const e = end.getTime();
  for (const b of busy) {
    if (!b.start || !b.end) continue;
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    if (s < be && e > bs) return true;
  }
  return false;
}

function humanLabel(d: Date, timeZone: string): string {
  const dayStr = d.toLocaleDateString("pt-BR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dayStr} ${timeStr}`;
}

export async function createEvent(params: {
  refreshToken: string;
  calendarId: string;
  startISO: string;
  endISO: string;
  summary: string;
  description?: string;
  timeZone?: string;
}): Promise<{ ok: boolean; eventId?: string; error?: string }> {
  const accessToken = await getAccessToken(params.refreshToken);
  if (!accessToken) return { ok: false, error: "Google not configured" };

  const tz = params.timeZone ?? "America/Sao_Paulo";
  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(params.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startISO, timeZone: tz },
          end: { dateTime: params.endISO, timeZone: tz },
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, eventId: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export function slotLabel(startISO: string): string {
  const d = new Date(startISO);
  const dayStr = d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dayStr} ${timeStr}`;
}

// Heuristic: skip Calendar fetch when user's message is unlikely to need
// scheduling info. Saves ~2-3s on greetings and acks.
export function userMightSchedule(
  message: string,
  messageCount: number
): boolean {
  if (messageCount >= 3) return true;
  const rx =
    /\b(marcar|agendar|agenda|consulta|avali|hor[aá]ri?o|data|dia|hora|amanh[aã]|hoje|pr[óo]xim|semana|segunda|ter[cç]a|quarta|quinta|sexta|s[áa]bado|domingo|manh[aã]|tarde|noite|\d{1,2}h|\d{1,2}:\d{2})/i;
  return rx.test(message);
}
