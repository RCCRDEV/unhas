import { NextResponse } from 'next/server';
import { getCalendarEvents } from '@/lib/googleCalendar';
import { barbers } from '@/config';
import { startOfDay, endOfDay, setHours, setMinutes, isBefore, addMinutes, isAfter, isSameDay } from 'date-fns';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
export const dynamic = 'force-static';
export const revalidate = 1;

type SlotOption = {
  dateTime: string;
  barberId: string;
  barberName: string;
};

type CalendarEventLite = {
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
};

function toEventDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function calculateAvailableSlots(input: { date: Date; duration: number; events: CalendarEventLite[] }) {
  const { date, duration, events } = input;

  const workStart = setMinutes(setHours(startOfDay(date), 9), 0);
  const workEnd = setMinutes(setHours(startOfDay(date), 19), 0);

  const slots: string[] = [];
  let currentSlot = workStart;
  const now = new Date();

  while (isBefore(currentSlot, workEnd)) {
    const slotEnd = addMinutes(currentSlot, duration);
    if (isAfter(slotEnd, workEnd)) break;

    const isSlotInFuture = !isSameDay(date, now) || isAfter(currentSlot, now);
    if (isSlotInFuture) {
      const isConflict = events.some((event) => {
        const eventStart = toEventDate(event.start?.dateTime ?? event.start?.date);
        const eventEnd = toEventDate(event.end?.dateTime ?? event.end?.date);
        if (!eventStart || !eventEnd) return false;

        return isBefore(currentSlot, eventEnd) && isAfter(slotEnd, eventStart);
      });

      if (!isConflict) {
        slots.push(currentSlot.toISOString());
      }
    }

    currentSlot = addMinutes(currentSlot, 30);
  }

  return slots;
}

export async function GET(request: Request) {
  if (isGithubPages) {
    return NextResponse.json({ slots: [], options: [] });
  }

  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get('calendarId');
  const dateStr = searchParams.get('date');
  const durationStr = searchParams.get('duration');
  const any = searchParams.get('any');

  if (!dateStr || !durationStr) {
    return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
  }

  const date = dateStr.length === 10 ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr);
  const duration = parseInt(durationStr);
  const timeMin = startOfDay(date);
  const timeMax = endOfDay(date);

  try {
    if (any === '1' || any === 'true') {
      const available: SlotOption[] = [];

      const activeBarbers = barbers.filter((b) => Boolean(b.calendarId));
      const eventsPerBarber = await Promise.all(
        activeBarbers.map(async (barber) => {
          const events = (await getCalendarEvents(barber.calendarId, timeMin, timeMax)) as CalendarEventLite[];
          return { barber, events: events.filter(Boolean) };
        })
      );

      for (const { barber, events } of eventsPerBarber) {
        const slots = calculateAvailableSlots({ date, duration, events });
        for (const slot of slots) {
          available.push({ dateTime: slot, barberId: barber.id, barberName: barber.name });
        }
      }

      available.sort((a, b) => {
        if (a.dateTime < b.dateTime) return -1;
        if (a.dateTime > b.dateTime) return 1;
        return a.barberName.localeCompare(b.barberName);
      });

      return NextResponse.json({ options: available });
    }

    if (!calendarId) {
      return NextResponse.json({ error: 'calendarId é obrigatório' }, { status: 400 });
    }

    const events = (await getCalendarEvents(calendarId, timeMin, timeMax)) as CalendarEventLite[];
    const slots = calculateAvailableSlots({ date, duration, events });
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error);
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 });
  }
}
