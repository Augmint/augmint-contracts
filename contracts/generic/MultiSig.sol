/* Abstract multisig contract. Each derived contract should implement checkQuorum

 TODO/CHECK:
  - how to ensure  lost private key(s) of signers not causing complete block of any execution?
  - shall we restrict  execute to be called by a signer?
  - test signing with trezor signature:
    https://github.com/0xProject/0x-monorepo/blob/095388ffe05ca51e92db87ba81d6e4f29b1ab087/packages/contracts/src/contracts/current/protocol/Exchange/MixinSignatureValidator.sol
  - EIP712 & ERC191 signature schemes?
  - use a modifer and this.call instead of destination?
  - UX flow? what helper functions required?
  - use bytes[] signature instead of s[], r[] , v[] when ABIEncoderV2 is not experimental anymore
  - what is the max number of signers ( block gas limit)?
*/
pragma solidity 0.4.24;

import "./SafeMath.sol";


contract MultiSig {
    using SafeMath for uint256;

    mapping(bytes32 => bool) public txHashesUsed; // record txHashes used by execute

    mapping(address => bool) public isSigner;
    address[] public allSigners; // all signers, even the disabled ones
    uint public activeSignersCount;

    event SignerAdded(address signer);
    event SignerRemoved(address signer);

    constructor(address[] _signers) public {
        require(_signers.length > 0);

        for (uint i = 0; i < _signers.length; i++) {
            isSigner[_signers[i]] = true;
        }
        allSigners = _signers;
        activeSignersCount = allSigners.length;
    }

    // Note that address recovered from signatures must be strictly increasing
    //  (protect against someone submitting multiple signatures from the same address)
    function execute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS,
                        address destination, uint value, bytes data, bytes32 nonce)
    external {
        require(checkQuorum(sigR.length), "not enough signatures");
        require(sigR.length == sigS.length, "sigR & sigS length mismatch");
        require(sigR.length == sigV.length, "sigR & sigV length mismatch");

        bytes32 txHash = keccak256(abi.encodePacked(this, destination, value, data, nonce));
        require(!txHashesUsed[txHash], "txHash already used");
        txHashesUsed[txHash] = true;

        txHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", txHash));

        _checkSignatures(txHash, sigV, sigR, sigS); // will revert if any sig is incorrect

        // If we make it here all signatures are accounted for
        require(destination.call.value(value)(data)); // solhint-disable-line avoid-call-value
    }

    /* requires quorum so it's callable only via execute */
    function addSigners(address[] signers) public {
        require(msg.sender == address(this), "only callable via MultiSig");
        for (uint i= 0; i < signers.length; i++) {
            if (!isSigner[signers[i]]) {
                activeSignersCount++;
                allSigners.push(signers[i]);
                isSigner[signers[i]] = true;
                emit SignerAdded(signers[i]);
            }
        }
    }

    /* requires quorum so it's callable only via execute */
    function removeSigners(address[] signers) public {
        require(msg.sender == address(this), "only callable via MultiSig");
        for (uint i= 0; i < signers.length; i++) {
            if (isSigner[signers[i]]) {
                activeSignersCount--;
                isSigner[signers[i]] = false;
                emit SignerRemoved(signers[i]);
            }
        }
    }

    /* implement it in derived contract */
    function checkQuorum(uint signersCount) internal view returns(bool isQuorum);

    function _checkSignatures(bytes32 txHash, uint8[] sigV, bytes32[] sigR, bytes32[] sigS) internal view {
        address lastAdd = 0x0; // cannot have address(0) as an owner
        for (uint i = 0; i < sigR.length; i++) {
            address recovered = ecrecover(txHash, sigV[i], sigR[i], sigS[i]);
            require(recovered > lastAdd, "signer addresses not increasing");
            require(isSigner[recovered], "signer is not permitted");
            lastAdd = recovered;
        }
    }

}
