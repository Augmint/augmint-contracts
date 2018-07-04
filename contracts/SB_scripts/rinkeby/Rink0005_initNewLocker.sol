/* adjust interest rates
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../FeeAccount.sol";
import "../../MonetarySupervisor.sol";


contract Rink0005_initNewLocker {

    LoanManager constant loanManager = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);
    Locker constant locker = Locker(0x5B94AaF241E8039ed6d3608760AE9fA7186767d7);
    FeeAccount constant feeAccount = FeeAccount(0x0F5983a6d760BF6E385339af0e67e87420d413EC);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8);

    address constant stabilityBoardProxyAddress = 0x44022C28766652EC5901790E53CEd7A79a19c10A;

    function execute(Rink0005_initNewLocker /* self (not used)*/ ) external {

        locker.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        feeAccount.grantPermission(locker, "NoTransferFee");
        monetarySupervisor.grantPermission(locker, "Locker");

        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        locker.addLockProduct(9864, 30 days, 1000, true);  // 12% p.a.
        locker.addLockProduct(4220, 14 days, 1000, true);  // 11% p.a.
        locker.addLockProduct(1918, 7 days, 1000, true);    // 10% p.a.

        locker.addLockProduct(100, 1 hours, 2000, true); // for testing, ~87.60% p.a.
        locker.addLockProduct(2 , 1 minutes, 3000, true); // for testing, ~105.12% p.a.

    }

}
