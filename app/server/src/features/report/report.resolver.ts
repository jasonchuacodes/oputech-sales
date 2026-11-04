import { Query, Mutation, ResolveField, Resolver, Parent, Args, Context } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { ReportService, AnalyticsRange } from './report.service'
import { UsersService } from '../users/users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReportDocument } from './schemas/report.schema'
import { PaymentType, TransactionDocument } from '../transaction/schemas/transaction.schema'
import { CreateReportDto } from './dto/create-report.dto'

@UseGuards(JwtAuthGuard)
@Resolver('Report')
export class ReportResolver {
  constructor(
    private readonly reportService: ReportService,
    private readonly usersService: UsersService,
  ) {}

  @Query()
  reports() {
    return this.reportService.findAll()
  }

  @Query()
  report(@Args('id') id: string) {
    return this.reportService.findById(id)
  }

  @Query()
  analytics(@Args('range') range: AnalyticsRange) {
    return this.reportService.getAnalytics(range)
  }

  @Mutation()
  createReport(@Args('input') input: CreateReportDto, @Context() context: any) {
    const userId: string = context.req.user.userId
    return this.reportService.create(input, userId)
  }

  @Mutation()
  deleteReport(@Args('id') id: string): Promise<boolean> {
    return this.reportService.delete(id)
  }

  @Mutation()
  remit(
    @Args('id') id: string,
    @Args('isRemitted') isRemitted: boolean,
  ): Promise<ReportDocument> {
    return this.reportService.remit(id, isRemitted)
  }

  @ResolveField('createdBy')
  createdBy(@Parent() report: ReportDocument) {
    return this.usersService.findById(report.createdBy)
  }

  @ResolveField('totalCash')
  totalCash(@Parent() report: ReportDocument): Promise<number> {
    return this.reportService.getTotalByPaymentType(report.transactionIds, PaymentType.CASH)
  }

  @ResolveField('totalOnline')
  totalOnline(@Parent() report: ReportDocument): Promise<number> {
    return this.reportService.getTotalByPaymentType(report.transactionIds, PaymentType.ONLINE)
  }

  @ResolveField('totalIncome')
  async totalIncome(@Parent() report: ReportDocument): Promise<number> {
    const [cash, online] = await Promise.all([
      this.reportService.getTotalByPaymentType(report.transactionIds, PaymentType.CASH),
      this.reportService.getTotalByPaymentType(report.transactionIds, PaymentType.ONLINE),
    ])
    return cash + online
  }

  @ResolveField('totalExpenses')
  totalExpenses(@Parent() report: ReportDocument): Promise<number> {
    return this.reportService.getExpenseTotalFromTransactions(report.transactionIds)
  }

  @ResolveField('expenses')
  expenses(@Parent() report: ReportDocument): Promise<TransactionDocument[]> {
    return this.reportService.getExpenseTransactions(report.transactionIds)
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
