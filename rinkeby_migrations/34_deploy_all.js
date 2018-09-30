const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const Exchange = artifacts.require("./Exchange.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Migrations = artifacts.require("./Migrations.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Rates = artifacts.require("./Rates.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");

const MIGRATION_STEP_NUMBER = 34;

const FEE_ACCOUNT_TRANSFER_FEE_PT = 2000;
const FEE_ACCOUNT_TRANSFER_FEE_MIN = 2;
const FEE_ACCOUNT_TRANSFER_FEE_MAX = 500;

const MONETARY_SUPERVISOR_LOCK_DIFF_LIMIT = 200000;
const MONETARY_SUPERVISOR_LOAN_DIFF_LIMIT = 200000;
const MONETARY_SUPERVISOR_ALLOWED_DIFF_AMOUNT = 1000000;

module.exports = function(deployer) {
    deployer.then(async () => {

        // ### StabilityBoardProxy ###
        await deployer.deploy(StabilityBoardProxy);

        // ### FeeAccount ###
        await deployer.deploy(FeeAccount, StabilityBoardProxy.address, FEE_ACCOUNT_TRANSFER_FEE_PT, FEE_ACCOUNT_TRANSFER_FEE_MIN, FEE_ACCOUNT_TRANSFER_FEE_MAX);

        // ### TokenAEur ###
        await deployer.deploy(TokenAEur, StabilityBoardProxy.address, FeeAccount.address);

        // ### Rates ###
        await deployer.deploy(Rates, StabilityBoardProxy.address);

        // ### AugmintReserves ###
        await deployer.deploy(AugmintReserves, StabilityBoardProxy.address)

        // ### InterestEarnedAccount ###
        await deployer.deploy(InterestEarnedAccount, StabilityBoardProxy.address);

        // ### MonetarySupervisor ###
        await deployer.deploy(MonetarySupervisor, StabilityBoardProxy.address, TokenAEur.address, AugmintReserves.address, InterestEarnedAccount.address, MONETARY_SUPERVISOR_LOCK_DIFF_LIMIT, MONETARY_SUPERVISOR_LOAN_DIFF_LIMIT, MONETARY_SUPERVISOR_ALLOWED_DIFF_AMOUNT);

        // ### Exchange ###
        await deployer.deploy(Exchange, StabilityBoardProxy.address, TokenAEur.address, Rates.address);

        // ### LoanManager ###
        await deployer.deploy(LoanManager, StabilityBoardProxy.address, TokenAEur.address, MonetarySupervisor.address, Rates.address);

        // ### Locker ###
        await deployer.deploy(Locker, StabilityBoardProxy.address, TokenAEur.address, MonetarySupervisor.address);

        // ### Migrations ###
        await deployer.deploy(Migrations);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(Migrations.address).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
