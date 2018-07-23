pragma solidity 0.4.24;

import "../generic/SafeMath.sol";


contract SafeMathTester {

    using SafeMath for uint256;

    function mul(uint256 a, uint256 b) public pure returns (uint256) {
        return a.mul(b);
    }

    function div(uint256 a, uint256 b) public pure returns (uint256) {
        return a.div(b);
    }

    function sub(uint256 a, uint256 b) public pure returns (uint256) {
        return a.sub(b);
    }

    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a.add(b);
    }

    function roundedDiv(uint256 a, uint256 b) public pure returns (uint256) {
        return a.roundedDiv(b);
    }

    function ceilDiv(uint256 a, uint256 b) public pure returns (uint256) {
        return a.ceilDiv(b);
    }
}