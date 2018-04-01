const StakeHolder50Signer = artifacts.require("./StakeHolder50Signer.sol");
const testHelpers = require("./helpers/testHelpers.js");

let stakeHolder50Signer;
let stakeHolder50SignerWeb3Contract;

const getSigners = async () => {
    // TODO: read  signers so tests can be independent from migration
    return [global.web3v0.eth.accounts[0]];
};

contract("StakeHolder50Signer", accounts => {
    before(async () => {
        stakeHolder50Signer = StakeHolder50Signer.at(StakeHolder50Signer.address);
        stakeHolder50SignerWeb3Contract = new global.web3v1.eth.Contract(
            StakeHolder50Signer.abi,
            StakeHolder50Signer.address
        );
    });

    it("should add then disable a signer when 1 signer", async function() {
        const newSigner = accounts[1];
        const signers = await getSigners();

        const signersCountBefore = (await stakeHolder50Signer.activeSignersCount()).toNumber();
        const txData = stakeHolder50SignerWeb3Contract.methods.setSignerState(accounts[1], true).encodeABI();

        const tx = await testHelpers.signAndExecute(stakeHolder50Signer, stakeHolder50Signer.address, signers, txData);
        testHelpers.logGasUse(this, tx, "multiSig.execute:setSignerState");

        let [signersCountAfter, isSignerAfter] = await Promise.all([
            stakeHolder50Signer.activeSignersCount(),
            stakeHolder50Signer.isSigner(newSigner),
            testHelpers.assertEvent(stakeHolder50Signer, "SignerStateChanged", { signer: newSigner, newState: true })
        ]);
        assert(isSignerAfter);
        assert.equal(signersCountAfter.toNumber(), signersCountBefore + 1);

        const disableTxData = stakeHolder50SignerWeb3Contract.methods.setSignerState(accounts[1], false).encodeABI();
        const disableTx = await testHelpers.signAndExecute(
            stakeHolder50Signer,
            stakeHolder50Signer.address,
            [newSigner, ...signers],
            disableTxData
        );
        testHelpers.logGasUse(this, disableTx, "multiSig.execute:setSignerState");

        [signersCountAfter, isSignerAfter] = await Promise.all([
            stakeHolder50Signer.activeSignersCount(),
            stakeHolder50Signer.isSigner(newSigner)
        ]);
        assert(!isSignerAfter);
        assert.equal(signersCountAfter.toNumber(), signersCountBefore);
    });

    it("should NOT add signer when 2 signers and only 1 signs", async function() {
        const newSigner = accounts[2];
        const signers = await getSigners();
        const txData = stakeHolder50SignerWeb3Contract.methods.setSignerState(accounts[1], true).encodeABI();

        const tx = await testHelpers.signAndExecute(stakeHolder50Signer, stakeHolder50Signer.address, signers, txData);
        testHelpers.logGasUse(this, tx, "multiSig.execute:setSignerState");

        await testHelpers.expectThrow(
            testHelpers.signAndExecute(stakeHolder50Signer, stakeHolder50Signer.address, signers, txData)
        );
    });

    it("should not call setSignerState directly", async function() {
        testHelpers.expectThrow(stakeHolder50Signer.setSignerState(accounts[0], false));
    });
});
