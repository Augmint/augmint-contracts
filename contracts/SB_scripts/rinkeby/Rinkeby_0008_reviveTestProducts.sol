/* Re-enable extra short-term test loan & lock products on rinkeby testnetwork  */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";

contract Rinkeby_0008_reviveTestProducts {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xa612de13B629a1FF790c1f4E41d0422d2bB50a30);

    LoanManager public constant LOAN_MANAGER = LoanManager(0x3792c5a5077DacfE331B81837ef73bC0Ea721d90);
    Locker public constant LOCKER = Locker(0xc0B97fE5CAD0d43D0c974C4E9A00312dc661f8Ab);

    function execute(Rinkeby_0008_reviveTestProducts /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        LOCKER.setLockProductActiveState(6, true);
        LOCKER.setLockProductActiveState(7, true);

        LOAN_MANAGER.setLoanProductActiveState(6, true);
        LOAN_MANAGER.setLoanProductActiveState(7, true);
    }
}