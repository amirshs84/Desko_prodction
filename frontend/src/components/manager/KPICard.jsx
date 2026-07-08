export default function KPICard({ title, value, subtitle, icon: Icon, trend, colorClass = 'from-emerald-600/90 to-teal-700/90' }) {
  return (
    <div className={`relative rounded-2xl p-6 backdrop-blur-xl bg-gradient-to-br ${colorClass} 
                    shadow-2xl border border-white/10 hover:border-white/20 
                    transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/20
                    group overflow-hidden`}>
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/70 text-xs font-medium mb-3 tracking-wider uppercase">{title}</p>
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-white text-4xl font-black tracking-tight">{value}</p>
          </div>
          {subtitle && (
            <p className="text-white/60 text-sm font-medium">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold
                ${trend > 0 ? 'bg-green-500/20 text-green-200 shadow-green-500/20' : 
                  trend < 0 ? 'bg-red-500/20 text-red-200 shadow-red-500/20' : 
                  'bg-gray-500/20 text-gray-200 shadow-gray-500/20'} shadow-lg backdrop-blur-sm`}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="relative">
            <div className="absolute -inset-2 bg-white/10 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <Icon className="relative text-5xl text-white/90 group-hover:text-white transition-colors drop-shadow-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
