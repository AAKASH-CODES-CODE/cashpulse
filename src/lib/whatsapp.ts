import { formatDate, formatINR } from './money';

export type Tone = 'friendly' | 'firm' | 'urgent';

export function toneForInvoice(daysLate: number): Tone {
  if (daysLate <= 0) return 'friendly';
  if (daysLate <= 14) return 'firm';
  return 'urgent';
}

export interface ReminderInput {
  tone: Tone;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  upiId: string;
  paymentLink: string;
  senderName: string;
}

export function buildReminderMessage({
  tone,
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  upiId,
  paymentLink,
  senderName,
}: ReminderInput): string {
  const amountText = formatINR(amount);
  const due = formatDate(dueDate);
  const payment = `Pay via UPI: ${upiId}\nOr use this link: ${paymentLink}`;

  if (tone === 'friendly') {
    return (
      `Hi ${clientName}, hope you're doing well! A friendly reminder that invoice ${invoiceNumber} ` +
      `for ${amountText} is due on ${due}.\n${payment}\n\nThanks so much!\n${senderName}`
    );
  }
  if (tone === 'firm') {
    return (
      `Hi ${clientName}, invoice ${invoiceNumber} for ${amountText} was due on ${due} and is now past due. ` +
      `Please arrange payment at the earliest.\n${payment}\n\nRegards,\n${senderName}`
    );
  }
  return (
    `Hi ${clientName}, this is an urgent follow-up: invoice ${invoiceNumber} for ${amountText} ` +
    `was due on ${due} and remains unpaid. Please settle it within 48 hours to avoid disruption ` +
    `to ongoing work.\n${payment}\n\nRegards,\n${senderName}`
  );
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const stripped = phone.replace(/\D/g, '');
  const digits = stripped.length === 10 ? `91${stripped}` : stripped;
  const base = digits.length > 0 ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
