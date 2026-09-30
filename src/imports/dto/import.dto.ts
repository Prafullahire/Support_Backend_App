import { IsOptional, IsString } from 'class-validator';

export class ImportFileDto {
  @IsString()
  module: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
