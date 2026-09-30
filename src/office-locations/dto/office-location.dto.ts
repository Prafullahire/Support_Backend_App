import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOfficeLocationDto {
  @IsString()
  name: string;

  @IsString()
  branchId: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  allowedRadiusMeters?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOfficeLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  allowedRadiusMeters?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
