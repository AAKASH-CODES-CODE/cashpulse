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
      className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl md:p-6"
    >
      <h2 id="contractor-deferral-title" className="text-lg font-semibold text-slate-900">
        Contractor payout deferral
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Preview recurring contractor payouts moved later by 5, 6 or 7 days. Nothing is changed.
      </p>

      {contractors.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Tag a bill as contractor to see deferral options.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
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
                <tr key={expense.id} className="border-b border-slate-200 last:border-0">
                  <td className="py-2.5 pr-3 text-slate-900">{expense.name}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-600">{expense.dueDay}</td>
                  {DEFERRAL_DAYS.map((days) => (
                    <td key={days} className="py-2.5 pr-3 tabular-nums text-slate-900">
                      {contractorDeferral([expense], days).map((proj) => {
                        const shown = Math.min(proj.newDay, MAX_DISPLAY_DAY);
                        return (
                          <span key={`${expense.id}-${days}`}>
                            Day {shown}
                            {proj.newDay > MAX_DISPLAY_DAY && (
                              <span className="ml-1 text-[11px] text-amber-800">(capped at 28 for display)</span>
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
