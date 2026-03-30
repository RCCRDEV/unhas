'use client';

import { useState } from 'react';
import Link from 'next/link';
import { barbers, Barber } from '@/config';

export default function AdminPage() {
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || !date || !startTime || !endTime || !password) return;

    setStatus('loading');
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber: selectedBarber,
          service: { name: 'INDISPONÍVEL', duration: (endDateTime.getTime() - startDateTime.getTime()) / 60000 },
          customer: { name: 'BLOQUEIO', phone: 'SISTEMA' },
          date: startDateTime.toISOString(),
          isAdmin: true,
          password,
        }),
      });

      if (response.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen text-white p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold mb-2 text-neutral-950 dark:text-white">Acesso da Profissional</h1>
          <p className="text-neutral-600 dark:text-neutral-300">Marcar horário como indisponível</p>
        </header>

        <form
          onSubmit={handleBlockTime}
          className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-8 rounded-2xl shadow-xl space-y-6 border border-pink-200/60 dark:border-neutral-800"
        >
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
              Selecione seu Nome
            </label>
            <select
              value={selectedBarber?.id || ''}
              onChange={(e) => setSelectedBarber(barbers.find((b) => b.id === e.target.value) || null)}
              className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
              required
            >
              <option value="">Selecione...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Fim</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Senha de Acesso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full bg-white/90 dark:bg-neutral-800 border-2 border-pink-200/70 dark:border-neutral-700 rounded-xl p-4 focus:border-pink-500 outline-none transition text-neutral-950 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition"
          >
            {status === 'loading' ? 'Bloqueando...' : 'Marcar Indisponível'}
          </button>

          {status === 'success' && <p className="text-green-600 dark:text-green-400 text-center font-bold">Horário bloqueado!</p>}
          {status === 'error' && (
            <p className="text-red-600 dark:text-red-400 text-center font-bold">Erro ao bloquear. Verifique a senha.</p>
          )}
        </form>

        <div className="mt-8 text-center">
          <Link href="/" className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition">
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </main>
  );
}
