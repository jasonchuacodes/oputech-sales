import { Query, Mutation, ResolveField, Resolver, Parent, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { TransactionService } from './transaction.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TransactionDocument } from './schemas/transaction.schema'
import { CreateTransactionInput, TransactionFilter } from './transaction.types'

@UseGuards(JwtAuthGuard)
@Resolver('Transaction')
export class TransactionResolver {
  constructor(private readonly transaction: TransactionService) {}

  @Query()
  transactions(@Args('filter') filter?: TransactionFilter) {
    return this.transaction.getTransactions(filter)
  }

  @Mutation()
  createTransaction(@Args('input') input: CreateTransactionInput) {
    return this.transaction.createTransaction(input)
  }

  @Mutation()
  async deleteTransaction(@Args('id') id: string): Promise<boolean> {
    const result = await this.transaction.remove(id)
    return result !== null
  }

  @ResolveField('createdAt')
  createdAt(@Parent() transaction: TransactionDocument): string {
    return transaction.createdAt.toISOString()
  }

  @ResolveField('occurredAt')
  occurredAt(@Parent() transaction: TransactionDocument): string {
    return (transaction.occurredAt ?? transaction.createdAt).toISOString()
  }
}
