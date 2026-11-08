import { Query, Mutation, ResolveField, Resolver, Parent, Args, Context } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { TransactionService } from './transaction.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TransactionDocument } from './schemas/transaction.schema'
import { CreateTransactionInput, TransactionFilter } from './transaction.types'
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard'
import { TenantId } from '../tenant/decorators/tenant-id.decorator'

@UseGuards(JwtAuthGuard, TenantAccessGuard)
@Resolver('Transaction')
export class TransactionResolver {
  constructor(private readonly transaction: TransactionService) {}

  @Query()
  transactions(@TenantId() tenantId: string, @Args('filter') filter?: TransactionFilter) {
    return this.transaction.getTransactions(tenantId, filter)
  }

  @Mutation()
  createTransaction(
    @TenantId() tenantId: string,
    @Args('input') input: CreateTransactionInput,
    @Context() context: any,
  ) {
    return this.transaction.createTransaction(tenantId, input, context.req.user.userId)
  }

  @Mutation()
  async deleteTransaction(
    @TenantId() tenantId: string,
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    const result = await this.transaction.remove(tenantId, id, context.req.user.userId)
    return result !== null
  }

  @Mutation()
  voidTransaction(
    @TenantId() tenantId: string,
    @Args('id') id: string,
    @Context() context: any,
  ) {
    return this.transaction.remove(tenantId, id, context.req.user.userId)
  }

  @ResolveField('createdAt')
  createdAt(@Parent() transaction: TransactionDocument): string {
    return transaction.createdAt.toISOString()
  }

  @ResolveField('occurredAt')
  occurredAt(@Parent() transaction: TransactionDocument): string {
    return (transaction.occurredAt ?? transaction.createdAt).toISOString()
  }

  @ResolveField('status')
  status(@Parent() transaction: TransactionDocument): string {
    return transaction.status ?? 'ACTIVE'
  }

  @ResolveField('inventoryAppliedAt')
  inventoryAppliedAt(@Parent() transaction: TransactionDocument): string | null {
    return transaction.inventoryAppliedAt?.toISOString() ?? null
  }
}
