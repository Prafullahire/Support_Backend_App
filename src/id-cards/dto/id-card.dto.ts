import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateIdCardDto {
  @IsString()
  cardNumber: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  receivedDate?: string;
}

export class UpdateIdCardDto {
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  receivedDate?: string;
}

export class AssignIdCardDto {
  @IsString()
  assignedToId: string;
}
