/* Eliminate transfer fee */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../FeeAccount.sol";

contract Rinkeby_0012_noTransferFee {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x9bB8F0855B8bbaEa064bCe9b4Ef88bC22E649aF5);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xaa16EdE9093BB4140e2715ED9a1E41cdFD9D9c29);

    function execute(Rinkeby_0012_noTransferFee /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        FEE_ACCOUNT.setTransferFees(0, 0, 0);
    }
}