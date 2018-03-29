const testHelpers = new require("./testHelpers.js");
const StakeHolder50Signer = artifacts.require("./StakeHolder50Signer.sol");
const PreToken = artifacts.require("./PreToken.sol");

module.exports = {
    addAgreement,
    issueTo,
    signAndExecute,
    get preTokenWeb3Contract() {
        return preTokenWeb3Contract;
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
    const tx = await signAndExecute(signers, txData);
    testHelpers.logGasUse(testInstance, tx, "multiSig.execute:addAgreement");
}

async function issueTo(testInstance, signers, to, amount) {
    const txData = preTokenWeb3Contract.methods.issueTo(to, amount).encodeABI();
    const tx = await signAndExecute(signers, txData);
    testHelpers.logGasUse(testInstance, tx, "multiSig.execute:issueTo");
}

async function signAndExecute(signers, txData) {
    const nonce = (await multiSig.nonce()).toNumber();

    const txHash = global.web3v1.utils.soliditySha3(multiSig.address, preToken.address, 0, txData, nonce);

    const sigs = { v: [], r: [], s: [] };

    for (let i = 0; i < signers.length; i++) {
        const signature = await global.web3v1.eth.sign(txHash, signers[i]);
        const sig = signature.substr(2, signature.length);
        sigs.r.push("0x" + sig.substr(0, 64));
        sigs.s.push("0x" + sig.substr(64, 64));
        sigs.v.push(global.web3v0.toDecimal(sig.substr(128, 2)) + 27);
    }
    const tx = await multiSig.execute(sigs.v, sigs.r, sigs.s, preToken.address, 0, txData);
    return tx;
}
