import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOfficeBoyStaffDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  officeLocationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOfficeBoyStaffDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  officeLocationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
