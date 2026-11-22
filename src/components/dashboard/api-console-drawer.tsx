'use client';

import { useState } from 'react';
import { Terminal, Play, X, Check, Copy, RefreshCw, Send, Database } from 'lucide-react';

interface ApiConsoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type EndpointKey = 'health' | 'listInvoices' | 'webhookUpi' | 'parseChat';

export function ApiConsoleDrawer({ isOpen, onClose }: ApiConsoleDrawerProps) {
  const [activeTab, setActiveTab] = useState<EndpointKey>('health');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Inputs for testing
  const [webhookInvoiceId, setWebhookInvoiceId] = useState('inv_002');
  const [webhookUtr, setWebhookUtr] = useState('UPI20261122889912');
  const [webhookAmount, setWebhookAmount] = useState('45000');
  const [chatPrompt, setChatPrompt] = useState(
    'Hi Aakash, please send invoice for TechCorp mobile redesign for 45k due Friday with figma source code'
  );

  if (!isOpen) return null;

  const runRequest = async () => {
    setLoading(true);
    setResponse(null);
    setStatusCode(null);

    try {
      let res: Response;

      if (activeTab === 'health') {
        res = await fetch('/api/health');
      } else if (activeTab === 'listInvoices') {
        res = await fetch('/api/invoices?persona=designer&status=all');
      } else if (activeTab === 'webhookUpi') {
        res = await fetch('/api/webhooks/upi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: webhookInvoiceId,
            utr: webhookUtr,
            amount: parseFloat(webhookAmount) || 45000,
            paymentMode: 'UPI',
          }),
        });
      } else {
        // parseChat
        res = await fetch('/api/ai/parse-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chatPrompt }),
        });
      }

      setStatusCode(res.status);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setStatusCode(500);
      setResponse(JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-emerald-400 dark:bg-slate-800">
              <Terminal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                CashPulse Developer API Console
              </h2>
              <p className="text-[11px] text-slate-500">Live Serverless Route & UPI Webhook Inspector</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 px-3 pt-2 gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('health');
              setResponse(null);
            }}
            className={`rounded-t-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
              activeTab === 'health'
                ? 'bg-white dark:bg-slate-900 border-t border-x border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            GET /api/health
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('listInvoices');
              setResponse(null);
            }}
            className={`rounded-t-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
              activeTab === 'listInvoices'
                ? 'bg-white dark:bg-slate-900 border-t border-x border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            GET /api/invoices
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('webhookUpi');
              setResponse(null);
            }}
            className={`rounded-t-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
              activeTab === 'webhookUpi'
                ? 'bg-white dark:bg-slate-900 border-t border-x border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            POST /api/webhooks/upi
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('parseChat');
              setResponse(null);
            }}
            className={`rounded-t-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
              activeTab === 'parseChat'
                ? 'bg-white dark:bg-slate-900 border-t border-x border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            POST /api/ai/parse-chat
          </button>
        </div>

        {/* Request Config Area */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
          {activeTab === 'health' && (
            <p className="text-slate-600 dark:text-slate-400">
              Pings the CashPulse serverless cluster, returning microservice status, active capabilities, and uptime.
            </p>
          )}

          {activeTab === 'listInvoices' && (
            <p className="text-slate-600 dark:text-slate-400">
              Retrieves the live invoice ledger filtered by persona (<code className="rounded bg-slate-200 dark:bg-slate-800 px-1">designer</code>) and status.
            </p>
          )}

          {activeTab === 'webhookUpi' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice ID</label>
                  <input
                    type="text"
                    value={webhookInvoiceId}
                    onChange={(e) => setWebhookInvoiceId(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Bank UTR</label>
                  <input
                    type="text"
                    value={webhookUtr}
                    onChange={(e) => setWebhookUtr(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (INR)</label>
                  <input
                    type="number"
                    value={webhookAmount}
                    onChange={(e) => setWebhookAmount(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parseChat' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Sample WhatsApp / Telegram Message</label>
              <textarea
                rows={2}
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">Live Serverless Route</span>
            <button
              type="button"
              disabled={loading}
              onClick={runRequest}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Response Display */}
        <div className="flex-1 flex flex-col p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span>RESPONSE PAYLOAD</span>
              {statusCode && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    statusCode < 300
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {statusCode} {statusCode === 200 ? 'OK' : statusCode === 201 ? 'CREATED' : 'STATUS'}
                </span>
              )}
            </div>

            {response && (
              <button
                type="button"
                onClick={copyResponse}
                className="flex items-center gap-1 hover:text-white cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto rounded bg-slate-900/90 p-3 leading-relaxed">
            {response ? (
              <pre>{response}</pre>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-500 text-center">
                <Terminal className="h-8 w-8 mb-2 opacity-40" />
                <span>Click &quot;Send Request&quot; above to inspect the live response.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
