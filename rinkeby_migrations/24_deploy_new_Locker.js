const Locker = artifacts.require("./Locker.sol");
const Migrations = artifacts.require("./Migrations.sol");
const Rink0005_initNewLocker = artifacts.require("./Rink0005_initNewLocker.sol");

const STABILITYBOARDPROXY_ADDRESS = "0x44022C28766652EC5901790E53CEd7A79a19c10A";
const TOKENAEUR_ADDRESS = "0xe54f61d6EaDF03b658b3354BbD80cF563fEca34c";
const MONETARYSUPERVISOR_ADDRESS = "0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8";

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Locker, STABILITYBOARDPROXY_ADDRESS, TOKENAEUR_ADDRESS, MONETARYSUPERVISOR_ADDRESS);

        await deployer.deploy(Rink0005_initNewLocker);

        console.log(" Done with migration step 24. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(24);
    });
};
