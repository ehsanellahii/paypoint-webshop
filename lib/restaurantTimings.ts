function getTodayTimings(timings: any): { open: string; close: string } {
  if (!timings) return { open: '00:00', close: '00:00' };
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Get the current day of the week
  const todayIndex = new Date().getDay();
  const today = daysOfWeek[todayIndex];

  // Get the timings for today
  const todayTimings = timings[today];

  return todayTimings ? { open: todayTimings.open, close: todayTimings.close } : { open: '00:00', close: '00:00' };
}

const isRestaurantOpen = (timings: { [x: string]: any }) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const now = new Date();
  const currentDay = days[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // Format: HH:mm

  const todayTimings = timings[currentDay];

  if (!todayTimings) return false; // If no timings are set for the current day, assume closed.

  const { open, close } = todayTimings;

  // Handle cases where closing time is past midnight
  if (close < open) {
    return currentTime >= open || currentTime < close;
  }

  return currentTime >= open && currentTime < close;
};

export { getTodayTimings, isRestaurantOpen };
