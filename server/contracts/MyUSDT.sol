// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * 🪙 MyUSDT - ERC-20 Personalizado con Capacidad de MINT
 * 
 * ✅ Permite MINT real
 * ✅ Controlado por owner
 * ✅ Compatible con USDT
 * ✅ 6 decimales como USDT
 */
contract MyUSDT is ERC20, Ownable {
    // Eventos
    event USDTMinted(address indexed to, uint256 amount);
    event USDTBurned(address indexed from, uint256 amount);

    constructor() ERC20("MyUSDT", "MUSDT") Ownable(msg.sender) {
        // Inicializar con 0 tokens
        // Solo el owner puede mintear
    }

    /**
     * ✅ FUNCIÓN PRINCIPAL: Mintear tokens
     * Solo el owner puede mintear
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        emit USDTMinted(to, amount);
    }

    /**
     * 🔥 Quemar tokens (destruir)
     */
    function burn(uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        _burn(msg.sender, amount);
        emit USDTBurned(msg.sender, amount);
    }

    /**
     * 🔥 Quemar tokens de otro (requiere aprobación)
     */
    function burnFrom(address account, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "Insufficient allowance");
        
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
        emit USDTBurned(account, amount);
    }

    /**
     * 📊 Obtener decimales (6 como USDT)
     */
    function decimals() public view override returns (uint8) {
        return 6;
    }

    /**
     * 📋 Ver supply total
     */
    function totalSupplyFormatted() public view returns (string memory) {
        return string(abi.encodePacked(
            "Total Supply: ",
            uint2str(totalSupply() / 10**6),
            " MyUSDT"
        ));
    }

    /**
     * 🛠️ Utilidad: Convertir uint a string
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len = 0;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}

