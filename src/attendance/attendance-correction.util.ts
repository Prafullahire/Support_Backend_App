import {
  AttendanceCorrectionType,
  AttendanceStatus,
} from '../common/enums';

export const ATTENDANCE_CORRECTION_TYPE_LABELS: Record<AttendanceCorrectionType, string> = {
  PRESENT_FULL_DAY: 'Present (Full Day)',
  PRESENT_FULL_DAY_NOT_COMPLETED_9H: 'Present (Full Day - Not Completed 9 hrs)',
  PRESENT_HALF_DAY: 'Present (Half Day)',
  ABSENT_INFORMED_SENIOR: 'Absent (Informed Senior)',
  HOLIDAY: 'Holiday',
};

export function getAttendanceCorrectionTypeLabel(type: AttendanceCorrectionType | string): string {
  return (ATTENDANCE_CORRECTION_TYPE_LABELS as Record<string, string>)[type] ?? (type ? String(type).replace(/_/g, ' ') : '—');
}

export function mapCorrectionTypeToAttendanceStatus(
  type: AttendanceCorrectionType | string,
): AttendanceStatus {
  switch (type) {
    case AttendanceCorrectionType.PRESENT_FULL_DAY:
      return AttendanceStatus.FULL_DAY;
    case AttendanceCorrectionType.PRESENT_FULL_DAY_NOT_COMPLETED_9H:
      return AttendanceStatus.EARLY_LEAVE;
    case AttendanceCorrectionType.PRESENT_HALF_DAY:
      return AttendanceStatus.HALF_DAY;
    case AttendanceCorrectionType.ABSENT_INFORMED_SENIOR:
      return AttendanceStatus.ABSENT;
    case AttendanceCorrectionType.HOLIDAY:
      return AttendanceStatus.HOLIDAY;
    default:
      return AttendanceStatus.INCOMPLETE;
  }
}
