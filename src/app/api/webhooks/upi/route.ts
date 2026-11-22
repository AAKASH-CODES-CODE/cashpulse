import { NextResponse } from 'next/server';
import { getServerDB } from '@/lib/server-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId, utr, amount, paymentMode = 'UPI' } = body;

    if (!invoiceId || !utr || typeof amount !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required webhook parameters: invoiceId, utr, and amount are required.',
        },
        { status: 400 }
      );
    }

    const cleanUtr = String(utr).trim().toUpperCase();
    if (cleanUtr.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Bank UTR format. Expected valid 8-16 digit bank reference number.',
        },
        { status: 422 }
      );
    }

    const db = getServerDB();
    const invoice = db.invoices.find((inv) => inv.id === invoiceId);

    if (!invoice) {
      db.webhooksLogged.push({
        id: `wh_${Date.now()}`,
        invoiceId,
        utr: cleanUtr,
        amount,
        timestamp: new Date().toISOString(),
        status: 'failed',
      });

      return NextResponse.json(
        {
          success: false,
          error: `Invoice ID '${invoiceId}' was not found in the ledger.`,
        },
        { status: 404 }
      );
    }

    // Verify amount match (with small tolerance for fractional rounding)
    if (Math.abs(invoice.amount - amount) > 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount mismatch: received ₹${amount.toLocaleString('en-IN')}, expected ₹${invoice.amount.toLocaleString('en-IN')}.`,
        },
        { status: 400 }
      );
    }

    // Mark as paid & unlock milestone deliverables
    const today = new Date().toISOString().slice(0, 10);
    invoice.paidDate = today;
    invoice.utr = cleanUtr;
    invoice.milestoneLocked = false;

    db.webhooksLogged.push({
      id: `wh_${Date.now()}`,
      invoiceId,
      utr: cleanUtr,
      amount,
      timestamp: new Date().toISOString(),
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'UPI payment verified & recorded. Milestone deliverables unlocked.',
      timestamp: new Date().toISOString(),
      paymentDetails: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        utr: cleanUtr,
        amountReceived: amount,
        paymentMode,
        status: 'PAID',
      },
      deliverablesUnlocked: invoice.deliverables || [
        'Master_Design_Tokens.fig',
        'Final_Deliverables_Pack.zip',
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const db = getServerDB();
  return NextResponse.json({
    service: 'CashPulse UPI Webhook Gateway',
    status: 'ACTIVE',
    supportedGateways: ['NPCI UPI 2.0', 'PhonePe PG', 'Google Pay for Business', 'Razorpay Webhook', 'Paytm QR'],
    recentEvents: db.webhooksLogged.slice(-10),
  });
}
