/* test Restriced via AugmintToken
 Note that grant, grantMultiple and revoke are tested around in other tests
*/
const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const PERM1 = web3.utils.asciiToHex("TESTPERMISSION1");
const PERM2 = web3.utils.asciiToHex("TESTPERMISSION2");

let augmintTokenInstance;

contract("Restricted.sol tests", (accounts) => {
    before(async () => {
        augmintTokenInstance = tokenTestHelpers.augmintToken;
    });

    it("only permitted should be able to grant permissions ", async function () {
        await testHelpers.expectThrow(
            augmintTokenInstance.grantPermission(accounts[0], PERM1, {
                from: accounts[1],
            })
        );
    });

    it("only permitted should be able to grant multiple permissions ", async function () {
        await testHelpers.expectThrow(
            augmintTokenInstance.grantMultiplePermissions(accounts[0], [PERM1, PERM2], {
                from: accounts[1],
            })
        );
    });

    it("only permitted to revoke  permission ", async function () {
        await testHelpers.expectThrow(
            augmintTokenInstance.revokePermission(accounts[0], PERM1, {
                from: accounts[1],
            })
        );
    });

    it("should grant & revoke multiple permissions ", async function () {
        const tx1 = await augmintTokenInstance.grantMultiplePermissions(accounts[0], [PERM1, PERM2], {
            from: accounts[0],
        });
        testHelpers.logGasUse(this, tx1, "grantMultiplePermissions");

        let perm1;
        let perm2;
        [perm1, perm2] = await Promise.all([
            augmintTokenInstance.permissions(accounts[0], PERM1),
            augmintTokenInstance.permissions(accounts[0], PERM2),
        ]);
        assert.equal(perm1, true);
        assert.equal(perm2, true);

        const tx2 = await augmintTokenInstance.revokeMultiplePermissions(accounts[0], [PERM1, PERM2], {
            from: accounts[0],
        });
        testHelpers.logGasUse(this, tx2, "revokeMultiplePermissions");

        [perm1, perm2] = await Promise.all([
            augmintTokenInstance.permissions(accounts[0], PERM1),
            augmintTokenInstance.permissions(accounts[0], PERM2),
        ]);

        assert.equal(perm1, false);
        assert.equal(perm2, false);
    });

    it("only permitted to revoke multiple permissions ", async function () {
        await testHelpers.expectThrow(
            augmintTokenInstance.revokeMultiplePermissions(accounts[0], [PERM1, PERM2], {
                from: accounts[1],
            })
        );
    });
});
