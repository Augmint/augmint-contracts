/* Setup new and legacy contract dependencies */

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

contract Rinkeby_0006_postDeploySetup {

    /******************************************************************************
     * StabilityBoardProxy
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xa612de13B629a1FF790c1f4E41d0422d2bB50a30);

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    AugmintReserves public constant NEW_AUGMINT_RESERVES = AugmintReserves(0x33Bec125657470e53887400666BdeeD360b2168A);
    Exchange public constant NEW_EXCHANGE = Exchange(0xe5d6D0c107eaE79d2D30798F252Ac6FF5ECAd459);
    FeeAccount public constant NEW_FEE_ACCOUNT = FeeAccount(0xaa16EdE9093BB4140e2715ED9a1E41cdFD9D9c29);
    InterestEarnedAccount public constant NEW_INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0xDD96979697b76787b5062084eEA60BF929ddD844);
    LoanManager public constant NEW_LOAN_MANAGER = LoanManager(0x3792c5a5077DacfE331B81837ef73bC0Ea721d90);
    Locker public constant NEW_LOCKER = Locker(0xc0B97fE5CAD0d43D0c974C4E9A00312dc661f8Ab);
    MonetarySupervisor public constant NEW_MONETARY_SUPERVISOR = MonetarySupervisor(0x4A7F6EcbE8B324A55b85adcc45313A412957B8ea);
    Rates public constant NEW_RATES = Rates(0xEE8C7a3e99945A5207Dca026504d67527125Da9C);
    TokenAEur public constant NEW_TOKEN_AEUR = TokenAEur(0x79065a165Ec09E6A89D584a14872802717FE12a3);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    AugmintReserves public constant OLD_AUGMINT_RESERVES = AugmintReserves(0xC036a1DD59Ac55e2fB6b3D7416cb4ECC44605834);
    Exchange public constant OLD_EXCHANGE = Exchange(0xDF47D51028DafF13424F42523FdAc73079ab901b);
    FeeAccount public constant OLD_FEE_ACCOUNT = FeeAccount(0xB77F9cDdA72eEC47a57793Be088C7b523f6b5014);
    InterestEarnedAccount public constant OLD_INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x489cbf1674b575e6dFcFF0A4F2BBc74f7e9DDe28);
    LoanManager public constant OLD_LOAN_MANAGER = LoanManager(0x6CB7731c78E677f85942B5f1D646b3485E5820c1);
    Locker public constant OLD_LOCKER = Locker(0x6d84aB6c385B827E58c358D078AC7b1C61b68821);
    MonetarySupervisor public constant OLD_MONETARY_SUPERVISOR = MonetarySupervisor(0xCeC3574ECa89409b15a8A72A6E737C4171457871);
    Rates public constant OLD_RATES = Rates(0xDfA3a0aEb9645a55b684CB3aCE8C42D018405bDa);
    TokenAEur public constant OLD_TOKEN_AEUR = TokenAEur(0x0557183334Edc23a666201EDC6b0AA2787e2ad3F);

    function execute(Rinkeby_0006_postDeploySetup /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");


        /******************************************************************************
         * Migrate KPIs from old MonetarySupervisor
         ******************************************************************************/
        uint oldTotalLoan = OLD_MONETARY_SUPERVISOR.totalLoanAmount();
        uint oldTotalLock = OLD_MONETARY_SUPERVISOR.totalLockedAmount();
        NEW_MONETARY_SUPERVISOR.adjustKPIs(oldTotalLoan, oldTotalLock);


        /******************************************************************************
         * Set new MonetarySupervisor in old Locker
         ******************************************************************************/
        OLD_LOCKER.setMonetarySupervisor(NEW_MONETARY_SUPERVISOR);

        /******************************************************************************
         * Set new Rates and MonetarySupervisor in old LoanManager
         ******************************************************************************/
        OLD_LOAN_MANAGER.setSystemContracts(NEW_RATES, NEW_MONETARY_SUPERVISOR);


        /******************************************************************************
         * Disable old loan products
         ******************************************************************************/
        OLD_LOAN_MANAGER.setLoanProductActiveState(0, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(1, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(2, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(3, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(4, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(5, false);

        OLD_LOAN_MANAGER.setLoanProductActiveState(6, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(7, false);

        /******************************************************************************
         * Disable old lock products
         ******************************************************************************/
        OLD_LOCKER.setLockProductActiveState(0, false);
        OLD_LOCKER.setLockProductActiveState(1, false);
        OLD_LOCKER.setLockProductActiveState(2, false);
        OLD_LOCKER.setLockProductActiveState(3, false);
        OLD_LOCKER.setLockProductActiveState(4, false);
        OLD_LOCKER.setLockProductActiveState(5, false);

        OLD_LOCKER.setLockProductActiveState(6, false);
        OLD_LOCKER.setLockProductActiveState(7, false);
    }
}