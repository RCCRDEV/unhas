'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { barbers, paymentMethods, products, services, Barber, PaymentMethodId, Service } from '@/config';

type AvailabilityOption = {
  dateTime: string;
  barber: Barber;
};

type SectionId =
  | 'inicio'
  | 'agendar'
  | 'servicos'
  | 'galeria'
  | 'avaliacoes'
  | 'produtos'
  | 'profissionais'
  | 'sobre'
  | 'faq'
  | 'localizacao';

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

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={['w-4 h-4', filled ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700'].join(' ')}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 17.27l5.18 3.73-1.64-6.19L20.5 9.5l-6.3-.27L12 3 9.8 9.23l-6.3.27 4.96 5.31L6.82 21z" />
    </svg>
  );
}

export default function Home() {
  const instagramUrl = 'https://www.instagram.com/';
  const whatsappUrl = 'https://wa.me/';
  const addressText = 'Rua Exemplo, 123 - Centro';
  const cityText = 'Sua Cidade - UF';
  const forceDemo = true;

  const demoBarbers: DemoBarber[] = useMemo(
    () => [
      {
        id: 'prof-1',
        name: 'Lívia',
        calendarId: 'prof-1',
        avatar: 'L',
        photoUrl:
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'prof-2',
        name: 'Bruna',
        calendarId: 'prof-2',
        avatar: 'B',
        photoUrl:
          'https://images.unsplash.com/photo-1520975693419-b3a4c1f2f7c1?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'prof-3',
        name: 'Camila',
        calendarId: 'prof-3',
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

  const [activeSection, setActiveSection] = useState<SectionId>('inicio');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navOverrideUntilRef = useRef(0);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const sectionOrder = useMemo(
    () =>
      [
        'inicio',
        'agendar',
        'servicos',
        'galeria',
        'avaliacoes',
        'produtos',
        'profissionais',
        'sobre',
        'faq',
        'localizacao',
      ] as const satisfies ReadonlyArray<SectionId>,
    []
  );

  const primaryNavItems = useMemo(
    () =>
      [
        ['inicio', 'Início'],
        ['agendar', 'Agendar'],
        ['servicos', 'Serviços'],
        ['localizacao', 'Contato'],
      ] as const satisfies ReadonlyArray<readonly [SectionId, string]>,
    []
  );

  const allNavItems = useMemo(
    () =>
      [
        ['inicio', 'Início'],
        ['agendar', 'Agendar'],
        ['servicos', 'Serviços'],
        ['galeria', 'Galeria'],
        ['avaliacoes', 'Avaliações'],
        ['produtos', 'Produtos'],
        ['profissionais', 'Profissionais'],
        ['sobre', 'Sobre'],
        ['faq', 'Perguntas frequentes'],
        ['localizacao', 'Localização & contato'],
      ] as const satisfies ReadonlyArray<readonly [SectionId, string]>,
    []
  );

  const moreNavItems = useMemo(() => {
    const primaryIds = new Set<SectionId>(primaryNavItems.map(([id]) => id));
    return allNavItems.filter(([id]) => !primaryIds.has(id));
  }, [allNavItems, primaryNavItems]);

  const galleryItems = useMemo(
    () => [
      {
        id: 'g1',
        tag: 'Nail art',
        title: 'Florzinhas delicadas',
        url: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'g2',
        tag: 'Gel',
        title: 'Brilho espelhado',
        url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'g3',
        tag: 'Alongamento',
        title: 'Formato sob medida',
        url: 'https://images.unsplash.com/photo-1607779097040-26f5b2d7a2c8?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'g4',
        tag: 'Spa',
        title: 'Cuidado e hidratação',
        url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'g5',
        tag: 'Nail art',
        title: 'Francesinha meiga',
        url: 'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=1600&q=80',
      },
      {
        id: 'g6',
        tag: 'Gel',
        title: 'Cor delicada',
        url: 'https://images.unsplash.com/photo-1610992015263-9a86a1d0b2de?auto=format&fit=crop&w=1600&q=80',
      },
    ],
    []
  );

  const testimonialItems = useMemo(
    () => [
      {
        id: 't1',
        name: 'Mariana',
        rating: 5,
        service: 'Esmaltação em Gel',
        text: 'Ficou impecável! Atendimento super delicado e o acabamento ficou perfeito.',
      },
      {
        id: 't2',
        name: 'Camila',
        rating: 5,
        service: 'Alongamento',
        text: 'Amei o formato e a naturalidade. Saí me sentindo outra pessoa.',
      },
      {
        id: 't3',
        name: 'Beatriz',
        rating: 5,
        service: 'Manicure Tradicional',
        text: 'Capricho em cada detalhe, higiene impecável e pontualidade.',
      },
      {
        id: 't4',
        name: 'Larissa',
        rating: 5,
        service: 'Pedicure + Spa',
        text: 'Relaxante e muito cuidadoso. Já marquei o próximo.',
      },
    ],
    []
  );

  const faqItems = useMemo(
    () => [
      {
        id: 'f1',
        q: 'Preciso levar meu esmalte?',
        a: 'Não precisa. Temos uma seleção de cores e finalizações. Se você tiver uma cor favorita, pode trazer também.',
      },
      {
        id: 'f2',
        q: 'Qual a durabilidade do gel?',
        a: 'Em geral, 15 a 21 dias. Depende da rotina e dos cuidados (luvas para limpeza, óleo de cutícula, etc.).',
      },
      {
        id: 'f3',
        q: 'Posso fazer nail art no mesmo dia?',
        a: 'Sim. Para nail art mais elaborada, escolha um serviço com tempo maior ou adicione “Nail Art (Detalhes)”.',
      },
      {
        id: 'f4',
        q: 'Política de atraso e cancelamento',
        a: 'Atrasos podem reduzir o tempo do serviço. Para cancelar, avise com antecedência para liberar o horário.',
      },
    ],
    []
  );

  const [galleryTag, setGalleryTag] = useState<'Todas' | 'Nail art' | 'Gel' | 'Alongamento' | 'Spa'>('Todas');
  const [galleryModal, setGalleryModal] = useState<{ url: string; title: string } | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>('f1');

  const filteredGallery = useMemo(() => {
    if (galleryTag === 'Todas') return galleryItems;
    return galleryItems.filter((g) => g.tag === galleryTag);
  }, [galleryItems, galleryTag]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTestimonialIndex((i) => (i + 1) % testimonialItems.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [testimonialItems.length]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (forceDemo) {
      setDemoMode(true);
      return;
    }
    if (activeBarbers.length > 0) {
      setDemoMode(false);
    }
  }, [activeBarbers.length, forceDemo]);

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

      if (Date.now() < navOverrideUntilRef.current) return;
      const offset = 120;
      let current: SectionId = 'inicio';
      for (const id of sectionOrder) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - offset <= 0) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionOrder]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const root = moreMenuRef.current;
      if (!root) return;
      if (root.contains(target)) return;
      setMoreMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [moreMenuOpen]);

  const handleNavClick = (id: SectionId) => {
    setActiveSection(id);
    setMoreMenuOpen(false);
    setMobileMenuOpen(false);
    navOverrideUntilRef.current = Date.now() + 2000;
  };

  const scrollToSection = (id: SectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopy = async (value: string, okText: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setToast(okText);
        return;
      }
    } catch {
      setToast('Não foi possível copiar automaticamente');
      return;
    }
    setToast('Não foi possível copiar automaticamente');
  };

  const fetchAvailability = useCallback(async () => {
    if (!selectedService) return;
    setLoading(true);
    setAvailabilityError(null);

    const fallbackToDemo = () => {
      const baseSlots = generateDaySlots(selectedDate, selectedService.duration);
      const isBooked = (barberId: string, dateTime: string) => {
        const booked = demoBookedByBarberId[barberId] || [];
        return booked.includes(dateTime);
      };
      const options: AvailabilityOption[] = [];
      const pool = displayedBarbers.length > 0 ? displayedBarbers : demoBarbers;
      for (const barber of pool) {
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
      setToast('Serviço temporariamente indisponível – usando modo demo');
    };

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

      if (!response.ok) {
        fallbackToDemo();
        return;
      }
      const data: unknown = await response.json().catch(() => ({}));
      if (isRecord(data) && data.demo === true) {
        fallbackToDemo();
        return;
      }

      if (barberMode === 'any') {
        const options: unknown[] = isRecord(data) && Array.isArray(data.options) ? data.options : [];
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

      const slots: unknown[] = isRecord(data) && Array.isArray(data.slots) ? data.slots : [];
      if (!Array.isArray(slots)) {
        fallbackToDemo();
        return;
      }
      const mapped = slots
        .filter((s: unknown): s is string => typeof s === 'string')
        .map((s) => {
          if (!selectedBarber) return null;
          return { dateTime: s, barber: selectedBarber };
        })
        .filter(Boolean) as AvailabilityOption[];

      setAvailableOptions(mapped);
    } catch {
      fallbackToDemo();
    } finally {
      setLoading(false);
    }
  }, [
    activeBarbers,
    barberMode,
    demoBarbers,
    demoBookedByBarberId,
    demoMode,
    displayedBarbers,
    selectedBarber,
    selectedDate,
    selectedService,
  ]);

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

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {}

      const isDemo = isRecord(payload) && payload.demo === true;
      if (response.ok && !isDemo) {
        setSelectedBarber(barber);
        setBookingStatus('success');
      } else if (!response.ok || isDemo || response.status === 501) {
        setDemoBookedByBarberId((prev) => {
          const existing = prev[barber.id] || [];
          if (existing.includes(selectedSlot)) return prev;
          return { ...prev, [barber.id]: [...existing, selectedSlot] };
        });
        setAvailableOptions((prev) => prev.filter((o) => !(o.dateTime === selectedSlot && o.barber.id === barber.id)));
        setSelectedBarber(barber);
        setToast('Serviço indisponível – agendamento simulado');
        setBookingStatus('success');
      } else {
        setBookingStatus('error');
      }
    } catch {
      setDemoBookedByBarberId((prev) => {
        const existing = prev[barber.id] || [];
        if (existing.includes(selectedSlot)) return prev;
        return { ...prev, [barber.id]: [...existing, selectedSlot] };
      });
      setAvailableOptions((prev) => prev.filter((o) => !(o.dateTime === selectedSlot && o.barber.id === barber.id)));
      setSelectedBarber(barber);
      setToast('Serviço indisponível – agendamento simulado');
      setBookingStatus('success');
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
            <svg className="w-8 h-8 text-white" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <a href="#inicio" onClick={() => handleNavClick('inicio')} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-lg shadow-pink-500/20" />
            <div className="text-left">
              <p className="font-extrabold text-neutral-950 dark:text-white leading-tight">Studio</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-tight">Unhas & Beleza</p>
            </div>
          </a>

          <nav className="hidden md:flex items-center justify-end gap-2">
            {primaryNavItems.map(([id, label]) => {
              const isActive = activeSection === id;
              return (
                <a
                  key={`${id}-${label}`}
                  href={`#${id}`}
                  onClick={() => handleNavClick(id)}
                  className={[
                    'px-3 py-2 rounded-xl text-sm font-semibold transition',
                    isActive
                      ? 'bg-pink-600 text-white shadow shadow-pink-500/20'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-pink-100/70 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  {label}
                </a>
              );
            })}

            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen((v) => !v)}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition text-neutral-700 dark:text-neutral-200 hover:bg-pink-100/70 dark:hover:bg-neutral-800 border border-transparent"
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
              >
                Mais
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-3xl border border-pink-200/60 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/80 backdrop-blur shadow-2xl overflow-hidden">
                  <div className="p-2 grid gap-1">
                    {moreNavItems.map(([id, label]) => (
                      <a
                        key={`${id}-${label}`}
                        href={`#${id}`}
                        onClick={() => handleNavClick(id)}
                        className="px-3 py-3 rounded-2xl text-sm font-bold text-neutral-950 dark:text-white hover:bg-pink-100/70 dark:hover:bg-neutral-800 transition"
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 hover:bg-white transition flex items-center justify-center"
              aria-label="Abrir menu"
            >
              <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-100" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              href="/admin"
              className="hidden sm:inline-flex px-3 py-2 rounded-xl text-sm font-semibold border border-pink-200/70 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-pink-100/70 dark:hover:bg-neutral-800 transition"
            >
              Área da Profissional
            </Link>
            <a
              href="#agendar"
              onClick={() => handleNavClick('agendar')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
            >
              Agendar
            </a>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="absolute top-3 left-3 right-3 rounded-3xl border border-pink-200/60 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/80 backdrop-blur p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="font-extrabold text-neutral-950 dark:text-white">Menu</p>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 hover:bg-white transition flex items-center justify-center"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-100" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {allNavItems.map(([id, label]) => (
                <a
                  key={`${id}-${label}`}
                  href={`#${id}`}
                  onClick={() => handleNavClick(id)}
                  className="px-3 py-3 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 text-neutral-950 dark:text-white font-bold hover:bg-pink-50/70 dark:hover:bg-neutral-800 transition text-left"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Link
                href="/admin"
                className="px-3 py-3 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 text-neutral-950 dark:text-white font-bold hover:bg-pink-50/70 dark:hover:bg-neutral-800 transition"
              >
                Área da Profissional
              </Link>
              <a
                href="#agendar"
                onClick={() => handleNavClick('agendar')}
                className="px-3 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-extrabold hover:opacity-95 transition text-center"
              >
                Agendar agora
              </a>
            </div>
          </div>
        </div>
      )}

      <section id="inicio" className="max-w-6xl mx-auto px-4 pt-12 pb-10 scroll-mt-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
              Unhas lindas, meigas e do jeitinho que você ama.
            </h1>
            <p className="mt-4 text-lg text-neutral-700 dark:text-neutral-300 max-w-xl">A principal função aqui é marcar seu horário em poucos cliques.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  handleNavClick('agendar');
                  scrollToSection('agendar');
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
              >
                Quero agendar
              </button>
              <button
                onClick={() => {
                  handleNavClick('servicos');
                  scrollToSection('servicos');
                }}
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

      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-5 hover:-translate-y-0.5 transition">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 font-bold">Avaliação média</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-2xl font-extrabold text-neutral-950 dark:text-white">4,9</p>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} filled />
                ))}
              </div>
            </div>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Clientes apaixonadas</p>
          </div>
          <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-5 hover:-translate-y-0.5 transition">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 font-bold">Materiais</p>
            <p className="mt-2 text-2xl font-extrabold text-neutral-950 dark:text-white">Premium</p>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Esterilização e cuidado</p>
          </div>
          <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-5 hover:-translate-y-0.5 transition">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 font-bold">Atendimento</p>
            <p className="mt-2 text-2xl font-extrabold text-neutral-950 dark:text-white">09–19h</p>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Horários organizados</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-3xl shadow-xl shadow-pink-500/20 p-5 text-white hover:-translate-y-0.5 transition">
            <p className="text-sm font-bold text-white/90">Quer caprichar?</p>
            <p className="mt-2 text-xl font-extrabold">Nail art meiga</p>
            <p className="mt-1 text-sm text-white/90">Detalhes fofos e delicados</p>
            <a
              href="#agendar"
              className="mt-4 w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white/90 text-neutral-950 font-extrabold hover:bg-white transition"
            >
              Agendar agora
            </a>
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

      <section id="galeria" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Galeria</h2>
            <p className="text-neutral-700 dark:text-neutral-300">Inspirações para você salvar e trazer no dia.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['Todas', 'Nail art', 'Gel', 'Alongamento', 'Spa'] as const).map((tag) => {
              const isActive = galleryTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setGalleryTag(tag)}
                  className={[
                    'px-4 py-2 rounded-2xl border font-bold transition',
                    isActive
                      ? 'bg-pink-600 text-white border-transparent shadow shadow-pink-500/20'
                      : 'bg-white/80 dark:bg-neutral-900/40 border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white hover:bg-pink-50/70 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGallery.map((g) => (
            <button
              key={g.id}
              onClick={() => setGalleryModal({ url: g.url, title: g.title })}
              className="group text-left bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl overflow-hidden hover:-translate-y-0.5 transition"
            >
              <div className="h-48 relative">
                <Image src={g.url} alt={g.title} fill className="object-cover group-hover:scale-[1.03] transition" />
              </div>
              <div className="p-5">
                <p className="text-sm font-bold text-pink-700 dark:text-pink-300">{g.tag}</p>
                <p className="mt-1 font-extrabold text-neutral-950 dark:text-white">{g.title}</p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Clique para ampliar</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {galleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm" onClick={() => setGalleryModal(null)} aria-label="Fechar" />
          <div className="relative w-full max-w-3xl rounded-3xl overflow-hidden border border-pink-200/60 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/80 backdrop-blur shadow-2xl">
            <div className="p-4 flex items-center justify-between gap-3">
              <p className="font-extrabold text-neutral-950 dark:text-white">{galleryModal.title}</p>
              <button
                onClick={() => setGalleryModal(null)}
                className="w-10 h-10 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 hover:bg-white transition flex items-center justify-center"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative h-[60vh]">
              <Image src={galleryModal.url} alt={galleryModal.title} fill className="object-cover" />
            </div>
          </div>
        </div>
      )}

      <section id="avaliacoes" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Avaliações</h2>
            <p className="text-neutral-700 dark:text-neutral-300">O que as clientes falam do atendimento.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTestimonialIndex((i) => (i - 1 + testimonialItems.length) % testimonialItems.length)}
              className="w-10 h-10 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 hover:bg-white transition flex items-center justify-center"
              aria-label="Anterior"
            >
              <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-100" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setTestimonialIndex((i) => (i + 1) % testimonialItems.length)}
              className="w-10 h-10 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 hover:bg-white transition flex items-center justify-center"
              aria-label="Próximo"
            >
              <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-100" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6">
            {(() => {
              const t = testimonialItems[testimonialIndex];
              return (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-extrabold text-neutral-950 dark:text-white">{t.name}</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.service}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} filled={i < t.rating} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-neutral-700 dark:text-neutral-300 text-lg leading-relaxed">“{t.text}”</p>
                  <div className="mt-5 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="px-3 py-1 rounded-full bg-pink-100/80 dark:bg-neutral-800 text-pink-700 dark:text-pink-300 font-bold">
                      5 estrelas
                    </span>
                    <span>•</span>
                    <span>Atendimento delicado</span>
                    <span>•</span>
                    <span>Acabamento impecável</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="lg:col-span-5 grid gap-4">
            {testimonialItems.slice(0, 3).map((t) => (
              <button
                key={t.id}
                onClick={() => setTestimonialIndex(testimonialItems.findIndex((x) => x.id === t.id))}
                className="text-left bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-5 hover:-translate-y-0.5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-neutral-950 dark:text-white">{t.name}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.service}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} filled={i < t.rating} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-neutral-700 dark:text-neutral-300">“{t.text}”</p>
              </button>
            ))}
          </div>
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
          <div className="mt-5 grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Como funciona</p>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                  <span>Você escolhe o serviço e o dia.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                  <span>Seleciona uma profissional ou “qualquer profissional”.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                  <span>Confirma e recebe o horário na hora.</span>
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-3xl border border-pink-200/70 dark:border-neutral-800 bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-xl shadow-pink-500/20">
              <p className="font-extrabold">Cuidados pós</p>
              <p className="mt-3 text-white/90 text-sm">
                Use óleo de cutícula diariamente e luvas para tarefas com água e produtos de limpeza. Assim o resultado fica lindo por
                mais tempo.
              </p>
              <button onClick={() => scrollToSection('agendar')} className="mt-5 w-full px-4 py-3 rounded-2xl bg-white/90 text-neutral-950 font-extrabold hover:bg-white transition">
                Agendar agora
              </button>
            </div>
          </div>
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
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Esterilização</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Materiais higienizados e armazenamento seguro.</p>
            </div>
            <div className="p-5 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Conforto</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Ambiente aconchegante, música e um cheirinho bom.</p>
            </div>
            <div className="p-5 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
              <p className="font-extrabold text-neutral-950 dark:text-white">Transparência</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Valores e tempo do serviço claros desde o início.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="max-w-6xl mx-auto px-4 pb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Perguntas frequentes</h2>
          <p className="text-neutral-700 dark:text-neutral-300">Tudo para você agendar com tranquilidade.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-3">
            {faqItems.map((f) => {
              const open = openFaqId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setOpenFaqId((prev) => (prev === f.id ? null : f.id))}
                  className="w-full text-left bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6 hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-extrabold text-neutral-950 dark:text-white">{f.q}</p>
                      {open && <p className="mt-3 text-neutral-700 dark:text-neutral-300">{f.a}</p>}
                    </div>
                    <div className="w-10 h-10 rounded-2xl border border-pink-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-100" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={open ? 'M18 12H6' : 'M12 6v12m6-6H6'} />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-3xl shadow-xl shadow-pink-500/20 p-6 text-white">
              <p className="font-extrabold text-lg">Quer uma indicação?</p>
              <p className="mt-2 text-white/90 text-sm">
                Me diga se você quer algo delicado, ousado ou clássico e eu te ajudo a escolher o serviço ideal.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center px-4 py-3 rounded-2xl bg-white/90 text-neutral-950 font-extrabold hover:bg-white transition"
              >
                Falar no WhatsApp
              </a>
            </div>
            <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6">
              <p className="font-extrabold text-neutral-950 dark:text-white">Dica rápida</p>
              <p className="mt-3 text-neutral-700 dark:text-neutral-300 text-sm">
                Se suas unhas estiverem muito sensíveis ou com algum problema, avise na mensagem para adaptarmos o atendimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="localizacao" className="max-w-6xl mx-auto px-4 pb-20 scroll-mt-24">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-neutral-950 dark:text-white">Localização & Contato</h2>
          <p className="text-neutral-700 dark:text-neutral-300">Fácil de achar e gostoso de ficar.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6">
              <p className="font-extrabold text-neutral-950 dark:text-white">Endereço</p>
              <p className="mt-2 text-neutral-700 dark:text-neutral-300">{addressText}</p>
              <p className="text-neutral-700 dark:text-neutral-300">{cityText}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopy(`${addressText} - ${cityText}`, 'Endereço copiado!')}
                  className="px-4 py-3 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-extrabold hover:bg-white transition"
                >
                  Copiar endereço
                </button>
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold transition text-center"
                >
                  Abrir no Maps
                </a>
              </div>
            </div>

            <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl p-6">
              <p className="font-extrabold text-neutral-950 dark:text-white">Contato</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition text-center"
                >
                  WhatsApp
                </a>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:opacity-95 text-white font-extrabold transition text-center"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white/75 dark:bg-neutral-900/60 backdrop-blur rounded-3xl border border-pink-200/60 dark:border-neutral-800 shadow-xl overflow-hidden">
              <div className="h-64 md:h-96 relative">
                <Image
                  src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1800&q=80"
                  alt="Studio"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/40 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/85 dark:bg-neutral-950/70 backdrop-blur rounded-2xl border border-pink-200/60 dark:border-neutral-800 p-4">
                    <p className="font-extrabold text-neutral-950 dark:text-white">Horários</p>
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Seg a Sáb — 09:00 às 19:00</p>
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">Dom — sob consulta</p>
                  </div>
                </div>
              </div>
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

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-5 w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 flex items-center justify-center transition z-40"
        aria-label="WhatsApp"
      >
        <svg className="w-6 h-6" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.33.16 11.88c0 2.1.55 4.14 1.6 5.94L0 24l6.34-1.66a11.9 11.9 0 0 0 5.72 1.46h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.43-8.44ZM12.06 21.8h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.76.98 1-3.67-.23-.38a9.86 9.86 0 0 1-1.52-5.26C2.13 6.43 6.62 1.95 12.06 1.95c2.63 0 5.1 1.02 6.95 2.87a9.77 9.77 0 0 1 2.88 6.95c0 5.44-4.49 9.93-9.83 10.03Zm5.75-7.44c-.31-.16-1.85-.91-2.14-1.02-.29-.11-.5-.16-.72.16-.21.31-.82 1.02-1 1.23-.18.21-.36.24-.67.08-.31-.16-1.31-.48-2.5-1.54-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.72-1.74-.99-2.38-.26-.62-.53-.54-.72-.55h-.62c-.21 0-.54.08-.82.39-.29.31-1.08 1.06-1.08 2.59s1.11 3.01 1.26 3.22c.16.21 2.18 3.33 5.29 4.67.74.32 1.31.51 1.76.65.74.23 1.41.2 1.94.12.59-.09 1.85-.75 2.11-1.48.26-.72.26-1.34.18-1.48-.08-.14-.29-.21-.6-.37Z" />
        </svg>
      </a>
      <a
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-20 w-12 h-12 rounded-2xl bg-white/90 dark:bg-neutral-950/80 backdrop-blur border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white shadow-xl shadow-pink-500/15 flex items-center justify-center hover:bg-white transition z-40"
        aria-label="Instagram"
      >
        <svg className="w-6 h-6" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4Zm-4.5 3.25A4.75 4.75 0 1 1 7.25 12 4.75 4.75 0 0 1 12 7.25Zm0 2A2.75 2.75 0 1 0 14.75 12 2.75 2.75 0 0 0 12 9.25Zm5.35-2.35a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1Z" />
        </svg>
      </a>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-2xl bg-white/90 dark:bg-neutral-950/80 backdrop-blur border border-pink-200/60 dark:border-neutral-800 shadow-xl text-sm font-extrabold text-neutral-950 dark:text-white">
            {toast}
          </div>
        </div>
      )}

      <footer className="border-t border-pink-200/50 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-12 gap-6">
          <div className="md:col-span-5">
            <p className="font-extrabold text-neutral-950 dark:text-white">Studio de Unhas</p>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 max-w-md">
              Um espaço feito para você: delicadeza, higiene e um acabamento impecável. Agende online e venha se cuidar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-extrabold hover:bg-white transition">
                Instagram
              </a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition">
                WhatsApp
              </a>
            </div>
          </div>
          <div className="md:col-span-3">
            <p className="font-extrabold text-neutral-950 dark:text-white">Atalhos</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {allNavItems.map(([id, label]) => (
                <a
                  key={`${id}-${label}`}
                  href={`#${id}`}
                  onClick={() => {
                    handleNavClick(id);
                    requestAnimationFrame(() => scrollToSection(id));
                  }}
                  className="text-left text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="md:col-span-4">
            <p className="font-extrabold text-neutral-950 dark:text-white">Endereço</p>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{addressText}</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{cityText}</p>
            <button
              onClick={() => handleCopy(`${addressText} - ${cityText}`, 'Endereço copiado!')}
              className="mt-3 px-4 py-2 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-pink-200/70 dark:border-neutral-800 text-neutral-950 dark:text-white font-extrabold hover:bg-white transition"
            >
              Copiar
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">© {new Date().getFullYear()} Studio de Unhas</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Feito com carinho ✦ agendamento online</p>
        </div>
      </footer>
    </div>
  );
}
