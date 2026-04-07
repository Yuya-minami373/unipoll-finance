interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  gradient: string;
  badge?: { text: string; color: string };
}

export default function KPICard({ title, value, subtitle, gradient, badge }: KPICardProps) {
  return (
    <div className={`card p-5 ${gradient}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {badge && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-slate-900 mt-2 animate-count">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
