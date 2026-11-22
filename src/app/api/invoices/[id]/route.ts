import { NextResponse } from 'next/server';
import { getServerDB } from '@/lib/server-db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const db = getServerDB();
    const invoice = db.invoices.find((inv) => inv.id === id);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Invoice with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const client = db.clients.find((c) => c.id === invoice.clientId);
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const paymentUrl = `${protocol}://${host}/pay/${invoice.id}`;

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        clientName: client?.name || 'Unknown Client',
        clientWhatsapp: client?.whatsapp || '',
        paymentUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const db = getServerDB();
    const invoiceIndex = db.invoices.findIndex((inv) => inv.id === id);

    if (invoiceIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Invoice with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const current = db.invoices[invoiceIndex];
    const { paid, utr, milestoneLocked } = body;

    const updated = {
      ...current,
      ...(paid !== undefined
        ? { paidDate: paid ? new Date().toISOString().slice(0, 10) : undefined }
        : {}),
      ...(utr !== undefined ? { utr: String(utr) } : {}),
      ...(milestoneLocked !== undefined ? { milestoneLocked: Boolean(milestoneLocked) } : {}),
    };

    db.invoices[invoiceIndex] = updated;

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully.',
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Malformed update body' },
      { status: 400 }
    );
  }
}
