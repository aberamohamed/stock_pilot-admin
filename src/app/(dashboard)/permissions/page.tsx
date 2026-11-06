'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function PermissionsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['permissions'], queryFn: api.getPermissions });
  if (isLoading) return <p className="text-slate-400">Loading…</p>;
  if (error || !data) return <p className="text-red-400">{(error as Error | null)?.message ?? 'Could not load permissions'}</p>;

  const groups = [...new Set(data.permissions.map((p) => p.group))];
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-slate-400">
        This is the list the server checks and the mobile app shows as checkboxes. Each business owner can change what their roles get; the ticks
        below are the starting point for every new business. Super Admin always has everything.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr>
              <th className="p-2">Permission</th>
              {data.roles.map((r) => (
                <th key={r.key} className="p-2 text-center" title={r.description}>{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <FragmentRows key={group} group={group} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  function FragmentRows({ group }: { group: string }) {
    return (
      <>
        <tr className="bg-slate-900"><td className="p-2 text-xs font-bold uppercase tracking-wider text-indigo-300" colSpan={data!.roles.length + 1}>{group}</td></tr>
        {data!.permissions.filter((p) => p.group === group).map((p) => (
          <tr key={p.key} className="border-t border-slate-800 text-slate-200">
            <td className="p-2">
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-slate-500">{p.description} <span className="font-mono text-slate-600">{p.key}</span></div>
            </td>
            {data!.roles.map((r) => (
              <td key={r.key} className="p-2 text-center">{r.defaults.includes(p.key) ? <span className="text-emerald-400">●</span> : <span className="text-slate-700">–</span>}</td>
            ))}
          </tr>
        ))}
      </>
    );
  }
}
