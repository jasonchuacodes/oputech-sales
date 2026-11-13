import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../auth/guards/admin.guard'
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard'
import { TenantId } from '../tenant/decorators/tenant-id.decorator'
import { StockService } from './stock.service'
import { StockMovementDocument } from './schemas/stock-movement.schema'
import {
  EnableStockTrackingDto,
  ReceiveStockDto,
  ReconcileStockDto,
  StockMovementFilterDto,
  StockPaginationDto,
} from './dto/stock.dto'

@UseGuards(JwtAuthGuard, TenantAccessGuard, AdminGuard)
@Resolver()
export class StockResolver {
  constructor(private readonly stockService: StockService) {}

  @Query()
  stockMovements(
    @TenantId() tenantId: string,
    @Args('filter', { nullable: true }) filter?: StockMovementFilterDto,
    @Args('pagination', { nullable: true }) pagination?: StockPaginationDto
  ) {
    return this.stockService.listMovements(
      tenantId,
      filter as never,
      pagination
    )
  }

  @Mutation()
  enableStockTracking(
    @TenantId() tenantId: string,
    @Args('input') input: EnableStockTrackingDto,
    @Context() context: any
  ) {
    return this.stockService.enableTracking(
      tenantId,
      input,
      context.req.user.userId
    )
  }

  @Mutation()
  receiveStock(
    @TenantId() tenantId: string,
    @Args('input') input: ReceiveStockDto,
    @Context() context: any
  ) {
    return this.stockService.receive(tenantId, input, context.req.user.userId)
  }

  @Mutation()
  reconcileStock(
    @TenantId() tenantId: string,
    @Args('input') input: ReconcileStockDto,
    @Context() context: any
  ) {
    return this.stockService.reconcile(tenantId, input, context.req.user.userId)
  }
}

@UseGuards(JwtAuthGuard, TenantAccessGuard, AdminGuard)
@Resolver('StockMovement')
export class StockMovementResolver {
  constructor(private readonly stockService: StockService) {}

  @ResolveField('product')
  product(@Parent() movement: StockMovementDocument) {
    return this.stockService.findProduct(movement.tenantId, movement.productId)
  }

  @ResolveField('occurredAt')
  occurredAt(@Parent() movement: StockMovementDocument): string {
    return movement.occurredAt.toISOString()
  }

  @ResolveField('postedAt')
  postedAt(@Parent() movement: StockMovementDocument): string {
    return movement.postedAt.toISOString()
  }
}
