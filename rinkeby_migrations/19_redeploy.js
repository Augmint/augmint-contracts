/* full redeploy of latest contracts without setting up anything */
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const PreTokenProxy = artifacts.require("./PreTokenProxy.sol");
const PreToken = artifacts.require("./PreToken.sol");
const Rates = artifacts.require("./Rates.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        const [stabilityBoardProxy, preTokenProxy] = await Promise.all([
            deployer.deploy(StabilityBoardProxy),
            deployer.deploy(PreTokenProxy)
        ]);

        const [preToken, rates, feeAccount, augmintReserves, interestEarnedAccount] = await Promise.all([
            deployer.deploy(PreToken, stabilityBoardProxy.address), // temporary for preToken, init script will change it to preTokenProxy
            deployer.deploy(Rates, stabilityBoardProxy.address),
            deployer.deploy(
                FeeAccount,
                stabilityBoardProxy.address,
                2000, // transferFeePt in parts per million = 0.2%
                2, // min: 0.02 A-EUR
                500 // max fee: 5 A-EUR)
            ),
            deployer.deploy(AugmintReserves, stabilityBoardProxy.address),
            deployer.deploy(InterestEarnedAccount, stabilityBoardProxy.address)
        ]);

        const tokenAEur = await deployer.deploy(TokenAEur, stabilityBoardProxy.address, feeAccount.address);

        const monetarySupervisor = await deployer.deploy(
            MonetarySupervisor,
            stabilityBoardProxy.address,
            tokenAEur.address,
            augmintReserves.address,
            interestEarnedAccount.address,
            200000 /* ltdLockDifferenceLimit */,
            200000 /* ltdLoanDifferenceLimit*/,
            50000 /* allowedLtdDifferenceAmount */
        );

        /*const [loanManager, locker, exchange] = */
        await Promise.all([
            deployer.deploy(
                LoanManager,
                stabilityBoardProxy.address,
                tokenAEur.address,
                monetarySupervisor.address,
                rates.address
            ),
            deployer.deploy(Locker, stabilityBoardProxy.address, TokenAEur.address, MonetarySupervisor.address),

            deployer.deploy(Exchange, stabilityBoardProxy.address, tokenAEur.address, rates.address)
        ]);

        // NB: don't forget to top up earned interest account with new tokens
        console.log(" Done with migration step 19. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(19);
    });
};
