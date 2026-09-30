import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export async function deleteUserRelations(prisma: PrismaService | Prisma.TransactionClient, userId: string) {
  const tx = prisma;

  await tx.attendanceActivityLog.deleteMany({ where: { userId } });
  await tx.officeBoyAttendance.deleteMany({ where: { userId } });
  await tx.refreshToken.deleteMany({ where: { userId } });
  await tx.notification.deleteMany({ where: { userId } });
  await tx.assetAssignment.deleteMany({ where: { userId } });
  await tx.joiningKitIssue.deleteMany({ where: { userId } });
  await tx.brochureIssue.deleteMany({ where: { userId } });

  await tx.request.updateMany({
    where: { assignedToId: userId },
    data: { assignedToId: null },
  });
  await tx.idCard.updateMany({
    where: { assignedToId: userId },
    data: { assignedToId: null, isAvailable: true, assignedAt: null },
  });
  await tx.auditLog.updateMany({
    where: { userId },
    data: { userId: null },
  });

  await tx.request.deleteMany({ where: { createdById: userId } });
  await tx.courierRequest.deleteMany({ where: { createdById: userId } });
  await tx.expense.deleteMany({ where: { createdById: userId } });
}
