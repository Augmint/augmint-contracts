/* Augmint pretoken contract.
Intentionally not fully ERC20 compliant:
  - transfer is only allowed to accounts without an agreement yet
  - no approval and transferFrom
 TODO:
  - multisig for issueTo and addAgreement
  - shall we allow transfer to accounts with the same agreement (incl. hash)?
  - shall we allow only full balance transfer?
  - is keccak256 hash the best choice for agreementHash? I.e. Do we ever need to check it on chain? If not then we
            could choose any other which is the most convenient to produce off chain
*/

pragma solidity 0.4.19;
import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";


contract PreToken is Restricted {
    using SafeMath for uint256;

    string constant public name = "Augmint pretokens"; // solhint-disable-line const-name-snakecase
    string constant public symbol = "APRE"; // solhint-disable-line const-name-snakecase
    uint8 constant public decimals = 0; // solhint-disable-line const-name-snakecase

    uint public totalSupply;

    struct Agreement {
        uint balance;
        bytes32 agreementHash; // Keccak 256 hash of signed agreement
        uint32 discount; //  discountRate in parts per million , ie. 10,000 = 1%
        uint32 valuationCap;
    }

    mapping(address => Agreement) public agreements; // Balances for each account

    /* transfer event is only emitted when new tokens issued  */
    event Transfer(address indexed from, address indexed to, uint amount);

    event NewAgreement(address to, bytes32 agreementHash, uint32 discount, uint32 valuationCap);

    function addAgreement(address to, bytes32 agreementHash, uint32 discount, uint32 valuationCap)
    external restrict("OwnerBoard") {
        require(agreements[to].agreementHash != 0);
        require(agreementHash != 0x0);

        agreements[to] = Agreement(0, agreementHash, discount, valuationCap);

        NewAgreement(to, agreementHash, discount, valuationCap);
    }

    function issueTo(address _to, uint amount) external restrict("OwnerBoard") {
        Agreement storage to = agreements[_to];
        require(to.agreementHash != 0x0);

        to.balance.add(amount);
        totalSupply.add(amount);

        Transfer(0x0, _to, amount);
    }

    function balanceOf(address who) public view returns (uint) {
        return agreements[who].balance;
    }

    function transfer(address to, uint amount) public returns (bool) { // solhint-disable-line no-simple-event-func-name
        // TBD: shall we allow only full balance transfers?
        require(to != 0x0); // TBD: shall we allow "burning" ?
        require(agreements[to].agreementHash == 0);  // TBD: could we use 0 amount transfers for voting?

        agreements[msg.sender].balance = agreements[msg.sender].balance.sub(amount);
        agreements[to].balance = agreements[to].balance.add(amount);

        Transfer(msg.sender, to, amount);
    }

}
