/* Migrate legacy contracts to the new StabilityBoardProxy */

pragma solidity 0.4.24;

import "../../AugmintReserves.sol";
import "../../Exchange.sol";
import "../../FeeAccount.sol";
import "../../InterestEarnedAccount.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../MonetarySupervisor.sol";
import "../../Rates.sol";
import "../../TokenAEur.sol";
import "../../StabilityBoardProxy.sol";

contract Main0015_migrateLegacyContracts {

    /******************************************************************************
     * StabilityBoardProxies
     ******************************************************************************/
    StabilityBoardProxy public constant OLD_STABILITY_BOARD_PROXY = StabilityBoardProxy(0x4686f017D456331ed2C1de66e134D8d05B24413D);
    StabilityBoardProxy public constant NEW_STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0x633cb544b2EF1bd9269B2111fD2B66fC05cd3477);
    Exchange public constant EXCHANGE_1 = Exchange(0x8b52b019d237d0bbe8Baedf219132D5254e0690b);
    Exchange public constant EXCHANGE_2 = Exchange(0xEAe7D30bCD44F27d58985b56ADD007FceE254AbD);
    Exchange public constant EXCHANGE_3 = Exchange(0xaFEA54baDf7A68F93C2235B5F4cC8F02a2b55Edd);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x5C1a44E07541203474D92BDD03f803ea74f6947c);
    LoanManager public constant LOAN_MANAGER = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);
    Locker public constant LOCKER_1 = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);
    Locker public constant LOCKER_2 = Locker(0x26438D7c52cE617dFc75A2F02eE816557f01e5Bb);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);
    Rates public constant RATES = Rates(0x4babbe57453e2b6AF125B4e304256fCBDf744480);
    TokenAEur public constant TOKEN_AEUR = TokenAEur(0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0);

    function execute(Main0015_migrateLegacyContracts /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(OLD_STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Grant permissions for new proxy
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_3.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");

        // PermissionGranter permission
        AUGMINT_RESERVES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_3.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");


        /******************************************************************************
         * Revoke permissions for old proxy
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_3.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");

        // PermissionGranter permission
        AUGMINT_RESERVES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_3.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");

    }
}