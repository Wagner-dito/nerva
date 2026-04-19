import "server-only";

import { calendar_v3, google } from "googleapis";

import { serverEnv } from "@/lib/env.server";

export type AvailableSlot = {
  startISO: string;
  endISO: string;
  humanLabel: string; // e.g., "ter 23/04, 14:00"
};

type BookingWindow = {
  slotDurationMinutes: number;
  daysAhead: number;
  // Work windows per day-of-week (0=Sun, 6=Sat) — local time (24h).
  windows: { dow: number; startHour: number; endHour: number }[];
  timeZone: string;
};

const DEFAULT_WINDOW: BookingWindow = {
  slotDurationMinutes: 30,
  daysAhead: 14,
  // Mon-Fri 09:00-12:00 + 14:00-18:00
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

function getClient(refreshToken: string): calendar_v3.Calendar | null {
  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  const oauth2 = new google.auth.OAuth2(
    serverEnv.GOOGLE_CLIENT_ID,
    serverEnv.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2 });
}

// BRT é UTC-3 sem DST desde 2019. Simplifica cálculos.
const BRT_OFFSET_HOURS = 3;

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

  const client = getClient(refreshToken);
  if (!client) return [];

  const rangeEnd = new Date(
    now.getTime() + window.daysAhead * 24 * 3600 * 1000
  );

  // Query busy periods
  const fb = await client.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: rangeEnd.toISOString(),
      timeZone: window.timeZone,
      items: [{ id: calendarId }],
    },
  });
  const busy = fb.data.calendars?.[calendarId]?.busy ?? [];

  // Walk days BRT-aware, generate candidate slots, filter by busy.
  const slots: AvailableSlot[] = [];
  const slotMs = window.slotDurationMinutes * 60_000;

  // Ponto de partida: "hoje" em BRT.
  const brtNow = new Date(now.getTime() - BRT_OFFSET_HOURS * 3600_000);
  const startY = brtNow.getUTCFullYear();
  const startM = brtNow.getUTCMonth();
  const startD = brtNow.getUTCDate();

  for (let d = 0; d < window.daysAhead; d++) {
    // Meia-noite BRT do dia d (como UTC moment).
    const brtMidnight = new Date(Date.UTC(startY, startM, startD + d, 0, 0));
    const dow = brtMidnight.getUTCDay();
    const todayWindows = window.windows.filter((w) => w.dow === dow);

    for (const w of todayWindows) {
      // Constrói momentos UTC equivalentes a BRT w.startHour e w.endHour.
      // BRT 09:00 => UTC 12:00 (somamos offset).
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

      // Pula slots no passado (compara contra o agora real em UTC).
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
  busy: calendar_v3.Schema$TimePeriod[]
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
  const client = getClient(params.refreshToken);
  if (!client) return { ok: false, error: "Google not configured" };

  try {
    const res = await client.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: {
          dateTime: params.startISO,
          timeZone: params.timeZone ?? "America/Sao_Paulo",
        },
        end: {
          dateTime: params.endISO,
          timeZone: params.timeZone ?? "America/Sao_Paulo",
        },
      },
    });
    return { ok: true, eventId: res.data.id ?? undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
