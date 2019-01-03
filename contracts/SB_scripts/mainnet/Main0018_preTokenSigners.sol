/* Add pretoken signers */

pragma solidity 0.4.24;

import "../../PreToken.sol";
import "../../PreTokenProxy.sol";

contract Main0018_preTokenSigners {

    PreToken public constant PRE_TOKEN = PreToken(0x97ea02179801FA94227DB5fC1d13Ac4277d40920);
    PreTokenProxy public constant PRE_TOKEN_PROXY = PreTokenProxy(0x8a69cf9d1D85bC150F69FeB80cC34c552F5fbea9);

    function execute(Main0018_preTokenSigners /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(PRE_TOKEN_PROXY), "only execute via PreTokenProxy");

        //  PreToken signers
        address[] memory preTokenSigners = new address[](2);
        preTokenSigners[0] = 0xd8203A652452906586F2E6cB6e31f6f7fed094D4;  // Sz.K.
        preTokenSigners[1] = 0xf9ea0E2857405C859bb8647ECB11f931D1259753;  // P.P.
        PRE_TOKEN_PROXY.addSigners(preTokenSigners);
    }
}