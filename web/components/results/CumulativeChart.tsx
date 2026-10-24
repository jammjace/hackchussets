"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMg, formatTime } from "@/lib/format";
import type { TimelineRow } from "@/lib/types";

type CumulativeChartProps = {
  timeline: TimelineRow[];
  dailyLimitMg: number;
};

const chartConfig = {
  cumulative_mg: {
    label: "Running total",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type Point = {
  timestamp: number;
  cumulative_mg: number;
  ingredient: string;
};

/**
 * Section 9.7 item 5. Step-style area chart of cumulative sodium against time,
 * a dot at each event, and a reference line at the daily limit labelled
 * "Daily limit". Tooltip shows the ingredient and the running total.
 */
export function CumulativeChart({
  timeline,
  dailyLimitMg,
}: CumulativeChartProps) {
  if (timeline.length === 0) {
    return null;
  }

  // Start the line at the origin so the first step reads from zero.
  const data: Point[] = [
    { timestamp: 0, cumulative_mg: 0, ingredient: "Start" },
    ...timeline.map((row) => ({
      timestamp: row.timestamp,
      cumulative_mg: row.cumulative_mg,
      ingredient: row.product_name ?? row.ingredient,
    })),
  ];

  const maxCumulative = data.reduce(
    (max, p) => Math.max(max, p.cumulative_mg),
    0,
  );
  const yMax = Math.max(maxCumulative, dailyLimitMg) * 1.1;

  return (
    <ChartContainer config={chartConfig} className="aspect-[16/7] w-full">
      <AreaChart
        data={data}
        margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={[0, "dataMax"]}
          tickFormatter={(v: number) => formatTime(v)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, yMax]}
          tickFormatter={(v: number) => `${Math.round(v / 1000 * 10) / 10}k`}
          tickLine={false}
          axisLine={false}
          width={40}
          tickMargin={4}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={<CumulativeTooltip />}
        />
        <defs>
          <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-cumulative_mg)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-cumulative_mg)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <Area
          dataKey="cumulative_mg"
          type="stepAfter"
          stroke="var(--color-cumulative_mg)"
          strokeWidth={2}
          fill="url(#fillCumulative)"
          dot={{ r: 3, fill: "var(--color-cumulative_mg)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
        <ReferenceLine
          y={dailyLimitMg}
          stroke="var(--chilli)"
          strokeDasharray="4 4"
          label={{
            value: "Daily limit",
            position: "insideTopRight",
            fill: "var(--chilli)",
            fontSize: 12,
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function CumulativeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;
  if (point.ingredient === "Start") {
    return null;
  }
  return (
    <div className="grid min-w-32 gap-1 rounded-xl border-2 border-ink bg-paper px-3 py-2 text-xs shadow-[var(--shadow-float)]">
      <span className="font-ui font-semibold capitalize">{point.ingredient}</span>
      <span className="text-ink-soft">at {formatTime(point.timestamp)}</span>
      <span className="font-timestamp font-medium tabular-nums">
        {formatMg(point.cumulative_mg)} total
      </span>
    </div>
  );
}
