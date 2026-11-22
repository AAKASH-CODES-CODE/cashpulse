import { NextResponse } from 'next/server';

export async function GET() {
  const uptimeSeconds = process.uptime();
  return NextResponse.json({
    status: 'healthy',
    service: 'CashPulse Core API & Financial Engine',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptimeSeconds),
    environment: process.env.NODE_ENV || 'production',
    endpoints: {
      health: { method: 'GET', path: '/api/health', description: 'System health & capabilities' },
      invoices: {
        list: { method: 'GET', path: '/api/invoices?persona=designer|tutor|clinic&status=all|pending|overdue|paid' },
        create: { method: 'POST', path: '/api/invoices', body: '{ clientId, project, amount, issueDate, dueDate, deliverables }' },
        getOne: { method: 'GET', path: '/api/invoices/:id' },
        update: { method: 'PATCH', path: '/api/invoices/:id', body: '{ paid: boolean, utr?: string, milestoneLocked?: boolean }' },
      },
      webhooks: {
        upi: { method: 'POST', path: '/api/webhooks/upi', body: '{ invoiceId, utr, amount, paymentMode: "UPI" }' },
      },
      ai: {
        parseChat: { method: 'POST', path: '/api/ai/parse-chat', body: '{ text: string }' },
      },
      export: {
        caLedger: { method: 'GET', path: '/api/export/ca-ledger', description: 'Streamable CSV for Tax CA' },
      },
    },
    capabilities: [
      'REST Invoices API (v2)',
      'UPI Webhook Verification Engine',
      'NLP WhatsApp Chat Parser',
      'CA Audit Ledger Streaming',
      'Multi-Persona Financial Projections (Designer / Tutor / Clinic)',
    ],
  });
}
