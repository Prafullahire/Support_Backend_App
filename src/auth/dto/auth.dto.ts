import { Transform } from 'class-transformer';

import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';



export class RegisterDto {

  @ApiProperty({ description: 'Email address or phone number' })

  @Transform(({ obj }) =>

    String(obj?.emailOrPhone || obj?.email || obj?.phone || '').trim(),

  )

  @IsString()

  @IsNotEmpty({ message: 'Email or phone number is required' })

  emailOrPhone: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  email?: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  phone?: string;



  @ApiProperty()

  @IsString()

  @MinLength(6)

  password: string;



  @ApiProperty()

  @IsString()

  @IsNotEmpty()

  firstName: string;



  @ApiProperty()

  @IsString()

  @IsNotEmpty()

  lastName: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  branchId?: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  officeLocationId?: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  joiningDate?: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  leavingDate?: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  address?: string;

}



export class LoginDto {

  @ApiProperty({ description: 'Email address or phone number' })

  @Transform(({ obj }) =>

    String(obj?.emailOrPhone || obj?.email || obj?.phone || '').trim(),

  )

  @IsString()

  @IsNotEmpty({ message: 'Email or phone number is required' })

  emailOrPhone: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  email?: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  phone?: string;



  @ApiProperty()

  @IsString()

  password: string;

}



export class RefreshTokenDto {

  @ApiProperty()

  @IsString()

  refreshToken: string;

}



export type RegisterBody = {

  emailOrPhone?: string;

  email?: string;

  phone?: string;

  password?: string;

  firstName?: string;

  lastName?: string;

  branchId?: string;

  officeLocationId?: string;

  joiningDate?: string;

  leavingDate?: string;

  address?: string;

};



export type LoginBody = {

  emailOrPhone?: string;

  email?: string;

  phone?: string;

  password?: string;

};


