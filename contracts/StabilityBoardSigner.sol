/* allows tx to execute if 50% +1 vote of active signers signed */
pragma solidity ^0.4.23;
import "./generic/MultiSig.sol";


contract StabilityBoardSigner is MultiSig {
    constructor(address[] _signers)
    public MultiSig( _signers)
    {} // solhint-disable-line no-empty-blocks

    function checkQuorum(uint signersCount) internal view returns(bool isQuorum) {
        isQuorum = signersCount > activeSignersCount / 2 ;
    }
}
