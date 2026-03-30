import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getAuth = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('As credenciais do Google Service Account não foram configuradas corretamente no .env.local');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
};

const getCalendarClient = () => google.calendar({ version: 'v3', auth: getAuth() });

export async function getCalendarEvents(calendarId: string, timeMin: Date, timeMax: Date) {
  try {
    const calendar = getCalendarClient();
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Erro ao buscar eventos do Google Agenda:', error);
    throw error;
  }
}

export async function createCalendarEvent(
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }
) {
  try {
    const calendar = getCalendarClient();
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao criar evento no Google Agenda:', error);
    throw error;
  }
}
