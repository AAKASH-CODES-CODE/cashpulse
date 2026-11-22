import { NextResponse } from 'next/server';
import { getServerDB } from '@/lib/server-db';
import type { Invoice, BusinessPersona, GstRate } from '@/lib/types';
import { PERSONA_DATA } from '@/lib/personas';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const persona = searchParams.get('persona') as BusinessPersona | null;
    const status = searchParams.get('status');

    const db = getServerDB();
    let invoices = db.invoices;

    if (persona && PERSONA_DATA[persona]) {
      const personaClientIds = new Set(PERSONA_DATA[persona].clients.map((c) => c.id));
      invoices = invoices.filter((inv) => personaClientIds.has(inv.clientId));
    }

    const today = new Date().toISOString().slice(0, 10);
    if (status === 'paid') {
      invoices = invoices.filter((inv) => Boolean(inv.paidDate));
    } else if (status === 'overdue') {
      invoices = invoices.filter((inv) => !inv.paidDate && inv.dueDate < today);
    } else if (status === 'pending') {
      invoices = invoices.filter((inv) => !inv.paidDate && inv.dueDate >= today);
    }

    return NextResponse.json({
      success: true,
      count: invoices.length,
      data: invoices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, project, amount, issueDate, dueDate, deliverables, gstRate } = body;

    if (!clientId || !project || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: clientId, project and a positive amount are required.',
        },
        { status: 400 }
      );
    }

    const db = getServerDB();
    const id = `inv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const year = new Date().getFullYear();
    const count = db.invoices.length + 1;
    const number = `INV-${year}-${String(count).padStart(3, '0')}`;

    const newInvoice: Invoice = {
      id,
      number,
      clientId,
      project: String(project).trim(),
      amount: Math.round(amount),
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      gstRate: typeof gstRate === 'number' ? (gstRate as GstRate) : 18,
      deliverables: Array.isArray(deliverables) ? deliverables : [],
      milestoneLocked: Array.isArray(deliverables) && deliverables.length > 0,
    };

    db.invoices.unshift(newInvoice);

    return NextResponse.json(
      {
        success: true,
        message: 'Invoice created successfully in CashPulse Core.',
        data: newInvoice,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Malformed JSON payload' },
      { status: 400 }
    );
  }
}
