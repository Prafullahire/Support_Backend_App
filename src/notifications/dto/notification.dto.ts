import { NotificationType } from '../../common/enums';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  link?: string;
}

export class MarkReadDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
