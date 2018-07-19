/**
* @title SafeMath
* @dev Math operations with safety checks that throw on error

    TODO: check against ds-math: https://blog.dapphub.com/ds-math/
    TODO: move roundedDiv to a sep lib? (eg. Math.sol)
*/
pragma solidity 0.4.24;


library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        require(a == 0 || c / a == b, "mul overflow");
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "div by 0"); // Solidity automatically throws for div by 0 but require to emit reason
        uint256 c = a / b;
        // require(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "sub underflow");
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "add overflow");
        return c;
    }

    function roundedDiv(uint a, uint b) internal pure returns (uint256) {
        require(b > 0, "div by 0"); // Solidity automatically throws for div by 0 but require to emit reason
        uint256 z = a / b;
        if (a % b * 2 >= b) {
            z++;  // no need for safe add b/c it can happen only if we divided the input
        }
        return z;
    }

    // Always rounds up
    function ceilDiv(uint a, uint b) internal pure returns (uint256) {
        require(b > 0, "div by 0"); // Solidity automatically throws for div by 0 but require to emit reason
        uint256 z = a / b;
        if (a % b != 0) {
            z++;  // no need for safe add b/c it can happen only if we divided the input
        }
        return z;
    }
}
