
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, TooltipProps } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getKpiData, KpiData } from '@/ai/flows/get-kpi-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileWarning, ShieldCheck } from 'lucide-react';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const severityColors = {
  Critical: 'hsl(var(--destructive))',
  High: 'hsl(var(--chart-1))',
  Medium: 'hsl(var(--chart-2))',
  Low: 'hsl(var(--chart-3))',
  Info: 'hsl(var(--chart-4))',
};

const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--secondary))'];
const kevPieColors = ['hsl(var(--destructive))', 'hsl(var(--chart-3))'];


const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-foreground">{data.name}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-muted-foreground">
              Total Vulns
            </span>
            <span className="font-bold text-foreground">{data.total}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-destructive">
              Critical
            </span>
            <span className="font-bold text-destructive">{data.critical}</span>
          </div>
           <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-amber-500">
              High
            </span>
            <span className="font-bold text-amber-500">{data.high}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};


function KpiDashboard() {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await getKpiData();
        setKpiData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching KPI data:", err);
        setError("Failed to load dashboard data. Please check the connection to the backend and DefectDojo.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);


  const severityChartData = useMemo(() => {
    if (!kpiData) return [];
    return [
      { name: 'Critical', count: kpiData.severityCounts.critical, fill: severityColors.Critical },
      { name: 'High', count: kpiData.severityCounts.high, fill: severityColors.High },
      { name: 'Medium', count: kpiData.severityCounts.medium, fill: severityColors.Medium },
      { name: 'Low', count: kpiData.severityCounts.low, fill: severityColors.Low },
      { name: 'Info', count: kpiData.severityCounts.info, fill: severityColors.Info },
    ];
  }, [kpiData]);
  
  const kevChartData = useMemo(() => {
    if (!kpiData) return [];
    return [
      { name: 'KEVs', value: kpiData.kevCounts.kev },
      { name: 'Non-KEVs', value: kpiData.kevCounts.nonKev },
    ];
  }, [kpiData]);

  const openClosedChartData = useMemo(() => {
    if (!kpiData) return [];
    return [
      { name: 'Open', value: kpiData.openVsClosedCounts.open },
      { name: 'Closed', value: kpiData.openVsClosedCounts.closed },
    ];
  }, [kpiData]);

  const topComponentsChartData = useMemo(() => {
    if (!kpiData) return [];
    return kpiData.topRiskiestComponents.slice().reverse();
  }, [kpiData]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-1">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-1">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-2">
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertCircle className="text-destructive" /> Error</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertTitle>Could not load dashboard</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }
  
  if (!kpiData) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Vulnerabilities by Severity</CardTitle>
          <CardDescription>A breakdown of all findings by severity level across all products.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'hsla(var(--accent))' }} 
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle>Open vs. Closed Findings</CardTitle>
          <CardDescription>The ratio of open to closed vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={openClosedChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
              >
                {openClosedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                }}
              />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
       <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="text-destructive"/>
            KEV Overview
          </CardTitle>
          <CardDescription>Known Exploited Vulnerabilities vs. others.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={kevChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
              >
                {kevChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={kevPieColors[index % kevPieColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                }}
              />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
       <Card className="col-span-full lg:col-span-2">
        <CardHeader>
            <CardTitle>Top 5 Riskiest Components</CardTitle>
            <CardDescription>Components with the most Critical and High vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topComponentsChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={150} />
                    <Tooltip 
                        cursor={{ fill: 'hsla(var(--accent))' }} 
                        content={<CustomTooltip />}
                    />
                    <Legend />
                    <Bar dataKey="critical" stackId="a" fill={severityColors.Critical} name="Critical" radius={[4, 0, 0, 4]} />
                    <Bar dataKey="high" stackId="a" fill={severityColors.High} name="High" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default KpiDashboard;
