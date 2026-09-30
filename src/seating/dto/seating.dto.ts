import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSeatingRecordDto {
  @IsString()
  branchId: string;

  @IsString()
  floor: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsInt()
  @Min(0)
  totalSeats: number;

  @IsInt()
  @Min(0)
  occupiedSeats: number;

  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSeatingRecordDto {
  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSeats?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  occupiedSeats?: number;

  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
