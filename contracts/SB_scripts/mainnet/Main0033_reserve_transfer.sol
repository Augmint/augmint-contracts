pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../AugmintReserves.sol";

contract Main0033_reserve_transfer {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0x65F30f8DD20c707C1938CcAd7416c7381E6eB9C8);
    address public constant TARGET_ADDRESS = 0x53DBF6E8fe46307C7536eAbb0D90CADA3e732716;

    function execute(Main0032_reserve_transfer /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        AUGMINT_RESERVES.migrate(TARGET_ADDRESS, AUGMINT_RESERVES.balance);
    }
}