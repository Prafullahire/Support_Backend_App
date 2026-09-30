import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  name: string;

  @IsString()
  code: string;
}

export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
