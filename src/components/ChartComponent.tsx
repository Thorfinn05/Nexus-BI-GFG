import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, Brush, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface ChartProps {
  type: string;
  data: any[];
}

// const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981'];
const COLORS = [
  '#4f46e5', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald Green
  '#f59e0b', // Amber/Yellow
  '#3b82f6', // Light Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#14b8a6'  // Teal
];

export function ChartComponent({ type, data }: ChartProps) {
  const [hiddenSeries, setHiddenSeries] = React.useState<string[]>([]);

  // Try to determine keys automatically
  const keys = useMemo(() => {
    if (!data || data.length === 0) return { nameKey: '', valueKeys: [] };
    const sample = data[0];
    const allKeys = Object.keys(sample);
    // Guess string key for X axis, defaults to first key
    const nameKey = allKeys.find(k => typeof sample[k] === 'string') || allKeys[0];
    const valueKeys = allKeys.filter(k => typeof sample[k] === 'number' && k !== nameKey);
    return { nameKey, valueKeys: valueKeys.length ? valueKeys : [allKeys.find(k => k !== nameKey) || allKeys[0]] };
  }, [data]);

  const toggleSeries = (item: any) => {
    const { dataKey } = item;
    setHiddenSeries(prev => 
      prev.includes(dataKey) 
        ? prev.filter(k => k !== dataKey) 
        : [...prev, dataKey]
    );
  };

  if (!data || data.length === 0) return <div>No data to display</div>;

  const { nameKey, valueKeys } = keys;

  if (type === 'line' || type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey={nameKey} 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => typeof value === 'number' && value > 1000 ? `${(value/1000).toFixed(1)}k` : value}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend 
            onClick={toggleSeries} 
            iconType="circle" 
            wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', paddingTop: '10px' }} 
          />
          {valueKeys.map((vk, i) => (
             <Line 
               key={vk}
               type="monotone" 
               dataKey={vk} 
               stroke={COLORS[i % COLORS.length]} 
               strokeWidth={3} 
               dot={{ r: 4, fill: COLORS[i % COLORS.length], strokeWidth: 2, stroke: '#0f1117' }} 
               activeDot={{ r: 6 }} 
               name={vk}
               hide={hiddenSeries.includes(vk)}
             />
          ))}
          <Brush 
            dataKey={nameKey} 
            height={30} 
            stroke="#4f46e5" 
            fill="#0f1117"
            travellerWidth={10}
            className="custom-brush"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey={valueKeys[0]}
            nameKey={nameKey}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            type="number"
            dataKey={valueKeys[0] || nameKey} 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} 
            tickLine={false}
            axisLine={false}
            name={valueKeys[0] || nameKey}
            label={{ value: valueKeys[0] || nameKey, position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          />
          <YAxis 
            type="number"
            dataKey={valueKeys[1] || valueKeys[0]} 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            name={valueKeys[1] || valueKeys[0]}
            label={{ value: valueKeys[1] || valueKeys[0], angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          />
          <ZAxis type="number" range={[64, 144]} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: '#0f1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', paddingTop: '10px' }} />
          <Scatter name={`${valueKeys[0]} vs ${valueKeys[1] || valueKeys[0]}`} data={data} fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // fallback to bar
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis 
          dataKey={nameKey} 
          stroke="rgba(255,255,255,0.2)" 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} 
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis 
          stroke="rgba(255,255,255,0.2)" 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} 
          tickLine={false}
          axisLine={false}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#0f1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Legend 
          onClick={toggleSeries} 
          iconType="circle" 
          wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', paddingTop: '10px' }} 
        />
        {valueKeys.map((vk, i) => (
          <Bar 
            key={vk} 
            dataKey={vk} 
            stackId="a" 
            fill={COLORS[i % COLORS.length]} 
            barSize={32}
            hide={hiddenSeries.includes(vk)}
          />
        ))}
        <Brush 
          dataKey={nameKey} 
          height={30} 
          stroke="#4f46e5" 
          fill="#0f1117"
          travellerWidth={10}
          className="custom-brush"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
