import { contractorDeferral } from '../../lib/intelligence';
import type { Expense } from '../../lib/types';

export interface ContractorDeferralProps {
  expenses: Expense[];
}

const DEFERRAL_DAYS = [5, 6, 7] as const;
const MAX_DISPLAY_DAY = 28;

export function ContractorDeferral({ expenses }: ContractorDeferralProps) {
  const contractors = expenses.filter((e) => e.kind === 'contractor');

  return (
    <section
      aria-labelledby="contractor-deferral-title"
      className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-zinc-100 shadow-xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-xl md:p-6"
    >
      <h2 id="contractor-deferral-title" className="text-lg font-semibold text-zinc-50">
        Contractor payout deferral
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Preview recurring contractor payouts moved later by 5, 6 or 7 days. Nothing is changed.
      </p>

      {contractors.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/5 bg-zinc-950/50 p-4 text-sm text-zinc-400">
          Tag a bill as contractor to see deferral options.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-zinc-500">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Bill
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Due day
                </th>
                {DEFERRAL_DAYS.map((days) => (
                  <th key={days} scope="col" className="py-2 pr-3 font-medium">
                    +{days} days
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractors.map((expense) => (
                <tr key={expense.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-3 text-zinc-200">{expense.name}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-zinc-400">{expense.dueDay}</td>
                  {DEFERRAL_DAYS.map((days) => (
                    <td key={days} className="py-2.5 pr-3 tabular-nums text-zinc-200">
                      {contractorDeferral([expense], days).map((proj) => {
                        const shown = Math.min(proj.newDay, MAX_DISPLAY_DAY);
                        return (
                          <span key={`${expense.id}-${days}`}>
                            Day {shown}
                            {proj.newDay > MAX_DISPLAY_DAY && (
                              <span className="ml-1 text-[11px] text-amber-300">(capped at 28 for display)</span>
                            )}
                          </span>
                        );
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
