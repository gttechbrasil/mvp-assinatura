import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

export class AdminServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getStats() {
    const [
      totalUsers,
      totalGroups,
      totalCategories,
      depositSum,
      balanceSum,
      repasseSum,
      membersInCustody,
      activeMemberships,
      registrationsByDate
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscriptionGroup.count(),
      this.prisma.category.count(),
      this.prisma.transaction.aggregate({
        where: {
          type: "CREDIT",
          status: "CONFIRMED",
          description: "Recarga de créditos (Pix)",
        },
        _sum: { amount: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: "CREDIT",
          status: "CONFIRMED",
          description: { startsWith: "Repasse" },
        },
        _sum: { amount: true },
      }),
      (this.prisma.groupMember as any).findMany({
        where: {
          OR: [
            { status: "PENDING_CREDENTIALS" },
            {
              status: "ACTIVE",
              escrowReleasedAt: { not: null },
            },
          ],
        },
        include: { group: { select: { pricePerSlot: true } } },
      }),
      (this.prisma.groupMember as any).findMany({
        where: { status: "ACTIVE" },
        include: { group: { select: { pricePerSlot: true } } },
      }),
      this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as "date", CAST(COUNT(*) as integer) as "count"
        FROM users
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY "date" ASC
      `
    ]);

    const totalDeposits = Number(depositSum._sum.amount || 0);
    const totalBalances = Number(balanceSum._sum.balance || 0);
    const totalRepasse = Number(repasseSum._sum.amount || 0);
    const platformRevenue = totalRepasse / 9;

    const totalInCustody = (membersInCustody as Array<{ group: { pricePerSlot: unknown } }>).reduce(
      (acc, m) => acc + Number(m.group.pricePerSlot),
      0
    );

    const mrr = (activeMemberships as Array<{ group: { pricePerSlot: unknown } }>).reduce(
      (acc, m) => acc + Number(m.group.pricePerSlot),
      0
    );

    return {
      totalUsers,
      totalGroups,
      totalCategories,
      financial: {
        totalDeposits,
        totalBalances,
        totalInCustody,
        mrr,
        platformRevenue,
      },
      registrationsByDate,
    };
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async updateUserRole(userId: string, role: string) {
    if (role !== "ADMIN" && role !== "USER") {
      throw new AppError("Cargo inválido. Deve ser ADMIN ou USER.", 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });
  }

  async listAllGroups() {
    return this.prisma.subscriptionGroup.findMany({
      include: {
        owner: { select: { id: true, email: true, name: true } },
        category: { select: { id: true, name: true, icon: true } },
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    await this.prisma.subscriptionGroup.delete({
      where: { id: groupId },
    });
  }
}
