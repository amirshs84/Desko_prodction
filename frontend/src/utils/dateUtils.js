export const getIranDate = (date = new Date()) => {
  // Get date string in Iran timezone
  const iranDateString = new Date(date).toLocaleString('en-US', {
    timeZone: 'Asia/Tehran',
  });
  return new Date(iranDateString);
};

export const getStartOfDayIran = (date = new Date()) => {
  const iranDate = getIranDate(date);
  iranDate.setHours(0, 0, 0, 0);
  return iranDate;
};

export const isSameDayIran = (date1, date2) => {
  const d1 = getIranDate(date1);
  const d2 = getIranDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const formatRelativeDateIran = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  
  const iranDate = getIranDate(date);
  
  const startOfToday = getStartOfDayIran(now);
  
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (iranDate >= startOfToday) {
    return 'امروز';
  } else if (iranDate >= startOfYesterday) {
    return 'دیروز';
  } else {
    // Calculate difference in calendar days, not just absolute 24-hour periods
    // We compare the start of today with the start of the target day
    const startOfTargetDay = getStartOfDayIran(date);
    const diffTime = Math.abs(startOfToday - startOfTargetDay);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} روز پیش`;
    } else {
      return date.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' });
    }
  }
};
