import BN from "bignumber.js";
import axios from "axios";
import { web3 } from "@defi.org/web3-candies";
import { chainConfig, isNativeAddress, nativeTokenAddresses, TokenData } from "./configs";

export namespace Paraswap {
  const URL = "https://apiv5.paraswap.io";

  export enum OnlyDex {
    SpiritSwap = "SpiritSwap,SpiritSwapV2",
    SpookySwap = "SpookySwap",
    Quickswap = "Quickswap",
    Sushiswap = "Sushiswap",
  }

  export interface ParaswapRoute {
    blockNumber: number;
    network: number;
    srcToken: string;
    destToken: string;
    srcDecimals: number;
    destDecimals: number;
    srcAmount: string;
    destAmount: string;
    bestRoute: any[];
    gasCostUSD: string;
    gasCost: string;
    side: string;
    tokenTransferProxy: string;
    contractAddress: string;
    contractMethod: string;
    partnerFee: number;
    srcUSD: string;
    destUSD: string;
    partner: string;
    maxImpactReached: boolean;
  }

  export async function priceUsd(chainId: number, token: TokenData) {
    const _token = isNativeAddress(token.address) ? chainConfig(chainId).wToken : token;
    const r = await findRoute(
      chainId,
      _token,
      { address: nativeTokenAddresses[2], symbol: "NATIVE", decimals: 18 },
      BN(10).pow(_token.decimals)
    );
    return BN(r.srcUSD);
  }

  export async function findRoute(
    chainId: number,
    src: TokenData,
    dst: TokenData,
    amountIn: BN.Value,
    onlyDex?: OnlyDex
  ): Promise<ParaswapRoute> {
    const params = new URLSearchParams({
      srcToken: src.address,
      destToken: dst.address,
      srcDecimals: src.decimals.toString(),
      destDecimals: dst.decimals.toString(),
      amount: amountIn.toString(),
      network: chainId.toString(),
      side: "SELL",
      includeDEXS: onlyDex || "",
      // partner: "chucknorris",
      // otherExchangePrices: "true",
    });
    const response = await axios.get(`${URL}/prices/?${params}`);
    if (response.status < 200 || response.status >= 400) throw new Error(`${response.statusText}`);
    return response.data.priceRoute;
  }

  export async function buildSwapData(paraswapRoute: ParaswapRoute, exchangeAdapter: string) {
    const response = await axios.post(`${URL}/transactions/${paraswapRoute.network}?ignoreChecks=true`, {
      priceRoute: paraswapRoute,
      srcToken: paraswapRoute.srcToken,
      destToken: paraswapRoute.destToken,
      srcDecimals: paraswapRoute.srcDecimals,
      destDecimals: paraswapRoute.destDecimals,
      srcAmount: paraswapRoute.srcAmount,
      destAmount: "1",
      userAddress: exchangeAdapter,
    });
    if (response.status < 200 || response.status >= 400) throw new Error(`${response.statusText}`);
    return web3().eth.abi.encodeParameters(["uint256", "bytes"], [paraswapRoute.destAmount, response.data.data]);
  }
}
