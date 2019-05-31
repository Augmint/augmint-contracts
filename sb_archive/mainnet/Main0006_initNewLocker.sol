/* grant permissions & add lock products to new locker contract
It  sets up the products with different interest rates than in old locker and
    introduces two new lock products: 90 days and 180 days term
    NB: once UI is switched over to new locker, products in old locker
        should be disabled to prevent ppl keep using locker directly
*/

pragma solidity 0.4.24;

import "../../Locker.sol";
import "../../FeeAccount.sol";
import "../../MonetarySupervisor.sol";


contract Main0006_initNewLocker {

    Locker constant newLocker = Locker(0x26438D7c52cE617dFc75A2F02eE816557f01e5Bb);
    FeeAccount constant feeAccount = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);

    address constant stabilityBoardProxyAddress = 0x4686f017D456331ed2C1de66e134D8d05B24413D;

    function execute(Main0006_initNewLocker /* self (not used)*/ ) external {

        newLocker.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        feeAccount.grantPermission(newLocker, "NoTransferFee");
        monetarySupervisor.grantPermission(newLocker, "Locker");

        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        newLocker.addLockProduct(36987, 180 days, 1000, true);  // 7.5% p.a.
        newLocker.addLockProduct(18494, 90 days, 1000, true);  // 7.5% p.a.
        newLocker.addLockProduct(7398, 30 days, 1000, true);  // 9% p.a.
        newLocker.addLockProduct(3453, 14 days, 1000, true);  // 9% p.a.
        newLocker.addLockProduct(1727, 7 days, 1000, true);    // 9% p.a.

    }

}
