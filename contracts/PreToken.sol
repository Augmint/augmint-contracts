/* Augmint pretoken contract to record tokens alloceted based on SAFE agreements
Intentionally not fully ERC20 compliant:
  - transfer is only allowed to accounts without an agreement yet or same agreements
  - no approval and transferFrom

 TODO:
  - is keccak256 hash the best choice for agreementHash? I.e. Do we ever need to check it on chain? If not then we
            could choose any other which is the most convenient to produce off chain
*/

pragma solidity 0.4.19;
import "./generic/SafeMath.sol";
import "./StakeHolder50Signer.sol";


contract PreToken {
    using SafeMath for uint256;

    string constant public name = "Augmint pretokens"; // solhint-disable-line const-name-snakecase
    string constant public symbol = "APRE"; // solhint-disable-line const-name-snakecase
    uint8 constant public decimals = 0; // solhint-disable-line const-name-snakecase

    uint public totalSupply;

    address public stakeHolder50Signer;

    struct Agreement {
        uint balance;
        bytes32 agreementHash; // Keccak 256 hash of signed agreement
        uint32 discount; //  discountRate in parts per million , ie. 10,000 = 1%
        uint32 valuationCap; // in USD (no decimals)
    }

    mapping(address => Agreement) public agreements; // Balances for each account

    /* transfer event is only emitted when new tokens issued  */
    event Transfer(address indexed from, address indexed to, uint amount);

    event NewAgreement(address to, bytes32 agreementHash, uint32 discount, uint32 valuationCap);

    function PreToken(address _stakeHolder50Signer) public {
        require(_stakeHolder50Signer != 0x0);
        stakeHolder50Signer = _stakeHolder50Signer;
    }

    function addAgreement(address to, bytes32 agreementHash, uint32 discount, uint32 valuationCap) external {
        require(msg.sender == stakeHolder50Signer);
        require(to != address(0));
        require(agreements[to].agreementHash == 0x0);
        require(agreementHash != 0x0);

        agreements[to] = Agreement(0, agreementHash, discount, valuationCap);

        NewAgreement(to, agreementHash, discount, valuationCap);
    }

    function issueTo(address _to, uint amount) external {
        require(msg.sender == stakeHolder50Signer);
        Agreement storage to = agreements[_to];
        require(to.agreementHash != 0x0);

        to.balance = to.balance.add(amount);
        totalSupply = totalSupply.add(amount);

        Transfer(0x0, _to, amount);
    }

    function balanceOf(address who) public view returns (uint) {
        return agreements[who].balance;
    }

    function transfer(address to, uint amount) public returns (bool) { // solhint-disable-line no-simple-event-func-name
        require(
            agreements[to].agreementHash == 0 ||  // allow to transfer to address without agreement
            amount == 0 || // allow 0 amount transfers to any acc for voting
            agreements[to].agreementHash == agreements[msg.sender].agreementHash // allow transfer to acc w/ same agr.
        );

        if (amount > 0) { // transfer agreement if it's not a 0 amount "vote only" transfer
            agreements[msg.sender].balance = agreements[msg.sender].balance.sub(amount);
            agreements[to].balance = agreements[to].balance.add(amount);

            agreements[to].agreementHash = agreements[msg.sender].agreementHash;
            agreements[to].valuationCap = agreements[msg.sender].valuationCap;
            agreements[to].discount = agreements[msg.sender].discount;
        }

        Transfer(msg.sender, to, amount);
    }

}
