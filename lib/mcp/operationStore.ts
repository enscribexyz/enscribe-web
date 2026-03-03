export type PlannedOperationRecord = {
  operationId: string
  chainId: number
  contractAddress: string
  ensName: string
  createdAt: string
}

export type SubmittedOperationRecord = {
  operationId: string
  txHashes: string[]
  submittedAt: string
}

/**
 * Persistence hook for future integration (Redis/Postgres/etc).
 * Intentionally no-op for now.
 */
export interface PrimaryNameOperationStore {
  onPlanCreated(record: PlannedOperationRecord): Promise<void>
  onTxSubmitted(record: SubmittedOperationRecord): Promise<void>
}

class NoopPrimaryNameOperationStore implements PrimaryNameOperationStore {
  async onPlanCreated(_record: PlannedOperationRecord): Promise<void> {
    return
  }

  async onTxSubmitted(_record: SubmittedOperationRecord): Promise<void> {
    return
  }
}

export function createPrimaryNameOperationStore(): PrimaryNameOperationStore {
  return new NoopPrimaryNameOperationStore()
}
