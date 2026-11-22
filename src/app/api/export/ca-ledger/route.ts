import { NextResponse } from 'next/server';
import { getServerDB } from '@/lib/server-db';

export async function GET() {
  try {
    const db = getServerDB();
    const invoices = db.invoices;
    const clientMap = new Map(db.clients.map((c) => [c.id, c.name]));

    const headers = [
      'Invoice Number',
      'Client Name',
      'Project Scope',
      'Base Amount (INR)',
      'GST Rate (%)',
      'GST Amount (INR)',
      'Total Invoice Value (INR)',
      'Issue Date',
      'Due Date',
      'Status',
      'Settled Date',
      'Bank UTR Number',
    ];

    const today = new Date().toISOString().slice(0, 10);
    const rows = invoices.map((inv) => {
      const clientName = clientMap.get(inv.clientId) || 'Unknown Client';
      const gstRate = inv.gstRate ?? 18;
      const baseAmount = Math.round(inv.amount / (1 + gstRate / 100));
      const gstAmount = inv.amount - baseAmount;
      const status = inv.paidDate ? 'PAID' : inv.dueDate < today ? 'OVERDUE' : 'PENDING';
      const cleanProject = `"${(inv.project || '').replace(/"/g, '""')}"`;
      const cleanClient = `"${clientName.replace(/"/g, '""')}"`;

      return [
        inv.number,
        cleanClient,
        cleanProject,
        baseAmount,
        `${gstRate}%`,
        gstAmount,
        inv.amount,
        inv.issueDate,
        inv.dueDate,
        status,
        inv.paidDate || 'N/A',
        inv.utr || 'N/A',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cashpulse-ca-ledger-${today}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'CSV generation failed' },
      { status: 500 }
    );
  }
}
