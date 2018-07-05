/*
Fix previous Rink0005_initNewLocker script where new lock products wrongly added to old locker contract:
- disable producs (duplicate) in oldLocker added by Rink0005_initNewLocker
- grant permissions & add lock products to new locker contract
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../FeeAccount.sol";
import "../../MonetarySupervisor.sol";


contract Rink0006_fixInitNewLocker {

    LoanManager constant loanManager = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);
    Locker constant oldLocker = Locker(0x5B94AaF241E8039ed6d3608760AE9fA7186767d7);
    Locker constant newLocker = Locker(0xf74c0cb2713214808553cda5c78f92219478863d);
    FeeAccount constant feeAccount = FeeAccount(0x0F5983a6d760BF6E385339af0e67e87420d413EC);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8);

    address constant stabilityBoardProxyAddress = 0x44022C28766652EC5901790E53CEd7A79a19c10A;

    function execute(Rink0006_fixInitNewLocker /* self (not used)*/ ) external {

        oldLocker.setLockProductActiveState(10, false);
        oldLocker.setLockProductActiveState(11, false);
        oldLocker.setLockProductActiveState(12, false);
        oldLocker.setLockProductActiveState(13, false);
        oldLocker.setLockProductActiveState(14, false);

        newLocker.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        feeAccount.grantPermission(newLocker, "NoTransferFee");
        monetarySupervisor.grantPermission(newLocker, "Locker");

        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        newLocker.addLockProduct(9864, 30 days, 1000, true);  // 12% p.a.
        newLocker.addLockProduct(4220, 14 days, 1000, true);  // 11% p.a.
        newLocker.addLockProduct(1918, 7 days, 1000, true);    // 10% p.a.

        newLocker.addLockProduct(100, 1 hours, 2000, true); // for testing, ~87.60% p.a.
        newLocker.addLockProduct(2 , 1 minutes, 3000, true); // for testing, ~105.12% p.a.

    }

}
