/* Migrate rinkeby contracts to the new StabilityBoardProxy - to be run via the old proxy! */

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

contract Rinkeby_0009_migrateToNewProxy {

    /******************************************************************************
     * StabilityBoardProxies
     ******************************************************************************/
    StabilityBoardProxy public constant OLD_STABILITY_BOARD_PROXY = StabilityBoardProxy(0xa612de13B629a1FF790c1f4E41d0422d2bB50a30);
    StabilityBoardProxy public constant NEW_STABILITY_BOARD_PROXY = StabilityBoardProxy(0x9bB8F0855B8bbaEa064bCe9b4Ef88bC22E649aF5);


    /******************************************************************************
     * Contracts
     ******************************************************************************/

    AugmintReserves public constant AUGMINT_RESERVES_1 = AugmintReserves(0xC036a1DD59Ac55e2fB6b3D7416cb4ECC44605834);
    Exchange public constant EXCHANGE_1 = Exchange(0xDF47D51028DafF13424F42523FdAc73079ab901b);
    FeeAccount public constant FEE_ACCOUNT_1 = FeeAccount(0xB77F9cDdA72eEC47a57793Be088C7b523f6b5014);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT_1 = InterestEarnedAccount(0x489cbf1674b575e6dFcFF0A4F2BBc74f7e9DDe28);
    LoanManager public constant LOAN_MANAGER_1 = LoanManager(0x6CB7731c78E677f85942B5f1D646b3485E5820c1);
    Locker public constant LOCKER_1 = Locker(0x6d84aB6c385B827E58c358D078AC7b1C61b68821);
    MonetarySupervisor public constant MONETARY_SUPERVISOR_1 = MonetarySupervisor(0xCeC3574ECa89409b15a8A72A6E737C4171457871);
    Rates public constant RATES_1 = Rates(0xDfA3a0aEb9645a55b684CB3aCE8C42D018405bDa);
    TokenAEur public constant TOKEN_AEUR_1 = TokenAEur(0x0557183334Edc23a666201EDC6b0AA2787e2ad3F);

    AugmintReserves public constant AUGMINT_RESERVES_2 = AugmintReserves(0x33Bec125657470e53887400666BdeeD360b2168A);
    Exchange public constant EXCHANGE_2 = Exchange(0xe5d6D0c107eaE79d2D30798F252Ac6FF5ECAd459);
    FeeAccount public constant FEE_ACCOUNT_2 = FeeAccount(0xaa16EdE9093BB4140e2715ED9a1E41cdFD9D9c29);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT_2 = InterestEarnedAccount(0xDD96979697b76787b5062084eEA60BF929ddD844);
    LoanManager public constant LOAN_MANAGER_2 = LoanManager(0x3792c5a5077DacfE331B81837ef73bC0Ea721d90);
    Locker public constant LOCKER_2 = Locker(0xc0B97fE5CAD0d43D0c974C4E9A00312dc661f8Ab);
    MonetarySupervisor public constant MONETARY_SUPERVISOR_2 = MonetarySupervisor(0x4A7F6EcbE8B324A55b85adcc45313A412957B8ea);
    Rates public constant RATES_2 = Rates(0xEE8C7a3e99945A5207Dca026504d67527125Da9C);
    TokenAEur public constant TOKEN_AEUR_2 = TokenAEur(0x79065a165Ec09E6A89D584a14872802717FE12a3);

    // Note: both of the above loanmanagers (#1 and #2) are "legacy" (a.k.a. "pre-margin"), the new loanmanager (#3) was already deployed under the new proxy.

    function execute(Rinkeby_0009_migrateToNewProxy /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(OLD_STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Grant permissions for new proxy
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");

        AUGMINT_RESERVES_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "StabilityBoard");

        // PermissionGranter permission
        AUGMINT_RESERVES_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR_1.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");

        AUGMINT_RESERVES_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR_2.grantPermission(address(NEW_STABILITY_BOARD_PROXY), "PermissionGranter");

        /******************************************************************************
         * Revoke permissions for old proxy
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");

        AUGMINT_RESERVES_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "StabilityBoard");

        // PermissionGranter permission
        AUGMINT_RESERVES_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR_1.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");

        AUGMINT_RESERVES_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        EXCHANGE_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        FEE_ACCOUNT_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        INTEREST_EARNED_ACCOUNT_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOAN_MANAGER_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        LOCKER_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        MONETARY_SUPERVISOR_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        RATES_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");
        TOKEN_AEUR_2.revokePermission(address(OLD_STABILITY_BOARD_PROXY), "PermissionGranter");

    }
}