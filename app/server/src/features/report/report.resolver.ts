import { Query, Mutation, ResolveField, Resolver, Parent, Args, Context } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { ReportService, AnalyticsRange } from './report.service'
import { UsersService } from '../users/users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReportDocument } from './schemas/report.schema'
import { PaymentType, TransactionDocument } from '../transaction/schemas/transaction.schema'
import { CreateReportDto } from './dto/create-report.dto'
import { ReportFilterDto, ReportPaginationDto } from './dto/reports-page.dto'
import { ReportSortOrder } from './report.types'
import { AdminGuard } from '../auth/guards/admin.guard'
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard'
import { TenantId } from '../tenant/decorators/tenant-id.decorator'
import { UserRole } from '../users/schemas/user.schema'

@UseGuards(JwtAuthGuard, TenantAccessGuard)
@Resolver('Report')
export class ReportResolver {
  constructor(
    private readonly reportService: ReportService,
    private readonly usersService: UsersService,
  ) {}

  @Query()
  reports(@TenantId() tenantId: string) {
    return this.reportService.findAll(tenantId)
  }

  @Query()
  reportsPage(
    @TenantId() tenantId: string,
    @Args('filter', { nullable: true }) filter?: ReportFilterDto,
    @Args('pagination', { nullable: true }) pagination?: ReportPaginationDto,
    @Args('sort', { nullable: true }) sort?: ReportSortOrder,
  ) {
    return this.reportService.findPage(tenantId, { filter, pagination, sort })
  }

  @Query()
  report(@TenantId() tenantId: string, @Args('id') id: string) {
    return this.reportService.findById(tenantId, id)
  }

  @Query()
  analytics(@TenantId() tenantId: string, @Args('range') range: AnalyticsRange) {
    return this.reportService.getAnalytics(tenantId, range)
  }

  @Mutation()
  createReport(
    @TenantId() tenantId: string,
    @Args('input') input: CreateReportDto,
    @Context() context: any,
  ) {
    const userId: string = context.req.user.userId
    return this.reportService.create(tenantId, input, userId)
  }

  @Mutation()
  deleteReport(
    @TenantId() tenantId: string,
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    const canDeleteRemitted = [UserRole.SuperAdmin, UserRole.Admin].includes(
      context.req.user?.role,
    )
    return this.reportService.delete(tenantId, id, canDeleteRemitted)
  }

  @Mutation()
  @UseGuards(AdminGuard)
  remit(
    @TenantId() tenantId: string,
    @Args('id') id: string,
    @Args('isRemitted') isRemitted: boolean,
  ): Promise<ReportDocument> {
    return this.reportService.remit(tenantId, id, isRemitted)
  }

  @ResolveField('createdBy')
  createdBy(@Parent() report: ReportDocument) {
    return this.usersService.findById(report.createdBy)
  }

  @ResolveField('totalCash')
  totalCash(@Parent() report: ReportDocument): Promise<number> {
    return this.reportService.getTotalByPaymentType(report.tenantId, report.transactionIds, PaymentType.CASH)
  }

  @ResolveField('totalOnline')
  totalOnline(@Parent() report: ReportDocument): Promise<number> {
    return this.reportService.getTotalByPaymentType(report.tenantId, report.transactionIds, PaymentType.ONLINE)
  }

  @ResolveField('totalIncome')
  async totalIncome(@Parent() report: ReportDocument): Promise<number> {
    const [cash, online] = await Promise.all([
      this.reportService.getTotalByPaymentType(report.tenantId, report.transactionIds, PaymentType.CASH),
      this.reportService.getTotalByPaymentType(report.tenantId, report.transactionIds, PaymentType.ONLINE),
    ])
    return cash + online
  }

  @ResolveField('totalExpenses')
  totalExpenses(@Parent() report: ReportDocument): Promise<number> {
    return this.reportService.getExpenseTotalFromTransactions(report.tenantId, report.transactionIds)
  }

  @ResolveField('expenses')
  expenses(@Parent() report: ReportDocument): Promise<TransactionDocument[]> {
    return this.reportService.getExpenseTransactions(report.tenantId, report.transactionIds)
  }

  @ResolveField('totalPrintCount')
  totalPrintCount(@Parent() report: ReportDocument): number {
    return report.products.reduce((sum, p) => sum + p.printCount * p.quantitySold, 0)
  }

  @ResolveField('fromDate')
  fromDate(@Parent() report: ReportDocument): string {
    return report.fromDate.toISOString()
  }

  @ResolveField('toDate')
  toDate(@Parent() report: ReportDocument): string {
    return report.toDate.toISOString()
  }

  @ResolveField('createdAt')
  createdAt(@Parent() report: ReportDocument): string {
    return (report as any).createdAt.toISOString()
  }

  @ResolveField('updatedAt')
  updatedAt(@Parent() report: ReportDocument): string {
    return (report as any).updatedAt.toISOString()
  }
}

@Resolver('ProductSale')
export class ProductSaleResolver {
  @ResolveField('total')
  total(@Parent() ps: { quantitySold: number; pricePerUnit: number }): number {
    return ps.quantitySold * ps.pricePerUnit
  }
}
