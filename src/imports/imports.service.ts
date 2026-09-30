import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  async importFromXlsx(
    file: Express.Multer.File,
    module: string,
    userId: string,
    branchId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
    );

    const job = await this.prisma.importJob.create({
      data: {
        module,
        fileName: file.originalname,
        status: 'PROCESSING',
        totalRows: rows.length,
        branchId,
        createdBy: userId,
      },
    });

    let successRows = 0;
    let failedRows = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        await this.importRow(module, rows[i], branchId);
        successRows++;
      } catch (err) {
        failedRows++;
        errors.push(`Row ${i + 2}: ${(err as Error).message}`);
      }
    }

    return this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: failedRows === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS',
        successRows,
        failedRows,
        errors: errors.length ? errors.join('\n') : null,
      },
    });
  }

  findAllJobs() {
    return this.prisma.importJob.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOneJob(id: string) {
    return this.prisma.importJob.findUnique({ where: { id } });
  }

  private async importRow(
    module: string,
    row: Record<string, unknown>,
    branchId?: string,
  ) {
    switch (module) {
      case 'vendors':
        await this.prisma.vendor.create({
          data: {
            name: String(row.name || row.Name),
            contact: row.contact ? String(row.contact) : undefined,
            email: row.email ? String(row.email) : undefined,
            phone: row.phone ? String(row.phone) : undefined,
            address: row.address ? String(row.address) : undefined,
          },
        });
        break;
      case 'departments':
        await this.prisma.department.create({
          data: {
            name: String(row.name || row.Name),
            branchId: branchId || (row.branchId ? String(row.branchId) : undefined),
          },
        });
        break;
      case 'assets':
        await this.prisma.asset.create({
          data: {
            name: String(row.name || row.Name),
            serialNumber: row.serialNumber ? String(row.serialNumber) : undefined,
            branchId: branchId || (row.branchId ? String(row.branchId) : undefined),
          },
        });
        break;
      default:
        throw new BadRequestException(`Unsupported import module: ${module}`);
    }
  }
}
