import { AttendanceCorrectionType } from '../../common/enums';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAttendanceCorrectionDto {
  @IsString()
  attendanceId: string;

  @IsEnum(AttendanceCorrectionType)
  requestType: AttendanceCorrectionType;

  @IsString()
  @MinLength(3)
  comments: string;
}

export class ReviewAttendanceCorrectionDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
