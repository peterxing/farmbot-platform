// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply ERC20 used for platform entitlement.
/// @dev Decimals set to 0 to match "tokens" as integer entitlement units.
contract FarmbotOpsToken is ERC20 {
    uint8 private constant _DECIMALS = 0;

    constructor(
        string memory name_,
        string memory symbol_,
        address initialHolder,
        uint256 maxSupply
    ) ERC20(name_, symbol_) {
        _mint(initialHolder, maxSupply);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
}
