export interface IdGenerator {
  generate(): string
}

export class RandomIdGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID()
  }
}
