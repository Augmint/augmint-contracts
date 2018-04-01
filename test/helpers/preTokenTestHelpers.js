const testHelpers = new require("./testHelpers.js");
const StakeHolder50Signer = artifacts.require("./StakeHolder50Signer.sol");
const PreToken = artifacts.require("./PreToken.sol");

module.exports = {
    addAgreement,
    issueTo,
    get preTokenWeb3Contract() {
        return preTokenWeb3Contract;
    },
    get multiSig() {
        return multiSig;
    }
};

let preTokenWeb3Contract;
let multiSig;
let preToken;

before(async function() {
    preToken = PreToken.at(PreToken.address);
    multiSig = StakeHolder50Signer.at(StakeHolder50Signer.address);

    preTokenWeb3Contract = new global.web3v1.eth.Contract(preToken.abi, preToken.address);
});

async function addAgreement(testInstance, signers, agreement) {
    const txData = preTokenWeb3Contract.methods
        .addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
        .encodeABI();
    const tx = await testHelpers.signAndExecute(multiSig, preToken.address, signers, txData);
    testHelpers.logGasUse(testInstance, tx, "multiSig.execute:addAgreement");
}

async function issueTo(testInstance, signers, to, amount) {
    const txData = preTokenWeb3Contract.methods.issueTo(to, amount).encodeABI();
    const tx = await testHelpers.signAndExecute(multiSig, preToken.address, signers, txData);
    testHelpers.logGasUse(testInstance, tx, "multiSig.execute:issueTo");
}
