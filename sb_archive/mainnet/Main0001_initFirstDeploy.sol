/* script to setup contracts after full initial deploy on Mainnet.
    called via  StabilityBoardProxy (MultiSig) but deployer account is the only signer yet because
        these working on the new contracts only.
        Stability Board and pretoken signers will be added and deployer will be removed when setup is successful.
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../PreToken.sol";
import  "../../Rates.sol";
import "../../FeeAccount.sol";
import "../../AugmintReserves.sol";
import "../../InterestEarnedAccount.sol";
import "../../TokenAEur.sol";
import "../../MonetarySupervisor.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../Exchange.sol";


contract Main0001_initFirstDeploy {
    address constant DEPLOYER_ACCOUNT = 0x7b534c2D0F9Ee973e0b6FE8D4000cA711A20f22e;
    address constant RATES_FEEDER_ACCOUNT = 0x8C58187a978979947b88824DCdA5Cb5fD4410387;

    // new contracts
    address constant preTokenProxyAddress = 0x1411b3B189B01f6e6d1eA883bFFcbD3a5224934C;
    address constant stabilityBoardProxyAddress = 0x4686f017D456331ed2C1de66e134D8d05B24413D;

    PreToken constant preToken = PreToken(0xeCb782B19Be6E657ae2D88831dD98145A00D32D5);
    Rates constant rates = Rates(0x4babbe57453e2b6AF125B4e304256fCBDf744480);
    FeeAccount constant feeAccount = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    AugmintReserves constant augmintReserves = AugmintReserves(0x633cb544b2EF1bd9269B2111fD2B66fC05cd3477);
    InterestEarnedAccount constant interestEarnedAccount = InterestEarnedAccount(0x5C1a44E07541203474D92BDD03f803ea74f6947c);
    TokenAEur constant tokenAEur = TokenAEur(0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);
    LoanManager constant loanManager = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);
    Locker constant locker = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);
    Exchange constant exchange = Exchange(0x8b52b019d237d0bbe8Baedf219132D5254e0690b);

    function execute(Main0001_initFirstDeploy /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == stabilityBoardProxyAddress, "only deploy via stabilityboardsigner");

        /******************************************************************************
         * Set up permissions
         ******************************************************************************/
        //  preToken Permissions
        bytes32[] memory preTokenPermissions = new bytes32[](2); // dynamic array needed for grantMultiplePermissions()
        preTokenPermissions[0] = "PreTokenSigner";
        preTokenPermissions[1] = "PermissionGranter";
        preToken.grantMultiplePermissions(preTokenProxyAddress, preTokenPermissions);

        // StabilityBoard
        rates.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        feeAccount.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        interestEarnedAccount.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        tokenAEur.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        augmintReserves.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        monetarySupervisor.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        loanManager.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        locker.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");
        exchange.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");

        // RatesFeeder permissions to allow calling setRate()
        rates.grantPermission(RATES_FEEDER_ACCOUNT, "RatesFeeder");

        // set NoTransferFee permissions
        feeAccount.grantPermission(feeAccount, "NoTransferFee");
        feeAccount.grantPermission(augmintReserves, "NoTransferFee");
        feeAccount.grantPermission(interestEarnedAccount, "NoTransferFee");
        feeAccount.grantPermission(monetarySupervisor, "NoTransferFee");
        feeAccount.grantPermission(loanManager, "NoTransferFee");
        feeAccount.grantPermission(locker, "NoTransferFee");
        feeAccount.grantPermission(exchange, "NoTransferFee");

        // set MonetarySupervisor permissions
        interestEarnedAccount.grantPermission(monetarySupervisor, "MonetarySupervisor");
        tokenAEur.grantPermission(monetarySupervisor, "MonetarySupervisor");
        augmintReserves.grantPermission(monetarySupervisor, "MonetarySupervisor");

        // set LoanManager permissions
        monetarySupervisor.grantPermission(loanManager, "LoanManager");

        // set Locker permissions
        monetarySupervisor.grantPermission(locker, "Locker");

        /******************************************************************************
         * Add loan products
         ******************************************************************************/
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(30 days, 990641, 600000, 1000, 50000, true); //  12% p.a.
        loanManager.addLoanProduct(14 days, 996337, 600000, 1000, 50000, true); // 10% p.a.
        loanManager.addLoanProduct(7 days, 998170, 600000, 1000, 50000, true); // 10% p.a.

        /******************************************************************************
         * Add lock products
         ******************************************************************************/
        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        locker.addLockProduct(4019, 30 days, 1000, true);  // 5% p.a.
        locker.addLockProduct(1506, 14 days, 1000, true);  // 4% p.a.
        locker.addLockProduct(568, 7 days, 1000, true);    //  3% p.a.

        /******************************************************************************
         * Revoke PermissionGranter from deployer account
         *   NB: migration scripts mistekanly granted it to deployer account (account[0])
         *          instead of StabilityBoardProxy in constructors
         ******************************************************************************/
         preToken.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         rates.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         feeAccount.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         augmintReserves.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         interestEarnedAccount.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         tokenAEur.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         monetarySupervisor.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         loanManager.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         locker.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");
         exchange.revokePermission(DEPLOYER_ACCOUNT, "PermissionGranter");

         /******************************************************************************
          * Revoke PermissionGranter from this contract on preToken
          * NB: deploy script temporarly granted PermissionGranter to this script
          *   now we can remove it as we granted it to preTokenProxy above
          ******************************************************************************/
         preToken.revokePermission(stabilityBoardProxyAddress, "PermissionGranter");
    }

}
