import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBrochureStockDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

export class UpdateBrochureStockDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

export class IssueBrochureDto {
  @IsString()
  stockId: string;

  @IsString()
  userId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
