import { HiTrendingUp, HiTrendingDown, HiMinus } from 'react-icons/hi';

export default function TrendIndicator({ trend, percent }) {
  if (trend === 'stable') {
    return (
      <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
        <HiMinus className="text-sm" />
      </span>
    );
  }
  
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs">
        <HiTrendingUp className="text-base" />
        {percent > 0 && `${percent.toFixed(0)}%`}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
      <HiTrendingDown className="text-base" />
      {percent < 0 && `${Math.abs(percent).toFixed(0)}%`}
    </span>
  );
}
