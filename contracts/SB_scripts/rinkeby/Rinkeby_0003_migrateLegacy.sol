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

contract Rinkeby_0003_migrateLegacy {

    /******************************************************************************
     * StabilityBoardProxies
     ******************************************************************************/
    StabilityBoardProxy public constant OLD_STABILITY_BOARD_PROXY = StabilityBoardProxy(0x50d281C28846576EAaf679Ab6F3BaaC52b776e72);
    StabilityBoardProxy public constant NEW_STABILITY_BOARD_PROXY = StabilityBoardProxy(0xa612de13B629a1FF790c1f4E41d0422d2bB50a30);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0xC036a1DD59Ac55e2fB6b3D7416cb4ECC44605834);
    Exchange public constant EXCHANGE = Exchange(0xDF47D51028DafF13424F42523FdAc73079ab901b);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xB77F9cDdA72eEC47a57793Be088C7b523f6b5014);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x489cbf1674b575e6dFcFF0A4F2BBc74f7e9DDe28);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x6CB7731c78E677f85942B5f1D646b3485E5820c1);
    Locker public constant LOCKER = Locker(0x6d84aB6c385B827E58c358D078AC7b1C61b68821);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0xCeC3574ECa89409b15a8A72A6E737C4171457871);
    Rates public constant RATES = Rates(0xDfA3a0aEb9645a55b684CB3aCE8C42D018405bDa);
    TokenAEur public constant TOKEN_AEUR = TokenAEur(0x0557183334Edc23a666201EDC6b0AA2787e2ad3F);

    function execute(Rinkeby_0003_migrateLegacy /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(OLD_STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Grant permissions for new proxy
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");

        // PermissionGranter permission
        AUGMINT_RESERVES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");


        /******************************************************************************
         * Revoke permissions for old proxy
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");

        // PermissionGranter permission
        AUGMINT_RESERVES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");

    }
}