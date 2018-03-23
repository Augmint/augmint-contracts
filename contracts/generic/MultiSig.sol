/*
 WIP

 TODO:
  - add/remove signer
  -
  - what restriction is needed on called fx? (e.g sender is only the MultiSig contract?)
        maybe use a modifer and this.call instead of destination?
  - generic MultiSig and inherit OwnerBoard and MonetaryBoard multisig from there with hardcoded threshold?
  - UX flow? what helper functions required?
  - check quorum: <= or < ? (50% + 1 vote with lot of voters)
*/
pragma solidity 0.4.19;

import "./SafeMath.sol";


contract MultiSig {
    using SafeMath for uint256;
    uint public nonce;
    uint32 public thresholdPt; // in parts per million , ie. 10,000 = 1%
    uint32 constant public PERCENT100 = 1000000;
    mapping(address => bool) public isSigner;
    address[] public signers;

    function MultiSig(uint32 _thresholdPt, address[] _signers) public {
        require(_signers.length > 1);
        require(_thresholdPt > 0);
        require(_thresholdPt <= PERCENT100);

        for (uint i = 0; i < _signers.length; i++) {
            isSigner[_signers[i]] = true;
        }
        signers = _signers;
        thresholdPt = _thresholdPt;
    }

    // Note that address recovered from signatures must be strictly increasing
    //  (protect against someone submitting multiple signatures from the same address)
    function execute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS, address destination, uint value, bytes data)
    external {
        require(checkQuorum(sigR.length));
        require(sigR.length == sigS.length);
        require(sigR.length == sigV.length);

        // Follows ERC191 signature scheme: https://github.com/ethereum/EIPs/issues/191
        bytes32 txHash = keccak256(byte(0x19), byte(0), this, destination, value, data, nonce);

        address lastAdd = 0x0; // cannot have address(0) as an owner
        for (uint i = 0; i < sigR.length; i++) {
            address recovered = ecrecover(txHash, sigV[i], sigR[i], sigS[i]);
            require(recovered > lastAdd);
            require(isSigner[recovered]);
            lastAdd = recovered;
        }

        // If we make it here all signatures are accounted for
        nonce = nonce + 1;
        require(destination.call.value(value)(data)); // solhint-disable-line avoid-call-value
    }

    function checkQuorum(uint signersCount) internal view returns(bool isQuorum) {
        isQuorum = signersCount.mul(PERCENT100).div(signers.length) >= thresholdPt;
    }

}
