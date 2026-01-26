/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                   ║
 * ║    ██████╗  ██████╗██████╗     ████████╗██████╗ ███████╗ █████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗║
 * ║    ██╔══██╗██╔════╝██╔══██╗    ╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝║
 * ║    ██║  ██║██║     ██████╔╝       ██║   ██████╔╝█████╗  ███████║███████╗██║   ██║██████╔╝ ╚████╔╝ ║
 * ║    ██║  ██║██║     ██╔══██╗       ██║   ██╔══██╗██╔══╝  ██╔══██║╚════██║██║   ██║██╔══██╗  ╚██╔╝  ║
 * ║    ██████╔╝╚██████╗██████╔╝       ██║   ██║  ██║███████╗██║  ██║███████║╚██████╔╝██║  ██║   ██║   ║
 * ║    ╚═════╝  ╚═════╝╚═════╝        ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ║
 * ║                                                                                                   ║
 * ║                           V5 DEPLOYMENT & VERIFICATION SCRIPT                                     ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    rpc: 'https://rpc.lemonchain.io',
    chainId: 1006,
    explorer: 'https://explorer.lemonchain.io',
    explorerApi: 'https://explorer.lemonchain.io/api',
    
    // Compiler settings for verification
    compiler: {
        version: '0.8.24',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1
            },
            viaIR: true,
            evmVersion: 'paris'
        }
    },
    
    // Contract addresses
    vusdContract: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
    minterWallet: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
    
    // Gas settings
    gasPrice: ethers.parseUnits('1', 'gwei'),
    gasLimit: 8000000
};

// Private key (from environment or hardcoded for testing)
const PRIVATE_KEY = process.env.PRIVATE_KEY || '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONSOLE STYLING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgBlue: '\x1b[44m'
};

function log(message, color = COLORS.white) {
    console.log(`${color}${message}${COLORS.reset}`);
}

function logHeader(title) {
    console.log('\n');
    log('╔══════════════════════════════════════════════════════════════════════════════════╗', COLORS.cyan);
    log(`║  ${title.padEnd(76)}  ║`, COLORS.cyan);
    log('╚══════════════════════════════════════════════════════════════════════════════════╝', COLORS.cyan);
}

function logSuccess(message) {
    log(`✓ ${message}`, COLORS.green);
}

function logInfo(message) {
    log(`ℹ ${message}`, COLORS.cyan);
}

function logWarning(message) {
    log(`⚠ ${message}`, COLORS.yellow);
}

function logError(message) {
    log(`✗ ${message}`, COLORS.red);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// OPENZEPPELIN IMPORTS RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function getOpenZeppelinSource(importPath) {
    const ozSources = {
        '@openzeppelin/contracts/token/ERC20/ERC20.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";
import {IERC20Metadata} from "./extensions/IERC20Metadata.sol";
import {Context} from "../../utils/Context.sol";
import {IERC20Errors} from "../../interfaces/draft-IERC6093.sol";

abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;
    mapping(address account => mapping(address spender => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                _totalSupply -= value;
            }
        } else {
            unchecked {
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}`,
        '@openzeppelin/contracts/token/ERC20/IERC20.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}`,
        '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "../IERC20.sol";

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}`,
        '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "../ERC20.sol";
import {Context} from "../../../utils/Context.sol";

abstract contract ERC20Burnable is Context, ERC20 {
    function burn(uint256 value) public virtual {
        _burn(_msgSender(), value);
    }

    function burnFrom(address account, uint256 value) public virtual {
        _spendAllowance(account, _msgSender(), value);
        _burn(account, value);
    }
}`,
        '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Permit} from "./IERC20Permit.sol";
import {ERC20} from "../ERC20.sol";
import {ECDSA} from "../../../utils/cryptography/ECDSA.sol";
import {EIP712} from "../../../utils/cryptography/EIP712.sol";
import {Nonces} from "../../../utils/Nonces.sol";

abstract contract ERC20Permit is ERC20, IERC20Permit, EIP712, Nonces {
    bytes32 private constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    error ERC2612ExpiredSignature(uint256 deadline);
    error ERC2612InvalidSigner(address signer, address owner);

    constructor(string memory name) EIP712(name, "1") {}

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        if (block.timestamp > deadline) {
            revert ERC2612ExpiredSignature(deadline);
        }

        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, _useNonce(owner), deadline));

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, v, r, s);
        if (signer != owner) {
            revert ERC2612InvalidSigner(signer, owner);
        }

        _approve(owner, spender, value);
    }

    function nonces(address owner) public view virtual override(IERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    function DOMAIN_SEPARATOR() external view virtual returns (bytes32) {
        return _domainSeparatorV4();
    }
}`,
        '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function nonces(address owner) external view returns (uint256);
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}`,
        '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "../IERC20.sol";
import {IERC20Permit} from "../extensions/IERC20Permit.sol";
import {Address} from "../../../utils/Address.sol";

library SafeERC20 {
    using Address for address;

    error SafeERC20FailedOperation(address token);
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));
        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));
        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        bytes memory returndata = address(token).functionCall(data);
        if (returndata.length != 0 && !abi.decode(returndata, (bool))) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        (bool success, bytes memory returndata) = address(token).call(data);
        return success && (returndata.length == 0 || abi.decode(returndata, (bool))) && address(token).code.length > 0;
    }
}`,
        '@openzeppelin/contracts/access/AccessControl.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAccessControl} from "./IAccessControl.sol";
import {Context} from "../utils/Context.sol";
import {ERC165} from "../utils/introspection/ERC165.sol";

abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }
        _revokeRole(role, callerConfirmation);
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}`,
        '@openzeppelin/contracts/access/IAccessControl.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAccessControl {
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);
    error AccessControlBadConfirmation();
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address callerConfirmation) external;
}`,
        '@openzeppelin/contracts/utils/Pausable.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Context} from "../utils/Context.sol";

abstract contract Pausable is Context {
    bool private _paused;

    event Paused(address account);
    event Unpaused(address account);

    error EnforcedPause();
    error ExpectedPause();

    constructor() {
        _paused = false;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}`,
        '@openzeppelin/contracts/utils/ReentrancyGuard.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}`,
        '@openzeppelin/contracts/utils/Context.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}`,
        '@openzeppelin/contracts/utils/Address.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
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

    function verifyCallResult(bool success, bytes memory returndata) internal pure returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
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
}`,
        '@openzeppelin/contracts/utils/Nonces.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Nonces {
    error InvalidAccountNonce(address account, uint256 currentNonce);

    mapping(address account => uint256) private _nonces;

    function nonces(address owner) public view virtual returns (uint256) {
        return _nonces[owner];
    }

    function _useNonce(address owner) internal virtual returns (uint256) {
        unchecked {
            return _nonces[owner]++;
        }
    }

    function _useCheckedNonce(address owner, uint256 nonce) internal virtual {
        uint256 current = _nonces[owner];
        if (nonce != current) {
            revert InvalidAccountNonce(owner, current);
        }
        unchecked {
            _nonces[owner] = current + 1;
        }
    }
}`,
        '@openzeppelin/contracts/utils/cryptography/ECDSA.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    function tryRecover(bytes32 hash, bytes32 r, bytes32 vs) internal pure returns (address, RecoverError, bytes32) {
        unchecked {
            bytes32 s = vs & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
            uint8 v = uint8((uint256(vs) >> 255) + 27);
            return tryRecover(hash, v, r, s);
        }
    }

    function recover(bytes32 hash, bytes32 r, bytes32 vs) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(hash, r, vs);
        _throwError(error, errorArg);
        return recovered;
    }

    function tryRecover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address, RecoverError, bytes32) {
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
}`,
        '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library MessageHashUtils {
    function toEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32 digest) {
        assembly {
            mstore(0x00, "\\x19Ethereum Signed Message:\\n32")
            mstore(0x1c, messageHash)
            digest := keccak256(0x00, 0x3c)
        }
    }

    function toEthSignedMessageHash(bytes memory message) internal pure returns (bytes32) {
        return
            keccak256(bytes.concat("\\x19Ethereum Signed Message:\\n", bytes(Strings.toString(message.length)), message));
    }

    function toDataWithIntendedValidatorHash(address validator, bytes memory data) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(hex"19_00", validator, data));
    }

    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32 digest) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, hex"19_01")
            mstore(add(ptr, 0x02), domainSeparator)
            mstore(add(ptr, 0x22), structHash)
            digest := keccak256(ptr, 0x42)
        }
    }
}

library Strings {
    function toString(uint256 value) internal pure returns (string memory) {
        unchecked {
            uint256 length = log10(value) + 1;
            string memory buffer = new string(length);
            uint256 ptr;
            assembly {
                ptr := add(buffer, add(32, length))
            }
            while (true) {
                ptr--;
                assembly {
                    mstore8(ptr, byte(mod(value, 10), "0123456789"))
                }
                value /= 10;
                if (value == 0) break;
            }
            return buffer;
        }
    }

    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10 ** 64) { value /= 10 ** 64; result += 64; }
            if (value >= 10 ** 32) { value /= 10 ** 32; result += 32; }
            if (value >= 10 ** 16) { value /= 10 ** 16; result += 16; }
            if (value >= 10 ** 8) { value /= 10 ** 8; result += 8; }
            if (value >= 10 ** 4) { value /= 10 ** 4; result += 4; }
            if (value >= 10 ** 2) { value /= 10 ** 2; result += 2; }
            if (value >= 10 ** 1) { result += 1; }
        }
        return result;
    }
}`,
        '@openzeppelin/contracts/utils/cryptography/EIP712.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MessageHashUtils} from "./MessageHashUtils.sol";
import {ShortStrings, ShortString} from "../ShortStrings.sol";
import {IERC5267} from "../../interfaces/IERC5267.sol";

abstract contract EIP712 is IERC5267 {
    using ShortStrings for *;

    bytes32 private constant TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 private immutable _cachedDomainSeparator;
    uint256 private immutable _cachedChainId;
    address private immutable _cachedThis;

    bytes32 private immutable _hashedName;
    bytes32 private immutable _hashedVersion;

    ShortString private immutable _name;
    ShortString private immutable _version;
    string private _nameFallback;
    string private _versionFallback;

    constructor(string memory name, string memory version) {
        _name = name.toShortStringWithFallback(_nameFallback);
        _version = version.toShortStringWithFallback(_versionFallback);
        _hashedName = keccak256(bytes(name));
        _hashedVersion = keccak256(bytes(version));

        _cachedChainId = block.chainid;
        _cachedDomainSeparator = _buildDomainSeparator();
        _cachedThis = address(this);
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        if (address(this) == _cachedThis && block.chainid == _cachedChainId) {
            return _cachedDomainSeparator;
        } else {
            return _buildDomainSeparator();
        }
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(this)));
    }

    function _hashTypedDataV4(bytes32 structHash) internal view virtual returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(_domainSeparatorV4(), structHash);
    }

    function eip712Domain()
        public
        view
        virtual
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        )
    {
        return (
            hex"0f",
            _EIP712Name(),
            _EIP712Version(),
            block.chainid,
            address(this),
            bytes32(0),
            new uint256[](0)
        );
    }

    function _EIP712Name() internal view returns (string memory) {
        return _name.toStringWithFallback(_nameFallback);
    }

    function _EIP712Version() internal view returns (string memory) {
        return _version.toStringWithFallback(_versionFallback);
    }
}`,
        '@openzeppelin/contracts/utils/ShortStrings.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

type ShortString is bytes32;

library ShortStrings {
    bytes32 private constant FALLBACK_SENTINEL = 0x00000000000000000000000000000000000000000000000000000000000000FF;

    error StringTooLong(string str);
    error InvalidShortString();

    function toShortString(string memory str) internal pure returns (ShortString) {
        bytes memory bstr = bytes(str);
        if (bstr.length > 31) {
            revert StringTooLong(str);
        }
        return ShortString.wrap(bytes32(uint256(bytes32(bstr)) | bstr.length));
    }

    function toString(ShortString sstr) internal pure returns (string memory) {
        uint256 len = byteLength(sstr);
        string memory str = new string(32);
        assembly {
            mstore(add(str, 32), sstr)
            mstore(str, len)
        }
        return str;
    }

    function byteLength(ShortString sstr) internal pure returns (uint256) {
        uint256 result = uint256(ShortString.unwrap(sstr)) & 0xFF;
        if (result > 31) {
            revert InvalidShortString();
        }
        return result;
    }

    function toShortStringWithFallback(string memory value, string storage store) internal returns (ShortString) {
        if (bytes(value).length < 32) {
            return toShortString(value);
        } else {
            store = value;
            return ShortString.wrap(FALLBACK_SENTINEL);
        }
    }

    function toStringWithFallback(ShortString value, string storage store) internal pure returns (string memory) {
        if (ShortString.unwrap(value) != FALLBACK_SENTINEL) {
            return toString(value);
        } else {
            return store;
        }
    }

    function length(ShortString sstr) internal pure returns (uint256) {
        return byteLength(sstr);
    }
}`,
        '@openzeppelin/contracts/interfaces/IERC5267.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC5267 {
    event EIP712DomainChanged();
    function eip712Domain()
        external
        view
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        );
}`,
        '@openzeppelin/contracts/interfaces/draft-IERC6093.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Errors {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

interface IERC721Errors {
    error ERC721InvalidOwner(address owner);
    error ERC721NonexistentToken(uint256 tokenId);
    error ERC721IncorrectOwner(address sender, uint256 tokenId, address owner);
    error ERC721InvalidSender(address sender);
    error ERC721InvalidReceiver(address receiver);
    error ERC721InsufficientApproval(address operator, uint256 tokenId);
    error ERC721InvalidApprover(address approver);
    error ERC721InvalidOperator(address operator);
}

interface IERC1155Errors {
    error ERC1155InsufficientBalance(address sender, uint256 balance, uint256 needed, uint256 tokenId);
    error ERC1155InvalidSender(address sender);
    error ERC1155InvalidReceiver(address receiver);
    error ERC1155MissingApprovalForAll(address operator, address owner);
    error ERC1155InvalidApprover(address approver);
    error ERC1155InvalidOperator(address operator);
    error ERC1155InvalidArrayLength(uint256 idsLength, uint256 valuesLength);
}`,
        '@openzeppelin/contracts/utils/introspection/ERC165.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "./IERC165.sol";

abstract contract ERC165 is IERC165 {
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}`,
        '@openzeppelin/contracts/utils/introspection/IERC165.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}`
    };
    
    return ozSources[importPath] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SOLIDITY COMPILER
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function compileContract(contractName, sourcePath) {
    logInfo(`Compiling ${contractName}...`);
    
    const source = fs.readFileSync(sourcePath, 'utf8');
    const contractsDir = path.dirname(sourcePath);
    
    const sources = {
        [contractName + '.sol']: { content: source }
    };
    
    // Add interface if needed
    if (contractName === 'VUSDMinter') {
        const ivusdPath = path.join(contractsDir, 'interfaces', 'IVUSD.sol');
        if (fs.existsSync(ivusdPath)) {
            sources['interfaces/IVUSD.sol'] = { content: fs.readFileSync(ivusdPath, 'utf8') };
        }
    }
    
    const input = {
        language: 'Solidity',
        sources: sources,
        settings: {
            optimizer: CONFIG.compiler.settings.optimizer,
            viaIR: CONFIG.compiler.settings.viaIR,
            evmVersion: CONFIG.compiler.settings.evmVersion,
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
                }
            }
        }
    };
    
    function findImports(importPath) {
        // Try OpenZeppelin
        const ozSource = getOpenZeppelinSource(importPath);
        if (ozSource) {
            return { contents: ozSource };
        }
        
        // Try local
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const fullPath = path.resolve(contractsDir, importPath);
            if (fs.existsSync(fullPath)) {
                return { contents: fs.readFileSync(fullPath, 'utf8') };
            }
        }
        
        return { error: 'File not found: ' + importPath };
    }
    
    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    
    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            errors.forEach(e => logError(e.formattedMessage));
            throw new Error(`Compilation failed for ${contractName}`);
        }
        output.errors.filter(e => e.severity === 'warning').forEach(e => logWarning(e.formattedMessage));
    }
    
    const contractOutput = output.contracts[contractName + '.sol'][contractName];
    
    logSuccess(`${contractName} compiled successfully`);
    
    return {
        abi: contractOutput.abi,
        bytecode: contractOutput.evm.bytecode.object,
        deployedBytecode: contractOutput.evm.deployedBytecode.object,
        metadata: contractOutput.metadata
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// DEPLOYMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

async function deployContract(name, compiled, constructorArgs, wallet, nonce) {
    logInfo(`Deploying ${name}...`);
    
    const factory = new ethers.ContractFactory(compiled.abi, '0x' + compiled.bytecode, wallet);
    
    const deployTx = await factory.getDeployTransaction(...constructorArgs);
    deployTx.nonce = nonce;
    deployTx.gasPrice = CONFIG.gasPrice;
    deployTx.gasLimit = CONFIG.gasLimit;
    
    const tx = await wallet.sendTransaction(deployTx);
    logInfo(`  Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    const address = receipt.contractAddress;
    
    logSuccess(`${name} deployed at: ${address}`);
    
    return {
        name,
        address,
        txHash: tx.hash,
        abi: compiled.abi,
        bytecode: compiled.bytecode,
        constructorArgs
    };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

async function verifyContract(contract, sourceCode) {
    logInfo(`Verifying ${contract.name}...`);
    
    // Encode constructor arguments
    let constructorArgsEncoded = '';
    if (contract.constructorArgs && contract.constructorArgs.length > 0) {
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const constructor = contract.abi.find(x => x.type === 'constructor');
        if (constructor && constructor.inputs.length > 0) {
            const types = constructor.inputs.map(i => i.type);
            constructorArgsEncoded = abiCoder.encode(types, contract.constructorArgs).slice(2);
        }
    }
    
    const params = new URLSearchParams({
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: contract.address,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: contract.name,
        compilerversion: `v${CONFIG.compiler.version}+commit.e11b9ed9`,
        optimizationUsed: '1',
        runs: CONFIG.compiler.settings.optimizer.runs.toString(),
        evmversion: CONFIG.compiler.settings.evmVersion,
        constructorArguements: constructorArgsEncoded
    });
    
    return new Promise((resolve) => {
        const postData = params.toString();
        
        const options = {
            hostname: 'explorer.lemonchain.io',
            port: 443,
            path: '/api?module=contract&action=verifysourcecode',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === '1' || result.message === 'OK') {
                        logSuccess(`${contract.name} verification submitted: ${result.result}`);
                        resolve({ success: true, result: result.result });
                    } else {
                        logWarning(`${contract.name} verification response: ${result.message || result.result}`);
                        resolve({ success: false, result: result.message || result.result });
                    }
                } catch (e) {
                    logWarning(`${contract.name} verification parse error: ${e.message}`);
                    resolve({ success: false, result: e.message });
                }
            });
        });
        
        req.on('error', (e) => {
            logWarning(`${contract.name} verification request error: ${e.message}`);
            resolve({ success: false, result: e.message });
        });
        
        req.write(postData);
        req.end();
    });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MAIN DEPLOYMENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

async function main() {
    logHeader('DCB TREASURY V5 DEPLOYMENT');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceInEther = ethers.formatEther(balance);
    
    log(`\n  Deployer: ${wallet.address}`, COLORS.white);
    log(`  Balance:  ${balanceInEther} LEMX`, COLORS.white);
    log(`  Chain ID: ${CONFIG.chainId}`, COLORS.white);
    log(`  Compiler: solc ${CONFIG.compiler.version}`, COLORS.white);
    log(`  EVM:      ${CONFIG.compiler.settings.evmVersion}`, COLORS.white);
    log(`  viaIR:    ${CONFIG.compiler.settings.viaIR}`, COLORS.white);
    
    if (parseFloat(balanceInEther) < 1) {
        throw new Error('Insufficient balance for deployment');
    }
    
    // Contract paths
    const contractsDir = __dirname + '/contracts';
    const contracts = [
        { name: 'PriceOracle', file: 'PriceOracle.sol' },
        { name: 'USDTokenized', file: 'USDTokenized.sol' },
        { name: 'LockReserve', file: 'LockReserve.sol' },
        { name: 'VUSDMinter', file: 'VUSDMinter.sol' },
        { name: 'MultichainBridge', file: 'MultichainBridge.sol' }
    ];
    
    // Compile all contracts
    logHeader('COMPILATION');
    const compiled = {};
    for (const c of contracts) {
        compiled[c.name] = compileContract(c.name, path.join(contractsDir, c.file));
    }
    
    // Deploy contracts
    logHeader('DEPLOYMENT');
    let nonce = await provider.getTransactionCount(wallet.address);
    const deployed = {};
    
    // 1. PriceOracle
    deployed.PriceOracle = await deployContract(
        'PriceOracle',
        compiled.PriceOracle,
        [wallet.address],
        wallet,
        nonce++
    );
    
    // 2. USDTokenized
    deployed.USDTokenized = await deployContract(
        'USDTokenized',
        compiled.USDTokenized,
        [wallet.address],
        wallet,
        nonce++
    );
    
    // 3. LockReserve
    deployed.LockReserve = await deployContract(
        'LockReserve',
        compiled.LockReserve,
        [wallet.address, deployed.USDTokenized.address],
        wallet,
        nonce++
    );
    
    // 4. VUSDMinter
    deployed.VUSDMinter = await deployContract(
        'VUSDMinter',
        compiled.VUSDMinter,
        [wallet.address, deployed.USDTokenized.address, deployed.LockReserve.address, deployed.PriceOracle.address],
        wallet,
        nonce++
    );
    
    // 5. MultichainBridge
    deployed.MultichainBridge = await deployContract(
        'MultichainBridge',
        compiled.MultichainBridge,
        [wallet.address, wallet.address],
        wallet,
        nonce++
    );
    
    // Verify contracts
    logHeader('VERIFICATION');
    for (const c of contracts) {
        const sourcePath = path.join(contractsDir, c.file);
        const sourceCode = fs.readFileSync(sourcePath, 'utf8');
        await verifyContract(deployed[c.name], sourceCode);
        await new Promise(r => setTimeout(r, 3000)); // Wait between verifications
    }
    
    // Summary
    logHeader('DEPLOYMENT SUMMARY');
    log('\n  ╔══════════════════════════════════════════════════════════════════╗', COLORS.green);
    log('  ║                    DEPLOYED CONTRACTS                            ║', COLORS.green);
    log('  ╠══════════════════════════════════════════════════════════════════╣', COLORS.green);
    
    for (const [name, data] of Object.entries(deployed)) {
        log(`  ║  ${name.padEnd(20)} ${data.address}  ║`, COLORS.white);
    }
    
    log('  ╠══════════════════════════════════════════════════════════════════╣', COLORS.green);
    log(`  ║  VUSD Contract:      ${CONFIG.vusdContract}  ║`, COLORS.cyan);
    log(`  ║  Minter Wallet:      ${CONFIG.minterWallet}  ║`, COLORS.cyan);
    log('  ╚══════════════════════════════════════════════════════════════════╝', COLORS.green);
    
    // Save deployment info
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        chainId: CONFIG.chainId,
        deployer: wallet.address,
        compiler: CONFIG.compiler,
        contracts: deployed,
        vusdContract: CONFIG.vusdContract,
        minterWallet: CONFIG.minterWallet
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'deployment-v5-result.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    logSuccess('\nDeployment info saved to deployment-v5-result.json');
    
    return deployed;
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        logError(err.message);
        process.exit(1);
    });
