/* Augmint Token interface (abstract contract)

TODO: overload transfer() & transferFrom() instead of transferWithNarrative() & transferFromWithNarrative()
      when this fix available in web3& truffle also uses that web3: https://github.com/ethereum/web3.js/pull/1185
TODO: shall we use bytes for narrative?
TODO: shall we replace repayLoan with a generic approveAndCall ?
TODO: shall we put protection against accidentally sending in ETH?
 */
pragma solidity 0.4.19;
import "../generic/SafeMath.sol";
import "../generic/Restricted.sol";
import "./ERC20Interface.sol";


contract AugmintTokenInterface is Restricted, ERC20Interface {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    bytes32 public peggedSymbol;
    uint8 public decimals;

    uint public totalSupply;
    mapping(address => uint256) public balances; // Balances for each account
    mapping(address => mapping (address => uint256)) public allowed; // allowances added with approve()

    function () public payable; // to accept ETH sent into reserve (from defaulted loan's collateral )

    event TransferFeesChanged(uint transferFeePt, uint transferFeeMin, uint transferFeeMax);
    event Transfer(address indexed from, address indexed to, uint amount);
    event AugmintTransfer(address indexed from, address indexed to, uint amount, string narrative, uint fee);
    event TokenIssued(uint amount);
    event TokenBurned(uint amount);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);


    function transferWithNarrative(address to, uint256 amount, string narrative) external;

    function fundsReleased(uint releasedAmount) external; // only for whitelisted LockerContracts

    function repayLoan(address loanManager, uint loanId) external;
    function loanCollected(uint repaymentAmount) external; // only for whitelisted LoanManagerContracts

    function issueAndDisburse(address borrower, uint loanAmount, uint repaymentAmount, string narrative)
    external restrict("LoanManagerContracts");

    function placeSellTokenOrderOnExchange(address exchange, uint price, uint tokenAmount)
    external returns (uint sellTokenOrderId);

    function allowance(address owner, address spender) public view returns (uint256 remaining);
    function transferFrom(address from, address to, uint value) public returns (bool);
    function approve(address spender, uint value) public returns (bool);
    function increaseApproval(address spender, uint addedValue) public returns (bool);
    function decreaseApproval(address spender, uint subtractedValue) public returns (bool);

    function balanceOf(address who) public view returns (uint);
    function transfer(address to, uint value) public returns (bool); // solhint-disable-line no-simple-event-func-name

    function transferFromWithNarrative(address from, address to, uint256 amount, string narrative) public;

}
