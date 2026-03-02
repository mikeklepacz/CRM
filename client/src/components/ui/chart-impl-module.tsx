"use client";

import * as RechartsPrimitive from "recharts";
import { ChartContainer } from "@/components/ui/chart/container";
import { ChartLegendContent } from "@/components/ui/chart/legend-content";
import { ChartStyle } from "@/components/ui/chart/style";
import { ChartTooltipContent } from "@/components/ui/chart/tooltip-content";

export type { ChartConfig } from "@/components/ui/chart/types";

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

export { ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent };
