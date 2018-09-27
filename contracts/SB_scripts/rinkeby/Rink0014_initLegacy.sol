/* Set up new contracts */

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


contract Rink0014_initLegacy {

    /******************************************************************************
     * External dependencies
     ******************************************************************************/
    address public constant RATES_FEEDER_ACCOUNT = 0x8C58187a978979947b88824DCdA5Cb5fD4410387;

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x64A31038dfD0a085A51C8695329680564Cb19c0a);
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0x4fE7CB2CFD26847C1330E520cd353cDb9942668A);
    Exchange public constant EXCHANGE = Exchange(0xB665d305962fF3bD19f38D93C76463AD567665AD);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0x9CAd4701f220FF4Ee1f183A5B592eec47494f579);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x2956427Eb144be6Ca8bbBdB7c6793af798163AF3);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x2b5c6F7B0d8b7d02109c45e393eF1c5fea61f63F);
    Locker public constant LOCKER = Locker(0x6D3D3FB2d4B4CeC92F93fb8E3a33A1B6E0cd4b50);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x12412E2c271f93e720266BEF16b1AE90fcAdC891);
    Rates public constant RATES = Rates(0x7150331AeA81605332270eF6586FeF50c641c3c5);
    TokenAEur public constant TOKEN_AEUR = TokenAEur(0xda7b0268401888ec1fea129324B82c072149cfC0);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    MonetarySupervisor public constant OLD_MONETARY_SUPERVISOR = MonetarySupervisor(0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8);

    Exchange public constant OLD_EXCHANGE_1 = Exchange(0x65d30E5A6191a507fDA96341f6BA773C4224c0e1);
    Exchange public constant OLD_EXCHANGE_2 = Exchange(0x03fe291F8a30e54Cd05459F368d554B40784cA78);
    Exchange public constant OLD_EXCHANGE_3 = Exchange(0x86ABc21cBB508fcb303f881d6871E4F870Ce041a);
    // Exchange public constant OLD_EXCHANGE_4 = Exchange(0xA2Ed50765110b695816C658D5D6D1d32Bcd03866);  // not supported by frontend
    Exchange public constant OLD_EXCHANGE_5 = Exchange(0xC5B604f8E046Dff26642Ca544c9eb3064E02EcD9);
    // Exchange public constant OLD_EXCHANGE_6 = Exchange(0x27e3F7a0D2803B1a24fE05f3b609b8327B451650);  // not supported by frontend
    Exchange public constant OLD_EXCHANGE_7 = Exchange(0x5e2Be81aB4237c7c08d929c42b9F13cF4f9040D2);
    Exchange public constant OLD_EXCHANGE_8 = Exchange(0x5C35162DBf91C794F1569C5fe1649f0c5283d2f6);
    Exchange public constant OLD_EXCHANGE_9 = Exchange(0x554817688D096ae89fDacCf52E76f629B9Db8f53);

    FeeAccount public constant OLD_FEE_ACCOUNT = FeeAccount(0x0F5983a6d760BF6E385339af0e67e87420d413EC);

    // LoanManager public constant OLD_LOAN_MANAGER_1 = LoanManager(0xFb505462633aE3234760d0ee51C557199AB249dF);  // not supported by frontend
    LoanManager public constant OLD_LOAN_MANAGER_2 = LoanManager(0xEC5E35d8941386C3E08019b0Ad1D4A8C40c7BcBC);
    LoanManager public constant OLD_LOAN_MANAGER_3 = LoanManager(0xBdb02f82d7Ad574f9F549895caf41E23a8981b07);
    LoanManager public constant OLD_LOAN_MANAGER_4 = LoanManager(0x214919Abe3f2b7CA7a43a799C4FC7132bBf78e8A);
    // LoanManager public constant OLD_LOAN_MANAGER_5 = LoanManager(0x08281151718983b6dBF0AafB810738D8bd1d2e4a);  // not supported by frontend
    LoanManager public constant OLD_LOAN_MANAGER_6 = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);

    // Locker public constant OLD_LOCKER_1 = Locker(0x617cf9ba5C9cbEcdD66412Bc1D073B002Aa26426);  // not supported by frontend
    Locker public constant OLD_LOCKER_2 = Locker(0xFb6b4803c590E564a3E6810289AB638b353a1367);
    Locker public constant OLD_LOCKER_3 = Locker(0xf98AE1fb568B267A7632BF54579A153C892E2ec2);
    Locker public constant OLD_LOCKER_4 = Locker(0xd0B6136C2E35c288A903E836feB9535954E4A9e9);
    // Locker public constant OLD_LOCKER_5 = Locker(0xd3B0D67B30aAF25b5d644DF6e8c520B263D3De5B);  // not supported by frontend
    Locker public constant OLD_LOCKER_6 = Locker(0x5B94AaF241E8039ed6d3608760AE9fA7186767d7);
    Locker public constant OLD_LOCKER_7 = Locker(0xF74c0CB2713214808553CDA5C78f92219478863d);

    //TokenAEur public constant OLD_TOKEN_1 = TokenAEur(0x95AA79D7410Eb60f49bfD570b445836d402Bd7b1); // not supported by frontend
    TokenAEur public constant OLD_TOKEN_2 = TokenAEur(0xA35D9de06895a3A2E7eCaE26654b88Fe71C179eA);
    TokenAEur public constant OLD_TOKEN_3 = TokenAEur(0x135893F1A6B3037BB45182841f18F69327366992);
    TokenAEur public constant OLD_TOKEN_4 = TokenAEur(0x6C90c10D7A33815C2BaeeD66eE8b848F1D95268e);
    TokenAEur public constant OLD_TOKEN_5 = TokenAEur(0x0DA47C59d0C3166DdC2984d72b8C8FaC82275056);
    TokenAEur public constant OLD_TOKEN_6 = TokenAEur(0xe54f61d6EaDF03b658b3354BbD80cF563fEca34c);

    function execute(Rink0014_initLegacy /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Setup permissions for legacy contracts
         ******************************************************************************/
        OLD_FEE_ACCOUNT.grantPermission(address(MONETARY_SUPERVISOR), "NoTransferFee");

        // MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER_1), "LoanManager");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER_2), "LoanManager");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER_3), "LoanManager");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER_4), "LoanManager");
        // MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER_5), "LoanManager");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER_6), "LoanManager");

        // MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_1), "Locker");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_2), "Locker");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_3), "Locker");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_4), "Locker");
        // MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_5), "Locker");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_6), "Locker");
        MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_7), "Locker");

        /******************************************************************************
         * Accept legacy tokens
         ******************************************************************************/
        //MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_1, true);
        MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_2, true);
        MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_3, true);
        MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_4, true);
        MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_5, true);
        MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_6, true);

        /******************************************************************************
         * Set new Rates in old Exchange
         ******************************************************************************/
        OLD_EXCHANGE_1.setRatesContract(RATES);
        OLD_EXCHANGE_2.setRatesContract(RATES);
        OLD_EXCHANGE_3.setRatesContract(RATES);
        // OLD_EXCHANGE_4.setRatesContract(RATES);
        OLD_EXCHANGE_5.setRatesContract(RATES);
        // OLD_EXCHANGE_6.setRatesContract(RATES);
        OLD_EXCHANGE_7.setRatesContract(RATES);
        OLD_EXCHANGE_8.setRatesContract(RATES);
        OLD_EXCHANGE_9.setRatesContract(RATES);

        /******************************************************************************
         * Set new MonetarySupervisor in old Locker
         ******************************************************************************/
        // OLD_LOCKER_1.setMonetarySupervisor(MONETARY_SUPERVISOR);
        OLD_LOCKER_2.setMonetarySupervisor(MONETARY_SUPERVISOR);
        OLD_LOCKER_3.setMonetarySupervisor(MONETARY_SUPERVISOR);
        OLD_LOCKER_4.setMonetarySupervisor(MONETARY_SUPERVISOR);
        // OLD_LOCKER_5.setMonetarySupervisor(MONETARY_SUPERVISOR);
        OLD_LOCKER_6.setMonetarySupervisor(MONETARY_SUPERVISOR);
        OLD_LOCKER_7.setMonetarySupervisor(MONETARY_SUPERVISOR);

        /******************************************************************************
         * Set new Rates and MonetarySupervisor in old LoanManager
         ******************************************************************************/
        // OLD_LOAN_MANAGER_1.setSystemContracts(RATES, MONETARY_SUPERVISOR);
        OLD_LOAN_MANAGER_2.setSystemContracts(RATES, MONETARY_SUPERVISOR);
        OLD_LOAN_MANAGER_3.setSystemContracts(RATES, MONETARY_SUPERVISOR);
        OLD_LOAN_MANAGER_4.setSystemContracts(RATES, MONETARY_SUPERVISOR);
        // OLD_LOAN_MANAGER_5.setSystemContracts(RATES, MONETARY_SUPERVISOR);
        OLD_LOAN_MANAGER_6.setSystemContracts(RATES, MONETARY_SUPERVISOR);

        /******************************************************************************
         * Migrate KPIs from old MonetarySupervisor
         ******************************************************************************/
        uint oldTotalLoan = OLD_MONETARY_SUPERVISOR.totalLoanAmount();
        uint oldTotalLock = OLD_MONETARY_SUPERVISOR.totalLockedAmount();
        MONETARY_SUPERVISOR.adjustKPIs(oldTotalLoan, oldTotalLock);
    }
}
