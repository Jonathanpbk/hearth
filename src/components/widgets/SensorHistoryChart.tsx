import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface HistoryPoint {
  t: number;
  v: number;
}

interface Props {
  history: HistoryPoint[];
  gradientId: string;
}

export default function SensorHistoryChart({ history, gradientId }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ffc174" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ffc174" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#ffc174"
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
