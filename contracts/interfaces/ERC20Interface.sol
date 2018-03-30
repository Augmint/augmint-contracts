/*
 * ERC20 interface
 * see https://github.com/ethereum/EIPs/issues/20
 */
pragma solidity 0.4.21;


interface ERC20Interface {
    event Approval(address indexed _owner, address indexed _spender, uint _value);
    event Transfer(address indexed from, address indexed to, uint amount);

    function transfer(address to, uint value) external returns (bool); // solhint-disable-line no-simple-event-func-name
    function transferFrom(address from, address to, uint value) external returns (bool);
    function approve(address spender, uint value) external returns (bool);
    function balanceOf(address who) external view returns (uint);
    function allowance(address _owner, address _spender) external view returns (uint remaining);

}
