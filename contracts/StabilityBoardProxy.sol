/* allows tx to execute if 50% +1 vote of active signers signed */
pragma solidity 0.4.24;
import "./generic/MultiSig.sol";


contract StabilityBoardProxy is MultiSig {

    function checkQuorum(uint signersCount) internal view returns(bool isQuorum) {
        isQuorum = signersCount > activeSignersCount / 2 ;
    }
}
