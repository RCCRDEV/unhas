export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

export interface Barber {
  id: string;
  name: string;
  calendarId: string;
  avatar?: string;
}

export type PaymentMethodId = 'pix' | 'card' | 'cash';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
}

export const services: Service[] = [
  {
    id: 'manicure',
    name: 'Manicure Tradicional',
    price: 50.0,
    duration: 45,
    description: 'Cutilagem delicada, esmaltação e acabamento caprichado.',
  },
  {
    id: 'pedicure',
    name: 'Pedicure + Spa dos Pés',
    price: 70.0,
    duration: 60,
    description: 'Hidratação, cuidado e sensação de leveza com um toque relax.',
  },
  {
    id: 'gel',
    name: 'Esmaltação em Gel',
    price: 90.0,
    duration: 75,
    description: 'Brilho duradouro e unhas impecáveis por mais tempo.',
  },
  {
    id: 'alongamento',
    name: 'Alongamento (Fibra / Gel)',
    price: 170.0,
    duration: 120,
    description: 'Formato e comprimento sob medida com acabamento natural.',
  },
  {
    id: 'nail-art',
    name: 'Nail Art (Detalhes)',
    price: 35.0,
    duration: 30,
    description: 'Detalhes meigos: francesinha, glitter, flores e traços finos.',
  },
];

export const barbers: Barber[] = [
  {
    id: 'prof-1',
    name: 'Lívia',
    calendarId: process.env.GOOGLE_CALENDAR_ID_1 || '',
  },
  {
    id: 'prof-2',
    name: 'Bruna',
    calendarId: process.env.GOOGLE_CALENDAR_ID_2 || '',
  },
  {
    id: 'prof-3',
    name: 'Camila',
    calendarId: process.env.GOOGLE_CALENDAR_ID_3 || '',
  },
];

export const paymentMethods: PaymentMethod[] = [
  { id: 'pix', name: 'Pix', description: 'Pagamento via Pix' },
  { id: 'card', name: 'Cartão', description: 'Crédito ou débito no local' },
  { id: 'cash', name: 'Dinheiro', description: 'Pagamento em dinheiro no local' },
];

export const products: Product[] = [
  {
    id: 'oleo-cuticula',
    name: 'Óleo de Cutícula',
    category: 'Cuidados',
    description: 'Nutre e protege para manter as unhas lindas no dia a dia.',
  },
  {
    id: 'base-fortalecedora',
    name: 'Base Fortalecedora',
    category: 'Cuidados',
    description: 'Ajuda no crescimento e na resistência das unhas.',
  },
  {
    id: 'top-coat',
    name: 'Top Coat Brilho',
    category: 'Finalização',
    description: 'Brilho extra e acabamento espelhado.',
  },
  {
    id: 'creme-maos',
    name: 'Creme Hidratante para as Mãos',
    category: 'Hidratação',
    description: 'Toque macio e perfumado.',
  },
];
