/**
 * EIP-712 Typed Data Builder
 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}

 * Domain: DAES dUSD Bridge
 * Network: Arbitrum One (42161)
 */

import { ethers } from "ethers";

export function buildMintTypedData(params: {
  bridgeMinter: string;
  chainId: number;
  daesRef: string;
  holdId: string;
  amountUnits: bigint;
  beneficiary: string;
  walletDestino: string;
  deadline: bigint;
  nonce: bigint;
}) {
  const domain = {
    name: "DAES dUSD Bridge",
    version: "1",
    chainId: params.chainId,
    verifyingContract: params.bridgeMinter
  };

  const types = {
    MintAuthorization: [
      { name: "daesRef", type: "bytes32" },
      { name: "holdId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "walletDestino", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const value = {
    daesRef: ethers.keccak256(ethers.toUtf8Bytes(params.daesRef)),
    holdId: ethers.keccak256(ethers.toUtf8Bytes(params.holdId)),
    amount: params.amountUnits,
    beneficiary: params.beneficiary,
    walletDestino: params.walletDestino,
    deadline: params.deadline,
    nonce: params.nonce
  };

  return { domain, types, value };
}
