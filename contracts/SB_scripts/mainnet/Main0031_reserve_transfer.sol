pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../AugmintReserves.sol";

contract Main0031_reserve_transfer {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0x65F30f8DD20c707C1938CcAd7416c7381E6eB9C8);
    address public constant TARGET_ADDRESS = 0x6F67E0A5588564c0EcBd8161Fc7306B5e133291A;

    function execute(Main0031_reserve_transfer /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        AUGMINT_RESERVES.migrate(TARGET_ADDRESS, 17487307795593659456);
    }
}