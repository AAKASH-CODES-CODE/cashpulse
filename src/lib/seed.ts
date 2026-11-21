import type { AppState, Client, Expense, Invoice } from './types';
import { addDays, startOfDay, toIsoDate } from './money';

export function createSeedState(now: Date = new Date()): AppState {
  const today = startOfDay(now);
  const iso = (offset: number): string => toIsoDate(addDays(today, offset));
  const year = today.getFullYear();
  const num = (n: number): string => `INV-${year}-${String(n).padStart(3, '0')}`;

  const clients: Client[] = [
    { id: 'cli_studio_alpha', name: 'Studio Alpha', whatsapp: '+919811100001', email: 'accounts@studioalpha.in' },
    { id: 'cli_techcorp', name: 'TechCorp India', whatsapp: '+919822200002', email: 'ap@techcorp.in' },
    { id: 'cli_craft_media', name: 'Craft Media', whatsapp: '+919833300003', email: 'billing@craftmedia.in' },
    { id: 'cli_zeta_labs', name: 'Zeta Labs', whatsapp: '+919844400004', email: 'finance@zetalabs.in' },
    { id: 'cli_freelance_gig', name: 'Freelance Gig', whatsapp: '+919855500005' },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_001',
      number: num(1),
      clientId: 'cli_studio_alpha',
      project: 'Brand identity system',
      amount: 48000,
      issueDate: iso(-60),
      dueDate: iso(-45),
      paidDate: iso(-40),
    },
    {
      id: 'inv_002',
      number: num(2),
      clientId: 'cli_freelance_gig',
      project: 'Landing page build',
      amount: 22000,
      issueDate: iso(-50),
      dueDate: iso(-35),
      paidDate: iso(-33),
    },
    {
      id: 'inv_003',
      number: num(3),
      clientId: 'cli_techcorp',
      project: 'Dashboard UI design',
      amount: 60000,
      issueDate: iso(-25),
      dueDate: iso(5),
    },
    {
      id: 'inv_004',
      number: num(4),
      clientId: 'cli_craft_media',
      project: 'Social media creative kit',
      amount: 35000,
      issueDate: iso(-10),
      dueDate: iso(20),
    },
    {
      id: 'inv_005',
      number: num(5),
      clientId: 'cli_zeta_labs',
      project: 'Mobile app prototype',
      amount: 28000,
      issueDate: iso(-48),
      dueDate: iso(-18),
    },
    {
      id: 'inv_006',
      number: num(6),
      clientId: 'cli_studio_alpha',
      project: 'Website copy revisions',
      amount: 17000,
      issueDate: iso(-62),
      dueDate: iso(-32),
    },
  ];

  const expenses: Expense[] = [
    { id: 'exp_rent', name: 'Office Rent', amount: 25000, dueDay: 1, category: 'Rent' },
    { id: 'exp_hosting', name: 'Cloud Hosting', amount: 3200, dueDay: 10, category: 'Infrastructure' },
    { id: 'exp_software', name: 'Software Subscriptions', amount: 4500, dueDay: 5, category: 'Software' },
    { id: 'exp_contractor', name: 'Contractor Pay', amount: 15000, dueDay: 15, category: 'Contractors' },
  ];

  return {
    clients,
    invoices,
    expenses,
    bankBalance: 85000,
    plan: 'free',
    updatedAt: now.toISOString(),
  };
}
