import { NextResponse } from 'next/server';

interface ParsedResult {
  clientName: string;
  project: string;
  amount: number;
  dueDate: string;
  deliverables: string[];
  confidence: number;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Text string is required to parse chat context.' },
        { status: 400 }
      );
    }

    const input = text.trim();
    let confidence = 0.5;

    // 1. Extract Amount
    let amount = 0;
    // Look for patterns like "45k", "45,000", "₹50000", "Rs. 25000", "inr 30000"
    const kMatch = input.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand)\b/i);
    const fullNumMatch = input.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d{4,7})\b/i);

    if (kMatch) {
      amount = Math.round(parseFloat(kMatch[1]) * 1000);
      confidence += 0.2;
    } else if (fullNumMatch) {
      amount = parseInt(fullNumMatch[1].replace(/,/g, ''), 10);
      confidence += 0.2;
    }

    // 2. Extract Due Date
    const today = new Date();
    let dueDateIso = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);

    const lower = input.toLowerCase();
    if (lower.includes('tomorrow')) {
      dueDateIso = new Date(today.getTime() + 1 * 86400000).toISOString().slice(0, 10);
      confidence += 0.1;
    } else if (lower.includes('friday')) {
      const day = today.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      dueDateIso = new Date(today.getTime() + diff * 86400000).toISOString().slice(0, 10);
      confidence += 0.1;
    } else if (lower.includes('next week') || lower.includes('7 days')) {
      dueDateIso = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      confidence += 0.1;
    } else if (lower.includes('end of month') || lower.includes('month end')) {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      dueDateIso = endOfMonth.toISOString().slice(0, 10);
      confidence += 0.1;
    }

    // 3. Extract Client Name
    let clientName = 'Client Partner';
    const forMatch = input.match(/(?:for|with|from|client|to)\s+([A-Z][a-zA-Z0-9\s&]{2,25})/);
    const hiMatch = input.match(/(?:hi|hey|hello)\s+([A-Z][a-zA-Z0-9\s]{2,20})/i);

    if (forMatch && forMatch[1]) {
      clientName = forMatch[1].trim().replace(/\b(for|the|an|a)\b/gi, '').trim();
      confidence += 0.1;
    } else if (hiMatch && hiMatch[1]) {
      clientName = hiMatch[1].trim();
      confidence += 0.1;
    }

    // 4. Extract Project Description
    let project = 'Design & Consulting Milestone';
    const projectKeywords = [
      'ui/ux redesign',
      'mobile app',
      'website design',
      'branding',
      'logo',
      'consultation',
      'tuition fees',
      'dental implant',
      'skin treatment',
      'pitch deck',
      'audit',
      'retainer',
    ];

    for (const kw of projectKeywords) {
      if (lower.includes(kw)) {
        project = kw.charAt(0).toUpperCase() + kw.slice(1);
        confidence += 0.1;
        break;
      }
    }

    // 5. Deliverables detection
    const deliverables: string[] = [];
    if (lower.includes('figma')) deliverables.push('Figma_Design_Files.fig');
    if (lower.includes('source') || lower.includes('code')) deliverables.push('Source_Assets_Bundle.zip');
    if (lower.includes('report') || lower.includes('deck') || lower.includes('audit')) deliverables.push('Deliverables_Report.pdf');
    if (deliverables.length === 0) {
      deliverables.push('Final_Work_Milestone_Files.zip');
    }

    const parsed: ParsedResult = {
      clientName,
      project,
      amount: amount > 0 ? amount : 25000,
      dueDate: dueDateIso,
      deliverables,
      confidence: Math.min(confidence, 0.98),
    };

    return NextResponse.json({
      success: true,
      message: 'Parsed raw text with CashPulse AI Chat Parser.',
      rawText: input,
      parsed,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
