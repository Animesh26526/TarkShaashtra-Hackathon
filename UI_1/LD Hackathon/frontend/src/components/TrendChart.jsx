import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { transformTrendData } from '../utils/chartUtils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TrendChart = ({ data, period = 'day', isLoading = false }) => {
  const chartData = useMemo(() => transformTrendData(data, period), [data, period]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#1e293b',
        bodyColor: '#64748b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 4,
        cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          label: (context) => `Complaints: ${context.raw}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12
          },
          stepSize: 1,
        }
      }
    }
  };

  if (isLoading || !chartData) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-400">
        <div className="animate-pulse">Loading trend data...</div>
      </div>
    );
  }

  if (chartData.labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
        No complaint data available for this period.
      </div>
    );
  }

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TrendChart;
