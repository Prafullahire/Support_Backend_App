import {

  Controller,

  Get,

  Post,

  Param,

  Query,

  UploadedFile,

  UseGuards,

  UseInterceptors,

} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { ImportsService } from './imports.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('imports')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@AdminRoles()

@Controller('imports')

export class ImportsController {

  constructor(private service: ImportsService) {}



  @Get()

  findAllJobs() {

    return this.service.findAllJobs();

  }



  @Post('upload')

  @ApiConsumes('multipart/form-data')

  @UseInterceptors(FileInterceptor('file'))

  upload(

    @UploadedFile() file: Express.Multer.File,

    @Query('module') module: string,

    @Query('branchId') branchId: string | undefined,

    @CurrentUser() user: ScopedUser,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.importFromXlsx(file, module, user.id, scope.branchId);

  }



  @Get(':id')

  findOneJob(@Param('id') id: string) {

    return this.service.findOneJob(id);

  }

}

