import { NextResponse } from 'next/server';
import { createCalendarEvent, getCalendarEvents } from '@/lib/googleCalendar';
import { addMinutes } from 'date-fns';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
export const dynamic = 'force-static';
export const revalidate = 1;

export async function POST(request: Request) {
  if (isGithubPages) {
    return NextResponse.json({ error: 'Indisponível no modo GitHub Pages' }, { status: 501 });
  }

  try {
    const body = await request.json();
    const { barber, service, customer, date, isAdmin, password, paymentMethod } = body;

    if (!barber || !service || !customer || !date) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    if (!isAdmin && !paymentMethod) {
      return NextResponse.json({ error: 'Selecione a forma de pagamento' }, { status: 400 });
    }

    if (isAdmin) {
      if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Senha inválida' }, { status: 401 });
      }
    }

    const startDateTime = new Date(date);
    const endDateTime = addMinutes(startDateTime, service.duration);

    if (!barber.calendarId) {
      return NextResponse.json({ error: 'Calendário da profissional não configurado' }, { status: 400 });
    }

    const windowStart = addMinutes(startDateTime, -1);
    const windowEnd = addMinutes(endDateTime, 1);
    const existingEvents = await getCalendarEvents(barber.calendarId, windowStart, windowEnd);

    const hasConflict = existingEvents.some((event) => {
      const eventStartValue = event.start?.dateTime ?? event.start?.date;
      const eventEndValue = event.end?.dateTime ?? event.end?.date;
      if (!eventStartValue || !eventEndValue) return false;

      const eventStart = new Date(eventStartValue);
      const eventEnd = new Date(eventEndValue);
      if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;

      return startDateTime < eventEnd && endDateTime > eventStart;
    });

    if (hasConflict) {
      return NextResponse.json({ error: 'Horário indisponível' }, { status: 409 });
    }

    const customerEmail = typeof customer.email === 'string' ? customer.email : '';
    const paymentText = isAdmin ? 'Admin' : String(paymentMethod);

    const event = {
      summary: `${service.name} - ${customer.name}`,
      description: `Cliente: ${customer.name}\nTelefone: ${customer.phone}\nEmail: ${customerEmail}\nServiço: ${service.name}\nProfissional: ${barber.name}\nPagamento: ${paymentText}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };

    const result = await createCalendarEvent(barber.calendarId, event);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Erro ao realizar agendamento:', error);
    return NextResponse.json({ error: 'Erro ao realizar agendamento' }, { status: 500 });
  }
}
