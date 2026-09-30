/**
 * Haversine distance between two GPS coordinates in meters.
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function isWithinRadius(
  currentLat: number,
  currentLon: number,
  officeLat: number,
  officeLon: number,
  allowedRadiusMeters: number,
): { allowed: boolean; distanceMeters: number } {
  const distanceMeters = getDistanceInMeters(currentLat, currentLon, officeLat, officeLon);
  return {
    allowed: distanceMeters <= allowedRadiusMeters,
    distanceMeters: Math.round(distanceMeters * 100) / 100,
  };
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calendar date at UTC midnight for the given local day.
 * Keeps Prisma/MySQL @db.Date lookups consistent across timezones.
 */
export function getStartOfDay(date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day));
}

export function getEndOfDay(date = new Date()): Date {
  const start = getStartOfDay(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

export function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getAttendancePeriodRange(
  period: 'today' | 'yesterday' | 'week' | 'month',
): { gte: Date; lt: Date } {
  const todayStart = getStartOfDay();
  const tomorrowStart = getEndOfDay();

  if (period === 'today') {
    return { gte: todayStart, lt: tomorrowStart };
  }

  if (period === 'yesterday') {
    const yesterdayStart = addCalendarDays(todayStart, -1);
    return { gte: yesterdayStart, lt: todayStart };
  }

  if (period === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { gte: getStartOfDay(weekAgo), lt: tomorrowStart };
  }

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return { gte: getStartOfDay(monthAgo), lt: tomorrowStart };
}

export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function getCustomDateRange(
  startDate?: string,
  endDate?: string,
): { gte?: Date; lt?: Date } | undefined {
  if (!startDate && !endDate) return undefined;

  let start = startDate ? parseDateInput(startDate) : null;
  let end = endDate ? parseDateInput(endDate) : null;

  if (start && end && start > end) {
    const swappedStart = end;
    end = start;
    start = swappedStart;
  }

  const range: { gte?: Date; lt?: Date } = {};
  if (start) range.gte = getStartOfDay(start);
  if (end) range.lt = getEndOfDay(end);
  return Object.keys(range).length ? range : undefined;
}
export function calculateWorkingDurationMinutes(loginTime: Date, logoutTime: Date): number {
  const diffMs = logoutTime.getTime() - loginTime.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

/** Standard full working day = 9 hours */
export const FULL_DAY_MINUTES = 9 * 60;
/** Early leave = left ~2 hours before full day (worked at least 7 hours) */
export const EARLY_LEAVE_MIN_MINUTES = 7 * 60;
/** Half day = worked at least 4.5 hours */
export const HALF_DAY_MIN_MINUTES = 4.5 * 60;
/** Office shift starts at 9:00 AM local time */
export const SHIFT_START_HOUR = 9;
export const SHIFT_START_MINUTE = 0;
export const LATE_GRACE_MINUTES = 0;

export type AttendanceDayStatus =
  | 'FULL_DAY'
  | 'EARLY_LEAVE'
  | 'HALF_DAY'
  | 'INCOMPLETE';

export function resolveAttendanceStatusFromDuration(minutes: number): AttendanceDayStatus {
  if (minutes >= FULL_DAY_MINUTES) return 'FULL_DAY';
  if (minutes >= EARLY_LEAVE_MIN_MINUTES) return 'EARLY_LEAVE';
  if (minutes >= HALF_DAY_MIN_MINUTES) return 'HALF_DAY';
  return 'INCOMPLETE';
}

export function isLateCheckIn(loginTime: Date): boolean {
  const shiftStart = new Date(loginTime);
  shiftStart.setHours(SHIFT_START_HOUR, SHIFT_START_MINUTE + LATE_GRACE_MINUTES, 0, 0);
  return loginTime.getTime() > shiftStart.getTime();
}

export function getTotalWorkingMinutes(
  attendance: {
    loginTime: Date | null;
    workingDurationMinutes: number | null;
    isSessionActive: boolean;
  },
  now = new Date(),
): number {
  const accumulated = attendance.workingDurationMinutes ?? 0;
  if (attendance.isSessionActive && attendance.loginTime) {
    return accumulated + calculateWorkingDurationMinutes(attendance.loginTime, now);
  }
  return accumulated;
}

export function isAttendanceDayComplete(
  attendance: {
    logoutTime: Date | null;
    workingDurationMinutes: number | null;
    isSessionActive: boolean;
  },
): boolean {
  return Boolean(
    !attendance.isSessionActive &&
      attendance.logoutTime &&
      (attendance.workingDurationMinutes ?? 0) >= FULL_DAY_MINUTES,
  );
}

export function canResumeAttendanceToday(
  attendance: {
    logoutTime: Date | null;
    workingDurationMinutes: number | null;
    isSessionActive: boolean;
  },
): boolean {
  return Boolean(
    !attendance.isSessionActive &&
      attendance.logoutTime &&
      (attendance.workingDurationMinutes ?? 0) < FULL_DAY_MINUTES,
  );
}

export function isEarlyLeaveLogout(
  loginTime: Date,
  logoutTime: Date,
  accumulatedMinutes = 0,
): boolean {
  return (
    accumulatedMinutes + calculateWorkingDurationMinutes(loginTime, logoutTime) <
    FULL_DAY_MINUTES
  );
}

export function formatAttendanceStatusLabel(status: string, isLate = false): string {
  const base = getAttendanceStatusLabel(status);
  if (!isLate) return base;
  if (status === 'INCOMPLETE') return 'Late';
  return `${base} · Late`;
}

export function getAttendanceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    FULL_DAY: 'Full Day',
    HALF_DAY: 'Half Day',
    EARLY_LEAVE: 'Early Leave',
    PRESENT: 'Full Day',
    INCOMPLETE: 'Incomplete',
    ABSENT: 'Absent',
    LATE: 'Late',
    PARTIAL: 'Partial',
    REJECTED_LOCATION: 'Rejected Location',
    HOLIDAY: 'Holiday',
  };
  return labels[status] || status.replace(/_/g, ' ');
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}
