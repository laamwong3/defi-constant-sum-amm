// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error ConstantSumAMM__InvalidToken();
error ConstantSumAMM__SharesLessThanZero();

contract ConstantSumAMM {
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    // keep track of token A and B
    uint public reserveA;
    uint public reserveB;

    uint public totalSupply;
    mapping(address => uint) public balanceOf;

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function _mint(address _to, uint _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    /**
     * @notice
     */
    function swap(address _tokenIn, uint _amountIn)
        external
        returns (uint amountOut)
    {
        // check if it's valid token
        if (_tokenIn != address(tokenA) || _tokenIn != address(tokenB)) {
            revert ConstantSumAMM__InvalidToken();
        }

        bool isTokenA = _tokenIn == address(tokenA);
        (
            IERC20 tokenIn,
            IERC20 tokenOut,
            uint reserveIn,
            uint reserveOut
        ) = isTokenA
                ? (tokenA, tokenB, reserveA, reserveB)
                : (tokenB, tokenA, reserveB, reserveA);

        // trasfer token to this contract
        tokenIn.transferFrom(msg.sender, address(this), _amountIn);
        uint amountIn = tokenIn.balanceOf(address(this)) - reserveIn;

        // calculate the amount out with fees
        // dx = dy
        // 0.3% fee
        amountOut = (amountIn * 997) / 1000;

        // update reserveA or reserveB
        (uint resA, uint resB) = isTokenA
            ? (reserveIn + _amountIn, reserveOut - amountOut)
            : (reserveOut - amountOut, reserveIn + _amountIn);
        reserveA = resA;
        reserveB = resB;

        // transfer token out to user
        tokenOut.transfer(msg.sender, amountOut);
    }

    /**
     * shares = ((dA + dB) * T) / (A + B)
     */
    function addLiquidity(uint _amountA, uint _amountB)
        external
        returns (uint shares)
    {
        // make some transfer first
        tokenA.transferFrom(msg.sender, address(this), _amountA);
        tokenB.transferFrom(msg.sender, address(this), _amountB);

        uint balanceA = tokenA.balanceOf(address(this));
        uint balanceB = tokenB.balanceOf(address(this));

        uint dA = balanceA - reserveA;
        uint dB = balanceB - reserveB;

        if (totalSupply == 0) {
            shares = dA + dB;
        } else {
            shares = ((dA + dB) * totalSupply) / (reserveA + reserveB);
        }

        if (shares < 0) revert ConstantSumAMM__SharesLessThanZero();
        _mint(msg.sender, shares);
        reserveA = balanceA;
        reserveB = balanceB;
    }

    /**
     * dA = shares * A / T
     * dB = shares * B / T
     */
    function removeLiquidity(uint _shares) external returns (uint dA, uint dB) {
        dA = (_shares * reserveA) / totalSupply;
        dB = (_shares * reserveB) / totalSupply;

        _burn(msg.sender, _shares);
        reserveA -= dA;
        reserveB -= dB;

        if (dA > 0) {
            tokenA.transfer(msg.sender, dA);
        }
        if (dB > 0) {
            tokenB.transfer(msg.sender, dB);
        }
    }
}
