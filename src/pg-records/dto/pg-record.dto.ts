import { PgStatus } from '../../common/enums';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePgRecordDto {
  @IsString()
  employeeName: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  address: string;

  @IsNumber()
  rentAmount: number;

  @IsDateString()
  agreementStart: string;

  @IsDateString()
  agreementEnd: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  raisedBy?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  fileAttachment?: string;

  @IsOptional()
  @IsNumber()
  reminderDays?: number;
}

export class UpdatePgRecordDto {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  rentAmount?: number;

  @IsOptional()
  @IsDateString()
  agreementStart?: string;

  @IsOptional()
  @IsDateString()
  agreementEnd?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEnum(PgStatus)
  status?: PgStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  raisedBy?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  fileAttachment?: string;

  @IsOptional()
  @IsNumber()
  reminderDays?: number;
}
