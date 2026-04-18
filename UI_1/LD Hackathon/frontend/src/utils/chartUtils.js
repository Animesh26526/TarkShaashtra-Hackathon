import { format, startOfDay, eachDayOfInterval, subDays, isSameDay, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, eachMonthOfInterval, endOfMonth, isSameWeek, isSameMonth } from 'date-fns';

export const transformTrendData = (complaints, period = 'day') => {
  if (!complaints || !Array.isArray(complaints)) return null;
  if (complaints.length === 0) return { labels: [], datasets: [] };

  const now = new Date();
  let start, end, formatStr, intervalFunc, compareFunc;

  switch (period) {
    case 'month':
      start = startOfMonth(subDays(now, 365)); // Last 12 months
      end = endOfMonth(now);
      formatStr = 'MMM yyyy';
      intervalFunc = eachMonthOfInterval;
      compareFunc = isSameMonth;
      break;
    case 'week':
      start = startOfWeek(subDays(now, 84)); // Last 12 weeks
      end = endOfWeek(now);
      formatStr = 'MMM dd';
      intervalFunc = eachWeekOfInterval;
      compareFunc = isSameWeek;
      break;
    case 'day':
    default:
      start = startOfDay(subDays(now, 6)); // Last 7 days
      end = startOfDay(now);
      formatStr = 'EEE';
      intervalFunc = eachDayOfInterval;
      compareFunc = isSameDay;
      break;
  }

  const interval = intervalFunc({ start, end });
  
  const counts = interval.map(date => {
    const count = complaints.filter(c => {
      try {
        const cDate = parseISO(c.createdAt || c.date);
        return compareFunc(cDate, date);
      } catch (e) {
        return false;
      }
    }).length;

    // Support for [{ date: "2026-04-01", count: 14 }] shape
    const explicitCount = complaints.find(c => {
        if (c.date && !c.createdAt) {
            try {
                return compareFunc(parseISO(c.date), date);
            } catch (e) { return false; }
        }
        return false;
    })?.count || 0;

    return count + explicitCount;
  });

  return {
    labels: interval.map(d => format(d, formatStr)),
    datasets: [
      {
        label: 'Complaints',
        data: counts,
        borderColor: '#1d4ed8',
        backgroundColor: 'rgba(29, 78, 216, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#1d4ed8',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      }
    ]
  };
};
