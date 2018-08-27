const Exchange = artifacts.require("./Exchange.sol");
const Migrations = artifacts.require("./Migrations.sol");

const STABILITYBOARDPROXY_ADDRESS = "0x44022C28766652EC5901790E53CEd7A79a19c10A";
const TOKENAEUR_ADDRESS = "0xe54f61d6EaDF03b658b3354BbD80cF563fEca34c";
const RATES_ADDRESS = "0xf25638C7d37fCa0cBc124b3925eCe156a20e1f03";

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Exchange, STABILITYBOARDPROXY_ADDRESS, TOKENAEUR_ADDRESS, RATES_ADDRESS);

        console.log(" Done with migration step 26. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(26);
    });
};
