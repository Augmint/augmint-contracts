const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const testHelpers = require("./helpers/testHelpers.js");

let stabilityBoardSigner;
let stabilityBoardSignerWeb3Contract;

contract("StabilityBoardSigner", accounts => {
    before(async () => {
        stabilityBoardSigner = StabilityBoardSigner.at(StabilityBoardSigner.address);
        stabilityBoardSignerWeb3Contract = new global.web3v1.eth.Contract(
            StabilityBoardSigner.abi,
            StabilityBoardSigner.address
        );
    });

    it("should add then disable a signer when 1 signer", async function() {
        const newSigner = accounts[1];
        const signers = [global.accounts[0]];

        const signersCountBefore = (await stabilityBoardSigner.activeSignersCount()).toNumber();
        const txData = stabilityBoardSignerWeb3Contract.methods.addSigners([accounts[1]]).encodeABI();

        const tx = await testHelpers.signAndExecute(
            stabilityBoardSigner,
            stabilityBoardSigner.address,
            signers,
            txData,
            "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        testHelpers.logGasUse(this, tx, "multiSig.execute:addSigners");

        let [signersCountAfter, isSignerAfter] = await Promise.all([
            stabilityBoardSigner.activeSignersCount(),
            stabilityBoardSigner.isSigner(newSigner),
            testHelpers.assertEvent(stabilityBoardSigner, "SignerAdded", { signer: newSigner })
        ]);
        assert(isSignerAfter);
        assert.equal(signersCountAfter.toNumber(), signersCountBefore + 1);

        const disableTxData = stabilityBoardSignerWeb3Contract.methods.removeSigners([accounts[1]]).encodeABI();
        const disableTx = await testHelpers.signAndExecute(
            stabilityBoardSigner,
            stabilityBoardSigner.address,
            [newSigner, ...signers],
            disableTxData,
            "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        testHelpers.logGasUse(this, disableTx, "multiSig.execute:addSigners");

        [signersCountAfter, isSignerAfter] = await Promise.all([
            stabilityBoardSigner.activeSignersCount(),
            stabilityBoardSigner.isSigner(newSigner),
            testHelpers.assertEvent(stabilityBoardSigner, "SignerRemoved", { signer: newSigner })
        ]);
        assert(!isSignerAfter);
        assert.equal(signersCountAfter.toNumber(), signersCountBefore);
    });

    it("should NOT add signer when 2 signers and only 1 signs", async function() {
        const signers = [global.accounts[0]];
        const txData = stabilityBoardSignerWeb3Contract.methods.addSigners([accounts[1]]).encodeABI();

        const tx = await testHelpers.signAndExecute(
            stabilityBoardSigner,
            stabilityBoardSigner.address,
            signers,
            txData,
            "0x0000000000000000000000000000000000000000000000000000000000000002"
        );
        testHelpers.logGasUse(this, tx, "multiSig.execute:addSigners");

        await testHelpers.expectThrow(
            testHelpers.signAndExecute(
                stabilityBoardSigner,
                stabilityBoardSigner.address,
                signers,
                txData,
                "0x0000000000000000000000000000000000000000000000000000000000000003"
            )
        );
    });

    it("should add multiple signers");

    it("should remove multiple signers");

    it("should not call addSigners directly", async function() {
        testHelpers.expectThrow(stabilityBoardSigner.addSigners([accounts[0]]));
    });

    it("should not call removeSigners directly", async function() {
        testHelpers.expectThrow(stabilityBoardSigner.removeSigners([accounts[0]]));
    });

    it("should not execute with same tx hash again");

    it("should not execute if same signature included more than once");
});
