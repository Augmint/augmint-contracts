/* script to setup contracts after full redeploy on Rinkeby.
    called via  StabilityBoardSignerContract (MultiSig) but deployer account is the only signer yet because
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


contract Rink0001_initNewContracts {
    address constant RATES_FEEDER_ACCOUNT = 0x8C58187a978979947b88824DCdA5Cb5fD4410387;

    // new contracts
    address constant preTokenAgreementSignerAddress = 0x43732139403ff83f41A6eBfA58C4Ed3D684Cb3d9;
    address constant stabilityBoardSignerAddress = 0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB;

    PreToken constant preToken = PreToken(0xB4d0B60Cd1b2407E80F4295AB84ABBe0b1E98d58);
    Rates constant rates = Rates(0x582971C64de4b5E6Db2D95cf8103CfF7f0FdFF31);
    FeeAccount constant feeAccount = FeeAccount(0x9B26f801C6078B76690b0D954f7fD662e04BE1d1);
    AugmintReserves constant augmintReserves = AugmintReserves(0x8CfEf73Cf8CfBb78868fF8C37525E95AdfabBf09);
    InterestEarnedAccount constant interestEarnedAccount = InterestEarnedAccount(0xDD1B8DFD9094E319a0Eb83c32b47331946CB761F);
    TokenAEur constant tokenAEur = TokenAEur(0x0DA47C59d0C3166DdC2984d72b8C8FaC82275056);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0xa14e0c0e39f00ef051DF516F80E76208B716b0eB);
    LoanManager constant loanManager = LoanManager(0x08281151718983b6dBF0AafB810738D8bd1d2e4a);
    Locker constant locker = Locker(0xd3B0D67B30aAF25b5d644DF6e8c520B263D3De5B);
    Exchange constant exchange = Exchange(0x27e3F7a0D2803B1a24fE05f3b609b8327B451650);

    // Legacy contracts
    /* Dropped support for very old tokens:
        TokenAEur constant oldToken1 = TokenAEur(0x95AA79D7410Eb60f49bfD570b445836d402Bd7b1);
        TokenAEur constant oldToken2 = TokenAEur(0xA35D9de06895a3A2E7eCaE26654b88Fe71C179eA); */
    TokenAEur constant oldToken3 = TokenAEur(0x135893F1A6B3037BB45182841f18F69327366992);
    TokenAEur constant oldToken4 = TokenAEur(0x6C90c10D7A33815C2BaeeD66eE8b848F1D95268e);

    Locker constant oldLocker1 = Locker(0xf98AE1fb568B267A7632BF54579A153C892E2ec2);
    Locker constant oldLocker2 = Locker(0xd0B6136C2E35c288A903E836feB9535954E4A9e9);

    LoanManager constant oldLoanManager1 = LoanManager(0xBdb02f82d7Ad574f9F549895caf41E23a8981b07);
    LoanManager constant oldLoanManager2 = LoanManager(0x214919Abe3f2b7CA7a43a799C4FC7132bBf78e8A);

    // dynamic array needed for addSigners() & removeSigners(). Populated in constructor
    bytes32[] preTokenPermissions;

    constructor() public {
        preTokenPermissions.push("PreTokenAgreementSignerContract");
        preTokenPermissions.push("PreTokenIssueSignerContract");
        preTokenPermissions.push("PermissionGranterContract");
    }

    function execute(Rink0001_initNewContracts /* self, not used */) external {
        // called via StabilityBoardSignerContract
        require(address(this) == stabilityBoardSignerAddress, "only deploy via stabilityboardsigner");

        /******************************************************************************
         * Set up permissions
         ******************************************************************************/
        //  preToken Permissions
        preToken.grantMultiplePermissions(preTokenAgreementSignerAddress, preTokenPermissions);
        preToken.revokePermission(stabilityBoardSignerAddress, "PermissionGranterContract"); // deploy script temporarly granted in order to run this script

        // StabilityBoardSignerContract
        rates.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        feeAccount.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        interestEarnedAccount.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        tokenAEur.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        augmintReserves.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        monetarySupervisor.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        loanManager.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        locker.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");
        exchange.grantPermission(stabilityBoardSignerAddress, "StabilityBoardSignerContract");

        // setRate permissions
        rates.grantPermission(RATES_FEEDER_ACCOUNT, "setRate");

        // set NoFeeTransferContracts permissions
        feeAccount.grantPermission(feeAccount, "NoFeeTransferContracts");
        feeAccount.grantPermission(augmintReserves, "NoFeeTransferContracts");
        feeAccount.grantPermission(interestEarnedAccount, "NoFeeTransferContracts");
        feeAccount.grantPermission(monetarySupervisor, "NoFeeTransferContracts");
        feeAccount.grantPermission(loanManager, "NoFeeTransferContracts");
        feeAccount.grantPermission(locker, "NoFeeTransferContracts");
        feeAccount.grantPermission(exchange, "NoFeeTransferContracts");

        // set MonetarySupervisorContract permissions
        interestEarnedAccount.grantPermission(monetarySupervisor, "MonetarySupervisorContract");
        tokenAEur.grantPermission(monetarySupervisor, "MonetarySupervisorContract");
        augmintReserves.grantPermission(monetarySupervisor, "MonetarySupervisorContract");

        // set LoanManagerContracts permissions
        monetarySupervisor.grantPermission(loanManager, "LoanManagerContracts");

        // set LockerContracts permissions
        monetarySupervisor.grantPermission(locker, "LockerContracts");

        /******************************************************************************
         * Setup permissions for legacy contracts
         ******************************************************************************/

        monetarySupervisor.grantPermission(oldLocker1, "LockerContracts");
        monetarySupervisor.grantPermission(oldLocker2, "LockerContracts");

        monetarySupervisor.grantPermission(oldLoanManager1, "LoanManagerContracts");
        monetarySupervisor.grantPermission(oldLoanManager2, "LoanManagerContracts");

        monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken3, true);
        monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken4, true);

        /* to allow token conversion w/o fee (oldeToken.transferAndNotify transfers to MonetarySupervisor)
        NB: NoFeeTransferContracts used to be set on the token contract in legacy token version.
            Dropping support for those early day tokens on Rinkeby */
        feeAccount.grantPermission(oldToken3, "NoFeeTransferContracts");
        feeAccount.grantPermission(oldToken4, "NoFeeTransferContracts");

        /******************************************************************************
         * Add loan products
         ******************************************************************************/
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(30 days, 990641, 600000, 1000, 50000, true); //  12% p.a.
        loanManager.addLoanProduct(14 days, 996337, 600000, 1000, 50000, true); // 10% p.a.
        loanManager.addLoanProduct(7 days, 998170, 600000, 1000, 50000, true); // 10% p.a.

        loanManager.addLoanProduct(1 hours, 999989, 980000, 2000, 50000, true); // due in 1hr for testing repayments ? p.a.
        loanManager.addLoanProduct(1 seconds, 999999, 990000, 3000, 50000, true); // defaults in 1 secs for testing ? p.a.

        /******************************************************************************
         * Add lock products
         ******************************************************************************/
        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        locker.addLockProduct(4019, 30 days, 1000, true);  // 5% p.a.
        locker.addLockProduct(1506, 14 days, 1000, true);  // 4% p.a.
        locker.addLockProduct(568, 7 days, 1000, true);    //  3% p.a.

        locker.addLockProduct(3, 1 hours, 2000, true); // for testing, ~2.66% p.a.
        locker.addLockProduct(1 , 1 minutes, 3000, true); // for testing, ~69.15% p.a.
    }

}
