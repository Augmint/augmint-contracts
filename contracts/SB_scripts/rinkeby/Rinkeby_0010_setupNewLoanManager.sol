/* Set up new loanmanager - to be run via the new proxy, only execute after Rinkeby_0009_migrateToNewProxy has been run in old proxy! */

pragma solidity 0.4.24;

import "../../LoanManager.sol";
import "../../StabilityBoardProxy.sol";
import "../../FeeAccount.sol";
import "../../MonetarySupervisor.sol";

contract Rinkeby_0010_setupNewLoanManager {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x9bB8F0855B8bbaEa064bCe9b4Ef88bC22E649aF5);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x99928c5121dE38cA6D23C7645CC9697a7263e859);

    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xaa16EdE9093BB4140e2715ED9a1E41cdFD9D9c29);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x4A7F6EcbE8B324A55b85adcc45313A412957B8ea);

    function execute(Rinkeby_0010_setupNewLoanManager /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        // StabilityBoard permission
        LOAN_MANAGER.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");

        // NoTransferFee permission
        FEE_ACCOUNT.grantPermission(address(LOAN_MANAGER), "NoTransferFee");

        // LoanManager permission
        MONETARY_SUPERVISOR.grantPermission(address(LOAN_MANAGER), "LoanManager");

        /******************************************************************************
         * Add loan products
         ******************************************************************************/
        // term (in sec), discountRate, initialCollateralRatio (ppm), minDisbursedAmount (token),
        // defaultingFeePt (ppm), isActive, minCollateralRatio (ppm)

        LOAN_MANAGER.addLoanProduct(365 days, 1000000, 1800000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(180 days, 1000000, 1800000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(90 days, 1000000, 1800000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(30 days, 1000000, 1800000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(14 days, 1000000, 1800000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(7 days, 1000000, 1800000, 800, 100000, true, 1200000);

        LOAN_MANAGER.addLoanProduct(1 hours, 1000000, 1500000, 400, 50000, true, 1150000);
        LOAN_MANAGER.addLoanProduct(1 minutes, 1000000, 1500000, 400, 50000, true, 1150000);

        // discountRate: 1000000 => zero interest
        // initialCollateralRatio: 1800000 => 180%
        // minCollateralRatio: 1200000 => 120%
        // minDisbursedAmount: 800 => 8 AEUR (extra +25% on frontend!)
        // defaultingFeePt: 100000 => 10%

        // for the extra short term products slightly different values:
        // zero / 150% / 115% / 4 AEUR / 5%
    }
}