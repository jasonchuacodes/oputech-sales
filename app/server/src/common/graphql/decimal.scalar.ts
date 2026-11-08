import { CustomScalar, Scalar } from '@nestjs/graphql'
import { Kind, ValueNode } from 'graphql'
import { Types } from 'mongoose'
import Decimal from 'decimal.js'

const normalizeDecimal = (value: unknown): string => {
  const raw = value instanceof Types.Decimal128 ? value.toString() : String(value)
  const decimal = new Decimal(raw)
  if (!decimal.isFinite()) throw new TypeError('Decimal values must be finite.')
  return decimal.toString()
}

@Scalar('Decimal')
export class DecimalScalar implements CustomScalar<string | number, string> {
  description = 'An exact base-10 decimal serialized as a string.'

  parseValue(value: string | number): string {
    return normalizeDecimal(value)
  }

  serialize(value: unknown): string {
    return normalizeDecimal(value)
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind !== Kind.STRING && ast.kind !== Kind.INT && ast.kind !== Kind.FLOAT) {
      throw new TypeError('Decimal values must be provided as strings or numbers.')
    }
    return normalizeDecimal(ast.value)
  }
}
