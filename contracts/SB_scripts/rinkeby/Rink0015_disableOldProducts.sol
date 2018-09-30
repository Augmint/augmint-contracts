/* Disable products in old contracts */

pragma solidity 0.4.24;

import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../StabilityBoardProxy.sol";


contract Rink0015_disableOldProducts {

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x64A31038dfD0a085A51C8695329680564Cb19c0a);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    LoanManager public constant OLD_LOAN_MANAGER = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);
    Locker public constant OLD_LOCKER = Locker(0xF74c0CB2713214808553CDA5C78f92219478863d);

    function execute(Rink0015_disableOldProducts /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Disable old loan products
         ******************************************************************************/
        OLD_LOAN_MANAGER.setLoanProductActiveState(15, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(16, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(17, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(18, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(19, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(20, false);

        OLD_LOAN_MANAGER.setLoanProductActiveState(21, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(22, false);

        /******************************************************************************
         * Disable old lock products
         ******************************************************************************/
        OLD_LOCKER.setLockProductActiveState(5, false);
        OLD_LOCKER.setLockProductActiveState(6, false);
        OLD_LOCKER.setLockProductActiveState(7, false);
        OLD_LOCKER.setLockProductActiveState(8, false);
        OLD_LOCKER.setLockProductActiveState(9, false);
        OLD_LOCKER.setLockProductActiveState(10, false);

        OLD_LOCKER.setLockProductActiveState(11, false);
        OLD_LOCKER.setLockProductActiveState(12, false);
    }
}
