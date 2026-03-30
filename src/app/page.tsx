'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { barbers, paymentMethods, products, services, Barber, PaymentMethodId, Service } from '@/config';

type AvailabilityOption = {
  dateTime: string;
  barber: Barber;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type DemoBarber = Barber & {
  photoUrl: string;
};

const DEMO_STORAGE_KEY = 'nailstudio_demo_bookings_v1';
const CUSTOMER_STORAGE_KEY = 'nailstudio_customer_v1';

function generateDaySlots(date: Date, durationMinutes: number) {
  const day = new Date(date);
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(day);
  end.setHours(19, 0, 0, 0);

  const slots: string[] = [];
  const stepMinutes = 30;
  const cursor = new Date(start);

  while (cursor.getTime() + durationMinutes * 60_000 <= end.getTime()) {
    slots.push(cursor.toISOString());
    cursor.setTime(cursor.getTime() + stepMinutes * 60_000);
  }

  return slots;
}

function formatSlotLabel(dateTime: string) {
  const date = new Date(dateTime);
  return format(date, "HH'h'mm", { locale: ptBR });
}

function formatDayLabel(date: Date) {
  return format(date, "EEE, dd 'de' MMM", { locale: ptBR });
}

export default function Home() {
  const instagramUrl = 'https://www.instagram.com/';
  const whatsappUrl = 'https://wa.me/';

  const demoBarbers: DemoBarber[] = useMemo(
    () => [
      {
        id: 'demo-livia',
        name: 'Lívia',
        calendarId: 'demo-livia',
        avatar: 'L',
        photoUrl:
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'demo-bruna',
        name: 'Bruna',
        calendarId: 'demo-bruna',
        avatar: 'B',
        photoUrl:
          'https://images.unsplash.com/photo-1520975693419-b3a4c1f2f7c1?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'demo-camila',
        name: 'Camila',
        calendarId: 'demo-camila',
        avatar: 'C',
        photoUrl:
          'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=1600&q=80',
      },
    ],
    []
  );

  const activeBarbers = useMemo(() => barbers.filter((b) => Boolean(b.calendarId)), []);
  const [demoMode, setDemoMode] = useState(true);
  const displayedBarbers = useMemo(() => (demoMode ? demoBarbers : activeBarbers), [activeBarbers, demoBarbers, demoMode]);

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [barberMode, setBarberMode] = useState<'any' | 'specific'>('any');
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableOptions, setAvailableOptions] = useState<AvailabilityOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('pix');
  const [loading, setLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [saveCustomerData, setSaveCustomerData] = useState(true);

  const [demoBookedByBarberId, setDemoBookedByBarberId] = useState<Record<string, string[]>>({});

  const [activeSection, setActiveSection] = useState<'agendar' | 'servicos' | 'produtos' | 'profissionais' | 'sobre'>('agendar');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    if (activeBarbers.length > 0) {
      setDemoMode(false);
    }
  }, [activeBarbers.length]);

  useEffect(() => {
    if (!demoMode) return;
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed)) return;

      const next: Record<string, string[]> = {};
      for (const [barberId, slots] of Object.entries(parsed)) {
        if (!Array.isArray(slots)) continue;
        next[barberId] = slots.filter((s) => typeof s === 'string');
      }
      setDemoBookedByBarberId(next);
    } catch {
      return;
    }
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoBookedByBarberId));
    } catch {
      return;
    }
  }, [demoBookedByBarberId, demoMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.name === 'string') setCustomerName(parsed.name);
      if (typeof parsed?.phone === 'string') setCustomerPhone(parsed.phone);
      if (typeof parsed?.email === 'string') setCustomerEmail(parsed.email);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      if (!saveCustomerData) {
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        return;
      }
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({ name: customerName, phone: customerPhone, email: customerEmail }));
    } catch {
      return;
    }
  }, [saveCustomerData, customerName, customerPhone, customerEmail]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const next = scrollable > 0 ? window.scrollY / scrollable : 0;
      setScrollProgress(Math.max(0, Math.min(1, next)));
      setShowFloatingCTA(window.scrollY > 520);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ids: Array<'agendar' | 'servicos' | 'produtos' | 'profissionais' | 'sobre'> = [
      'agendar',
      'servicos',
      'produtos',
      'profissionais',
      'sobre',
    ];

    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        const id = visible?.target?.id;
        if (id === 'agendar' || id === 'servicos' || id === 'produtos' || id === 'profissionais' || id === 'sobre') {
          setActiveSection(id);
        }
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: typeof activeSection) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fetchAvailability = useCallback(async () => {
    if (!selectedService) return;
    setLoading(true);
    setAvailabilityError(null);

    try {
      if (demoMode) {
        const baseSlots = generateDaySlots(selectedDate, selectedService.duration);
        const isBooked = (barberId: string, dateTime: string) => {
          const booked = demoBookedByBarberId[barberId] || [];
          return booked.includes(dateTime);
        };

        const options: AvailabilityOption[] = [];
        if (barberMode === 'any') {
          for (const barber of demoBarbers) {
            for (const dateTime of baseSlots) {
              if (isBooked(barber.id, dateTime)) continue;
              options.push({ dateTime, barber });
            }
          }
          options.sort((a, b) => {
            const diff = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
            if (diff !== 0) return diff;
            return a.barber.name.localeCompare(b.barber.name);
          });
          setAvailableOptions(options);
          return;
        }

        if (!selectedBarber) {
          setAvailableOptions([]);
          return;
        }

        for (const dateTime of baseSlots) {
          if (isBooked(selectedBarber.id, dateTime)) continue;
          options.push({ dateTime, barber: selectedBarber });
        }
        setAvailableOptions(options);
        return;
      }

      const dateParam = format(selectedDate, 'yyyy-MM-dd');
      const response =
        barberMode === 'any'
          ? await fetch(`/api/availability?any=1&date=${dateParam}&duration=${selectedService.duration}`)
          : await fetch(`/api/availability?calendarId=${selectedBarber?.calendarId}&date=${dateParam}&duration=${selectedService.duration}`);

      const data = await response.json();

      if (barberMode === 'any') {
        const options: unknown[] = Array.isArray(data.options) ? data.options : [];
        const mapped = options
          .map((o: unknown) => {
            if (!isRecord(o)) return null;
            const barberId = typeof o.barberId === 'string' ? o.barberId : null;
            const dateTime = typeof o.dateTime === 'string' ? o.dateTime : null;
            if (!barberId || !dateTime) return null;
            const barber = activeBarbers.find((b) => b.id === barberId);
            if (!barber?.calendarId) return null;
            return { dateTime, barber };
          })
          .filter(Boolean) as AvailabilityOption[];

        setAvailableOptions(mapped);
        return;
      }

      const slots: unknown[] = Array.isArray(data.slots) ? data.slots : [];
      const mapped = slots
        .filter((s: unknown): s is string => typeof s === 'string')
        .map((s) => {
          if (!selectedBarber) return null;
          return { dateTime: s, barber: selectedBarber };
        })
        .filter(Boolean) as AvailabilityOption[];

      setAvailableOptions(mapped);
    } catch {
      setAvailabilityError('Não foi possível carregar os horários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [activeBarbers, barberMode, demoBarbers, demoBookedByBarberId, demoMode, selectedBarber, selectedDate, selectedService]);

  useEffect(() => {
    if (step === 3 && selectedService && (barberMode === 'any' || selectedBarber)) {
      fetchAvailability();
    }
  }, [barberMode, fetchAvailability, selectedBarber, selectedService, step]);

  useEffect(() => {
    if (step !== 3) return;
    setSelectedSlot(null);
    if (barberMode === 'any') setSelectedBarber(null);
  }, [selectedDate, barberMode, step]);

  const handleBooking = async () => {
    if (!selectedService || !selectedSlot || !customerName || !customerPhone) return;

    const barber =
      selectedBarber || (barberMode === 'any' ? availableOptions.find((o) => o.dateTime === selectedSlot)?.barber : null);
    if (!barber) return;

    setBookingStatus('loading');

    try {
      if (demoMode) {
        setDemoBookedByBarberId((prev) => {
          const existing = prev[barber.id] || [];
          if (existing.includes(selectedSlot)) return prev;
          return { ...prev, [barber.id]: [...existing, selectedSlot] };
        });
        setAvailableOptions((prev) => prev.filter((o) => !(o.dateTime === selectedSlot && o.barber.id === barber.id)));
        setSelectedBarber(barber);
        setBookingStatus('success');
        return;
      }

      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber,
          service: selectedService,
          customer: { name: customerName, phone: customerPhone, email: customerEmail },
          date: selectedSlot,
          paymentMethod,
        }),
      });

      if (response.ok) {
        setSelectedBarber(barber);
        setBookingStatus('success');
      } else {
        setBookingStatus('error');
      }
    } catch {
      setBookingStatus('error');
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => {
    setBookingStatus('idle');
    setStep((s) => s - 1);
  };

  const resetFlow = () => {
    setBookingStatus('idle');
    setStep(1);
    setSelectedService(null);
    setBarberMode('any');
    setSelectedBarber(null);
    setSelectedDate(new Date());
    setAvailableOptions([]);
    setSelectedSlot(null);
  };

  if (bookingStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 dark:bg-neutral-900/70 backdrop-blur p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-pink-200/60 dark:border-neutral-800">
          <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-neutral-950 dark:text-white">Agendamento Confirmado!</h1>
          <p className="text-neutral-700 dark:text-neutral-300 mb-4">
            Seu horário de {selectedService?.name} com {selectedBarber?.name} foi reservado.
          </p>
          <p className="text-neutral-700 dark:text-neutral-300 mb-6">
            Pagamento: {paymentMethods.find((p) => p.id === paymentMethod)?.name}
          </p>
          <div className="grid grid-cols-1 gap-3">
            <a
              href={whatsappUrl}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition"
              target="_blank"
              rel="noreferrer"
            >
              Falar no WhatsApp
            </a>
            <a
              href={instagramUrl}
              className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:opacity-95 text-white font-bold py-3 rounded-xl transition"
              target="_blank"
              rel="noreferrer"
            >
              Ver Instagram
            </a>
            <button
              onClick={resetFlow}
              className="w-full bg-white/80 dark:bg-neutral-800 border border-pink-200/70 dark:border-neutral-700 text-neutral-950 dark:text-white font-bold py-3 rounded-xl transition hover:bg-white"
            >
              Fazer outro agendamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50">
        <div
          className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-sky-500"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-pink-200/50 dark:border-neutral-800 bg-white/65 dark:bg-neutral-950/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button onClick={() => scrollToSection('agendar')} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-lg shadow-pink-500/20" />
            <div className="text-left">
              <p className="font-extrabold text-neutral-950 dark:text-white leading-tight">Studio</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-tight">Unhas & Beleza</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-2">
            {(
              [
                ['agendar', 'Agendar'],
                ['servicos', 'Serviços'],
                ['produtos', 'Produtos'],
                ['profissionais', 'Profissionais'],
                ['sobre', 'Sobre'],
              ] as const
            ).map(([id, label]) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={[
                    'px-3 py-2 rounded-xl text-sm font-semibold transition',
                    isActive
                      ? 'bg-pink-600 text-white shadow shadow-pink-500/20'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-pink-100/70 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hidden sm:inline-flex px-3 py-2 rounded-xl text-sm font-semibold border border-pink-200/70 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-pink-100/70 dark:hover:bg-neutral-800 transition"
            >
              Área da Profissional
            </Link>
            <button
              onClick={() => scrollToSection('agendar')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
            >
              Agendar
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-neutral-900/60 border border-pink-200/60 dark:border-neutral-800 backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Agendamento online</p>
              {demoMode && (
                <p className="text-xs font-bold text-pink-700 dark:text-pink-300 bg-pink-100/70 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                  modo demo
                </p>
              )}
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
              Unhas lindas, meigas e do jeitinho que você ama.
            </h1>
            <p className="mt-4 text-lg text-neutral-700 dark:text-neutral-300 max-w-xl">
              Escolha o serviço, selecione a profissional (ou deixe por nossa conta) e agende em poucos cliques.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => scrollToSection('agendar')}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
              >
                Quero agendar
              </button>
              <button
                onClick={() => scrollToSection('servicos')}
                className="px-5 py-3 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-bold hover:bg-white transition"
              >
                Ver serviços
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-pink-500/25 via-fuchsia-500/10 to-sky-500/20 blur-2xl rounded-[2.5rem]" />
            <div className="relative rounded-[2.5rem] overflow-hidden border border-pink-200/60 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 backdrop-blur shadow-xl">
              <div className="h-72 md:h-96 relative">
                <Image
                  src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1800&q=80"
                  alt="Unhas e beleza"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-extrabold text-neutral-950 dark:text-white">Atendimento</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">09:00 — 19:00</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-neutral-950 dark:text-white">Pagamentos</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">Pix, cartão e dinheiro</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="agendar" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-neutral-950 dark:text-white">Agendar horário</h2>
                  <p className="text-neutral-700 dark:text-neutral-300">Passo {step} de 4</p>
                </div>
                <button
                  onClick={resetFlow}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border border-pink-200/70 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-pink-100/70 dark:hover:bg-neutral-800 transition"
                >
                  Reiniciar
                </button>
              </div>

              {bookingStatus === 'error' && (
                <div className="mt-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200">
                  Não foi possível concluir o agendamento. Tente novamente.
                </div>
              )}

              <div className="mt-6">
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="font-bold text-neutral-950 dark:text-white">Escolha o serviço</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {services.map((service) => {
                        const isSelected = selectedService?.id === service.id;
                        return (
                          <button
                            key={service.id}
                            onClick={() => setSelectedService(service)}
                            className={[
                              'text-left p-4 rounded-2xl border transition',
                              isSelected
                                ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg shadow-pink-500/20'
                                : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={['font-extrabold', isSelected ? 'text-white' : 'text-neutral-950 dark:text-white'].join(' ')}>
                                  {service.name}
                                </p>
                                {service.description && (
                                  <p className={['text-sm mt-1', isSelected ? 'text-white/85' : 'text-neutral-700 dark:text-neutral-300'].join(' ')}>
                                    {service.description}
                                  </p>
                                )}
                              </div>
                              <div className={['text-right', isSelected ? 'text-white' : 'text-neutral-950 dark:text-white'].join(' ')}>
                                <p className="font-extrabold">R$ {service.price.toFixed(2)}</p>
                                <p className={['text-xs', isSelected ? 'text-white/85' : 'text-neutral-600 dark:text-neutral-400'].join(' ')}>
                                  {service.duration} min
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <button
                        disabled={!selectedService}
                        onClick={nextStep}
                        className="px-5 py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold transition"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <p className="font-bold text-neutral-950 dark:text-white">Com quem você quer fazer?</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setBarberMode('any');
                          setSelectedBarber(null);
                        }}
                        className={[
                          'p-4 rounded-2xl border text-left transition',
                          barberMode === 'any'
                            ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg shadow-pink-500/20'
                            : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                        ].join(' ')}
                      >
                        <p className="font-extrabold">Qualquer profissional</p>
                        <p className={['text-sm mt-1', barberMode === 'any' ? 'text-white/85' : 'text-neutral-700 dark:text-neutral-300'].join(' ')}>
                          Mostra os primeiros horários disponíveis.
                        </p>
                      </button>
                      <button
                        onClick={() => setBarberMode('specific')}
                        className={[
                          'p-4 rounded-2xl border text-left transition',
                          barberMode === 'specific'
                            ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg shadow-pink-500/20'
                            : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                        ].join(' ')}
                      >
                        <p className="font-extrabold">Escolher profissional</p>
                        <p
                          className={[
                            'text-sm mt-1',
                            barberMode === 'specific' ? 'text-white/85' : 'text-neutral-700 dark:text-neutral-300',
                          ].join(' ')}
                        >
                          Selecione a pessoa preferida.
                        </p>
                      </button>
                    </div>

                    {barberMode === 'specific' && (
                      <div className="grid sm:grid-cols-3 gap-3">
                        {displayedBarbers.map((b) => {
                          const isSelected = selectedBarber?.id === b.id;
                          return (
                            <button
                              key={b.id}
                              onClick={() => setSelectedBarber(b)}
                              className={[
                                'p-4 rounded-2xl border text-left transition',
                                isSelected
                                  ? 'bg-pink-600 text-white border-transparent shadow-lg shadow-pink-500/20'
                                  : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                              ].join(' ')}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white font-extrabold flex items-center justify-center">
                                  {b.avatar || b.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className={['font-extrabold truncate', isSelected ? 'text-white' : 'text-neutral-950 dark:text-white'].join(' ')}>
                                    {b.name}
                                  </p>
                                  <p className={['text-xs', isSelected ? 'text-white/85' : 'text-neutral-600 dark:text-neutral-400'].join(' ')}>
                                    {demoMode ? 'demonstração' : 'agenda online'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={prevStep}
                        className="px-5 py-3 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-bold hover:bg-white transition"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={nextStep}
                        disabled={barberMode === 'specific' && !selectedBarber}
                        className="px-5 py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold transition"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-neutral-950 dark:text-white">Escolha o dia</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {selectedService?.name} · {selectedService?.duration} min
                        </p>
                      </div>
                      <button
                        onClick={prevStep}
                        className="px-4 py-2 rounded-xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-bold hover:bg-white transition"
                      >
                        Voltar
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {days.map((d) => {
                        const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                        return (
                          <button
                            key={d.toISOString()}
                            onClick={() => setSelectedDate(d)}
                            className={[
                              'shrink-0 px-4 py-3 rounded-2xl border font-bold transition',
                              isSelected
                                ? 'bg-pink-600 text-white border-transparent shadow shadow-pink-500/20'
                                : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                            ].join(' ')}
                          >
                            <p className="text-sm">{formatDayLabel(d)}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2">
                      <p className="font-bold text-neutral-950 dark:text-white">Horários</p>

                      {availabilityError && (
                        <div className="mt-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200">
                          {availabilityError}
                        </div>
                      )}

                      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {loading && (
                          <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300">
                            Carregando horários...
                          </div>
                        )}

                        {!loading && availableOptions.length === 0 && (
                          <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300">
                            Sem horários disponíveis nesse dia.
                          </div>
                        )}

                        {!loading &&
                          availableOptions.slice(0, 18).map((opt) => {
                            const isSelected =
                              selectedSlot === opt.dateTime &&
                              (barberMode === 'any' ? selectedBarber?.id === opt.barber.id : selectedBarber?.id === opt.barber.id);
                            return (
                              <button
                                key={`${opt.dateTime}-${opt.barber.id}`}
                                onClick={() => {
                                  setSelectedSlot(opt.dateTime);
                                  if (barberMode === 'any') setSelectedBarber(opt.barber);
                                }}
                                className={[
                                  'p-4 rounded-2xl border text-left transition',
                                  isSelected
                                    ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg shadow-pink-500/20'
                                    : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                                ].join(' ')}
                              >
                                <p className="font-extrabold">{formatSlotLabel(opt.dateTime)}</p>
                                <p className={['text-xs mt-1', isSelected ? 'text-white/85' : 'text-neutral-600 dark:text-neutral-400'].join(' ')}>
                                  {opt.barber.name}
                                </p>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={nextStep}
                        disabled={!selectedSlot}
                        className="px-5 py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold transition"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-neutral-950 dark:text-white">Seus dados</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {selectedService?.name} · {selectedBarber?.name} · {selectedSlot ? formatSlotLabel(selectedSlot) : ''}
                        </p>
                      </div>
                      <button
                        onClick={prevStep}
                        className="px-4 py-2 rounded-xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-bold hover:bg-white transition"
                      >
                        Voltar
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Nome</label>
                        <input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Seu nome"
                          className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-2xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Telefone</label>
                        <input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-2xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Email (opcional)</label>
                        <input
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="voce@email.com"
                          className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-2xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        <input
                          type="checkbox"
                          checked={saveCustomerData}
                          onChange={(e) => setSaveCustomerData(e.target.checked)}
                          className="accent-pink-600"
                        />
                        Salvar meus dados neste dispositivo
                      </label>
                    </div>

                    <div>
                      <p className="font-bold text-neutral-950 dark:text-white mb-2">Forma de pagamento</p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {paymentMethods.map((p) => {
                          const isSelected = paymentMethod === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setPaymentMethod(p.id)}
                              className={[
                                'p-4 rounded-2xl border text-left transition',
                                isSelected
                                  ? 'bg-pink-600 text-white border-transparent shadow shadow-pink-500/20'
                                  : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                              ].join(' ')}
                            >
                              <p className="font-extrabold">{p.name}</p>
                              {p.description && (
                                <p className={['text-xs mt-1', isSelected ? 'text-white/85' : 'text-neutral-600 dark:text-neutral-400'].join(' ')}>
                                  {p.description}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={handleBooking}
                      disabled={bookingStatus === 'loading' || !customerName || !customerPhone || !selectedSlot}
                      className="w-full px-5 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:opacity-95 disabled:opacity-50 text-white font-extrabold transition shadow-lg shadow-pink-500/20"
                    >
                      {bookingStatus === 'loading' ? 'Confirmando...' : 'Confirmar agendamento'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-5 space-y-4">
            <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6">
              <p className="font-extrabold text-neutral-950 dark:text-white">Resumo</p>
              <div className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Serviço</span>
                  <span className="font-bold text-neutral-950 dark:text-white">{selectedService?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Profissional</span>
                  <span className="font-bold text-neutral-950 dark:text-white">
                    {barberMode === 'any' ? (selectedBarber?.name || 'Qualquer') : selectedBarber?.name || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Dia</span>
                  <span className="font-bold text-neutral-950 dark:text-white">{formatDayLabel(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Horário</span>
                  <span className="font-bold text-neutral-950 dark:text-white">{selectedSlot ? formatSlotLabel(selectedSlot) : '—'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-3xl shadow-xl shadow-pink-500/20 p-6 text-white">
              <p className="font-extrabold text-lg">Dica meiga</p>
              <p className="mt-2 text-white/90 text-sm">
                Para nail art com detalhes, vale escolher um horário um pouquinho mais folgado. Assim a gente capricha sem pressa.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section id="servicos" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Serviços</h2>
            <p className="text-neutral-700 dark:text-neutral-300">Escolha o seu favorito e venha brilhar.</p>
          </div>
          <button
            onClick={() => scrollToSection('agendar')}
            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-bold hover:bg-white transition"
          >
            Agendar
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {services.map((s) => (
            <div
              key={s.id}
              className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-extrabold text-neutral-950 dark:text-white">{s.name}</p>
                  {s.description && <p className="mt-2 text-neutral-700 dark:text-neutral-300">{s.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-neutral-950 dark:text-white">R$ {s.price.toFixed(2)}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.duration} min</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedService(s);
                  setStep(2);
                  scrollToSection('agendar');
                }}
                className="mt-5 w-full px-4 py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold transition"
              >
                Agendar este serviço
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="produtos" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Produtos</h2>
          <p className="text-neutral-700 dark:text-neutral-300">Cuidados para manter o resultado por mais tempo.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6"
            >
              <p className="text-lg font-extrabold text-neutral-950 dark:text-white">{p.name}</p>
              {p.category && <p className="text-sm mt-1 text-pink-700 dark:text-pink-300 font-bold">{p.category}</p>}
              {p.description && <p className="mt-2 text-neutral-700 dark:text-neutral-300">{p.description}</p>}
            </div>
          ))}
        </div>
      </section>

      <section id="profissionais" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Profissionais</h2>
          <p className="text-neutral-700 dark:text-neutral-300">Escolha quem combina com seu estilo.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {displayedBarbers.map((b) => {
            const photoUrl = (b as DemoBarber).photoUrl;
            return (
              <div
                key={b.id}
                className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl overflow-hidden"
              >
                {photoUrl ? (
                  <div className="h-44 relative">
                    <Image src={photoUrl} alt={b.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-pink-500/25 to-fuchsia-600/20" />
                )}
                <div className="p-6">
                  <p className="text-lg font-extrabold text-neutral-950 dark:text-white">{b.name}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                    {demoMode ? 'Exemplo para visualizar o site' : 'Agendamento via Google Agenda'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedBarber(b);
                      setBarberMode('specific');
                      if (!selectedService) {
                        setSelectedService(services[0] || null);
                        setStep(2);
                      } else {
                        setStep(3);
                      }
                      scrollToSection('agendar');
                    }}
                    className="mt-4 w-full px-4 py-3 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-extrabold hover:bg-white transition"
                  >
                    Agendar com {b.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="sobre" className="max-w-6xl mx-auto px-4 pb-20 scroll-mt-24">
        <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-8">
          <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Sobre</h2>
          <p className="mt-3 text-neutral-700 dark:text-neutral-300 max-w-3xl">
            Um cantinho pensado para você se sentir bem: cuidado, delicadeza e um acabamento impecável. Aqui o foco é deixar suas
            unhas do jeitinho que você sonhou.
          </p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Higiene</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Materiais esterilizados e cuidado em cada etapa.</p>
            </div>
            <div className="p-5 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Pontualidade</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Horários certinhos para você se planejar.</p>
            </div>
            <div className="p-5 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Meiguice</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Detalhes fofos, brilho e acabamento delicado.</p>
            </div>
          </div>
        </div>
      </section>

      {showFloatingCTA && (
        <button
          onClick={() => scrollToSection('agendar')}
          className="fixed bottom-5 right-5 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-extrabold shadow-xl shadow-pink-500/25 hover:opacity-95 transition z-40"
        >
          Agendar agora
        </button>
      )}

      <footer className="border-t border-pink-200/50 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">© {new Date().getFullYear()} Studio de Unhas</p>
          <div className="flex items-center gap-3">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition"
            >
              Instagram
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
