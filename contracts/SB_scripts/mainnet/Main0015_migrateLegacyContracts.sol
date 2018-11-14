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
    StabilityBoardProxy public constant OLD_STABILITY_BOARD_PROXY = StabilityBoardProxy(0x4686f017d456331ed2c1de66e134d8d05b24413d);
    StabilityBoardProxy public constant NEW_STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dcbeffdfd3c7b89fced7a9f84);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0x633cb544b2ef1bd9269b2111fd2b66fc05cd3477);
    Exchange public constant EXCHANGE_1 = Exchange(0x8b52b019d237d0bbe8baedf219132d5254e0690b);
    Exchange public constant EXCHANGE_2 = Exchange(0xeae7d30bcd44f27d58985b56add007fcee254abd);
    Exchange public constant EXCHANGE_3 = Exchange(0xafea54badf7a68f93c2235b5f4cc8f02a2b55edd);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xf6b541e1b5e001dcc11827c1a16232759aea730a);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x5c1a44e07541203474d92bdd03f803ea74f6947c);
    LoanManager public constant LOAN_MANAGER = LoanManager(0xcbefaf199b800deeb9ead61f358ee46e06c54070);
    Locker public constant LOCKER_1 = Locker(0x095c0f071fd75875a6b5a1def3f3a993f591080c);
    Locker public constant LOCKER_2 = Locker(0x26438D7c52cE617dFc75A2F02eE816557f01e5Bb);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x1ca4f9d261707af8a856020a4909b777da218868);
    Rates public constant RATES = Rates(0x4babbe57453e2b6af125b4e304256fcbdf744480);
    TokenAEur public constant TOKEN_AEUR = TokenAEur(0x86a635eccefffa70ff8a6db29da9c8db288e40d0);

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