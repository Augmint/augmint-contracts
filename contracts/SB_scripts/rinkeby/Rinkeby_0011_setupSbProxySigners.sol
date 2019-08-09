pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";

contract Rinkeby_0011_setupSbProxySigners {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x9bB8F0855B8bbaEa064bCe9b4Ef88bC22E649aF5);

    function execute(Rinkeby_0011_setupSbProxySigners /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        address[] memory signersToAdd = new address[](2); // dynamic array needed for addSigners() & removeSigners()
        signersToAdd[0] = 0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87;   // phraktle
        signersToAdd[1] = 0x9aaf197F25d207ecE17DfBeb20780095f7623A23;   // petro
        STABILITY_BOARD_PROXY.addSigners(signersToAdd);
    }
}