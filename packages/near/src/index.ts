export type Network = "testnet" | "mainnet";

export type TransferIntent = {
  approvalId: string;
  procurementId: string;
  recipientAccountId: string;
  amountYocto: bigint;
  tokenId: string;
  network: Network;
};

export type TransactionReceipt = {
  transactionHash: string;
  senderAccountId: string;
  receiverAccountId: string;
  amountYocto: bigint;
  network: Network;
  final: boolean;
};

/**
 * Server-side chain boundary. Implementations must independently verify the
 * stored human approval before a signer can submit a transfer.
 */
export interface NearGateway {
  getAccountBalance(accountId: string): Promise<bigint>;
  submitApprovedTransfer(intent: TransferIntent): Promise<{ transactionHash: string }>;
  verifyTransaction(transactionHash: string): Promise<TransactionReceipt>;
}

export type TransferSigner = {
  readonly accountId: string;
  transfer(intent: TransferIntent): Promise<{ transactionHash: string }>;
};

export function assertTestnet(network: Network): void {
  if (network !== "testnet") throw new Error("Only testnet transactions are enabled in this release");
}
