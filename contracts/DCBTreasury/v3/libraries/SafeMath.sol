// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SAFE MATH & CRYPTO LIBRARIES - v3.0.0                      ║
 * ║                    Digital Commercial Bank Ltd                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ECDSA LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS
    }

    error ECDSAInvalidSignature();
    error ECDSAInvalidSignatureLength(uint256 length);
    error ECDSAInvalidSignatureS(bytes32 s);

    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address, RecoverError, bytes32) {
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            return tryRecover(hash, v, r, s);
        } else {
            return (address(0), RecoverError.InvalidSignatureLength, bytes32(signature.length));
        }
    }

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(hash, signature);
        _throwError(error, errorArg);
        return recovered;
    }

    function tryRecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address, RecoverError, bytes32) {
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return (address(0), RecoverError.InvalidSignatureS, s);
        }

        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature, bytes32(0));
        }

        return (signer, RecoverError.NoError, bytes32(0));
    }

    function recover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(hash, v, r, s);
        _throwError(error, errorArg);
        return recovered;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32 message) {
        assembly {
            mstore(0x00, "\x19Ethereum Signed Message:\n32")
            mstore(0x1c, hash)
            message := keccak256(0x00, 0x3c)
        }
    }

    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32 digest) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, "\x19\x01")
            mstore(add(ptr, 0x02), domainSeparator)
            mstore(add(ptr, 0x22), structHash)
            digest := keccak256(ptr, 0x42)
        }
    }

    function _throwError(RecoverError error, bytes32 errorArg) private pure {
        if (error == RecoverError.NoError) {
            return;
        } else if (error == RecoverError.InvalidSignature) {
            revert ECDSAInvalidSignature();
        } else if (error == RecoverError.InvalidSignatureLength) {
            revert ECDSAInvalidSignatureLength(uint256(errorArg));
        } else if (error == RecoverError.InvalidSignatureS) {
            revert ECDSAInvalidSignatureS(errorArg);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EIP-712 LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

library EIP712 {
    bytes32 private constant TYPE_HASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    function buildDomainSeparator(
        string memory name,
        string memory version,
        address verifyingContract
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                TYPE_HASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid,
                verifyingContract
            )
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATH LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

library Math {
    enum Rounding {
        Floor,
        Ceil,
        Trunc,
        Expand
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a & b) + (a ^ b) / 2;
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) return 0;
        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    function mulDiv(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0 = x * y;
            uint256 prod1;
            assembly {
                let mm := mulmod(x, y, not(0))
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            if (prod1 == 0) {
                return prod0 / denominator;
            }

            require(denominator > prod1, "Math: mulDiv overflow");

            uint256 remainder;
            assembly {
                remainder := mulmod(x, y, denominator)
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }

            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }

            prod0 |= prod1 * twos;

            uint256 inverse = (3 * denominator) ^ 2;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;

            result = prod0 * inverse;
            return result;
        }
    }

    function sqrt(uint256 a) internal pure returns (uint256) {
        if (a == 0) return 0;

        uint256 result = 1 << (log2(a) >> 1);
        unchecked {
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            return min(result, a / result);
        }
    }

    function log2(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >> 128 > 0) { value >>= 128; result += 128; }
            if (value >> 64 > 0) { value >>= 64; result += 64; }
            if (value >> 32 > 0) { value >>= 32; result += 32; }
            if (value >> 16 > 0) { value >>= 16; result += 16; }
            if (value >> 8 > 0) { value >>= 8; result += 8; }
            if (value >> 4 > 0) { value >>= 4; result += 4; }
            if (value >> 2 > 0) { value >>= 2; result += 2; }
            if (value >> 1 > 0) { result += 1; }
        }
        return result;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE CAST LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

library SafeCast {
    error SafeCastOverflowedUintDowncast(uint8 bits, uint256 value);
    error SafeCastOverflowedIntToUint(int256 value);
    error SafeCastOverflowedUintToInt(uint256 value);

    function toUint248(uint256 value) internal pure returns (uint248) {
        if (value > type(uint248).max) revert SafeCastOverflowedUintDowncast(248, value);
        return uint248(value);
    }

    function toUint224(uint256 value) internal pure returns (uint224) {
        if (value > type(uint224).max) revert SafeCastOverflowedUintDowncast(224, value);
        return uint224(value);
    }

    function toUint208(uint256 value) internal pure returns (uint208) {
        if (value > type(uint208).max) revert SafeCastOverflowedUintDowncast(208, value);
        return uint208(value);
    }

    function toUint128(uint256 value) internal pure returns (uint128) {
        if (value > type(uint128).max) revert SafeCastOverflowedUintDowncast(128, value);
        return uint128(value);
    }

    function toUint96(uint256 value) internal pure returns (uint96) {
        if (value > type(uint96).max) revert SafeCastOverflowedUintDowncast(96, value);
        return uint96(value);
    }

    function toUint64(uint256 value) internal pure returns (uint64) {
        if (value > type(uint64).max) revert SafeCastOverflowedUintDowncast(64, value);
        return uint64(value);
    }

    function toUint48(uint256 value) internal pure returns (uint48) {
        if (value > type(uint48).max) revert SafeCastOverflowedUintDowncast(48, value);
        return uint48(value);
    }

    function toUint32(uint256 value) internal pure returns (uint32) {
        if (value > type(uint32).max) revert SafeCastOverflowedUintDowncast(32, value);
        return uint32(value);
    }

    function toUint16(uint256 value) internal pure returns (uint16) {
        if (value > type(uint16).max) revert SafeCastOverflowedUintDowncast(16, value);
        return uint16(value);
    }

    function toUint8(uint256 value) internal pure returns (uint8) {
        if (value > type(uint8).max) revert SafeCastOverflowedUintDowncast(8, value);
        return uint8(value);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        if (value > uint256(type(int256).max)) revert SafeCastOverflowedUintToInt(value);
        return int256(value);
    }

    function toUint256(int256 value) internal pure returns (uint256) {
        if (value < 0) revert SafeCastOverflowedIntToUint(value);
        return uint256(value);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKPOINTS LIBRARY (For Voting/Snapshots)
// ═══════════════════════════════════════════════════════════════════════════════

library Checkpoints {
    using SafeCast for uint256;

    struct Trace224 {
        Checkpoint224[] _checkpoints;
    }

    struct Checkpoint224 {
        uint32 _key;
        uint224 _value;
    }

    function push(Trace224 storage self, uint32 key, uint224 value) internal returns (uint224, uint224) {
        return _insert(self._checkpoints, key, value);
    }

    function lowerLookup(Trace224 storage self, uint32 key) internal view returns (uint224) {
        uint256 len = self._checkpoints.length;
        uint256 pos = _lowerBinaryLookup(self._checkpoints, key, 0, len);
        return pos == len ? 0 : _unsafeAccess(self._checkpoints, pos)._value;
    }

    function upperLookup(Trace224 storage self, uint32 key) internal view returns (uint224) {
        uint256 len = self._checkpoints.length;
        uint256 pos = _upperBinaryLookup(self._checkpoints, key, 0, len);
        return pos == 0 ? 0 : _unsafeAccess(self._checkpoints, pos - 1)._value;
    }

    function upperLookupRecent(Trace224 storage self, uint32 key) internal view returns (uint224) {
        uint256 len = self._checkpoints.length;
        uint256 pos = _upperBinaryLookup(self._checkpoints, key, 0, len);
        return pos == 0 ? 0 : _unsafeAccess(self._checkpoints, pos - 1)._value;
    }

    function latest(Trace224 storage self) internal view returns (uint224) {
        uint256 pos = self._checkpoints.length;
        return pos == 0 ? 0 : _unsafeAccess(self._checkpoints, pos - 1)._value;
    }

    function latestCheckpoint(Trace224 storage self) internal view returns (bool exists, uint32 _key, uint224 _value) {
        uint256 pos = self._checkpoints.length;
        if (pos == 0) {
            return (false, 0, 0);
        } else {
            Checkpoint224 memory ckpt = _unsafeAccess(self._checkpoints, pos - 1);
            return (true, ckpt._key, ckpt._value);
        }
    }

    function length(Trace224 storage self) internal view returns (uint256) {
        return self._checkpoints.length;
    }

    function at(Trace224 storage self, uint32 pos) internal view returns (Checkpoint224 memory) {
        return self._checkpoints[pos];
    }

    function _insert(Checkpoint224[] storage self, uint32 key, uint224 value) private returns (uint224, uint224) {
        uint256 pos = self.length;

        if (pos > 0) {
            Checkpoint224 memory last = _unsafeAccess(self, pos - 1);
            if (last._key > key) revert();
            if (last._key == key) {
                _unsafeAccess(self, pos - 1)._value = value;
                return (last._value, value);
            }
        }

        self.push(Checkpoint224({_key: key, _value: value}));
        return (0, value);
    }

    function _upperBinaryLookup(
        Checkpoint224[] storage self,
        uint32 key,
        uint256 low,
        uint256 high
    ) private view returns (uint256) {
        while (low < high) {
            uint256 mid = Math.average(low, high);
            if (_unsafeAccess(self, mid)._key > key) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return high;
    }

    function _lowerBinaryLookup(
        Checkpoint224[] storage self,
        uint32 key,
        uint256 low,
        uint256 high
    ) private view returns (uint256) {
        while (low < high) {
            uint256 mid = Math.average(low, high);
            if (_unsafeAccess(self, mid)._key < key) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return high;
    }

    function _unsafeAccess(Checkpoint224[] storage self, uint256 pos) private pure returns (Checkpoint224 storage result) {
        assembly {
            mstore(0, self.slot)
            result.slot := add(keccak256(0, 0x20), pos)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS UTILS
// ═══════════════════════════════════════════════════════════════════════════════

library Address {
    error AddressInsufficientBalance(address account);
    error AddressEmptyCode(address target);
    error FailedInnerCall();

    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert AddressInsufficientBalance(address(this));
        }

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert FailedInnerCall();
        }
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0);
    }

    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        if (address(this).balance < value) {
            revert AddressInsufficientBalance(address(this));
        }
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata
    ) internal view returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            if (returndata.length == 0 && target.code.length == 0) {
                revert AddressEmptyCode(target);
            }
            return returndata;
        }
    }

    function _revert(bytes memory returndata) private pure {
        if (returndata.length > 0) {
            assembly {
                let returndata_size := mload(returndata)
                revert(add(32, returndata), returndata_size)
            }
        } else {
            revert FailedInnerCall();
        }
    }
}
