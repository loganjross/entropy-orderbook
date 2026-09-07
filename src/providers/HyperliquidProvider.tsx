import * as React from "react";

interface Hyperliquid {
  availableMarkets: HyperliquidMarket[];
  currentMarket: (HyperliquidMarket & { orderbook: HyperliquidOrderbook }) | null;
  switchMarket: (market: HyperliquidMarket) => void;
  isInit: boolean;
}

type HyperliquidMarketType = "spot" | "perpetuals";
export interface HyperliquidMarket {
  type: HyperliquidMarketType;
  asset: HyperliquidAsset;
}
export interface HyperliquidAsset {
  name: string;
  decimalPrecision: number;
  maxLeverage: number;
}

interface HyperliquidOrderbook {
  assetName: HyperliquidAsset["name"];
  levels: [HyperliquidOrderbookLevel[], HyperliquidOrderbookLevel[]]; // [bids, asks]
  snapshotTimestamp: number;
}
export interface HyperliquidOrderbookLevel {
  price: number;
  size: number;
  numOrders: number;
}
export enum HYPERLIQUID_ORDER_SIDE {
  BID = "bid",
  ASK = "ask"
}

const HyperliquidContext = React.createContext({} as unknown as Hyperliquid);

const HYPERLIQUID_MARKET_TYPES: HyperliquidMarketType[] = ["spot", "perpetuals"];
const DEFAULT_HYPERLIQUID_MARKET_TYPE: HyperliquidMarketType = "perpetuals";
const DEFAULT_HYPERLIQUID_MARKET_ASSET_NAME = "BTC";
export const HYPERLIQUID_PERPETUALS_MARKET_QUOTE_ASSET_NAME = "USDC";

const HYPERLIQUID_API_DOMAIN = "api.hyperliquid.xyz";
const HYPERLIQUID_API_WEBSOCKET_SUBSCRIPTION_METHOD_NAME = "subscribe";

export const ENTROPY_EXCHANGE_NAME = "io";

/**
 * Provides context for {@linkcode Hyperliquid} to its children.
 */
export function HyperliquidProvider({
  exchangeName,
  marketTypes = HYPERLIQUID_MARKET_TYPES,
  defaultMarketType = DEFAULT_HYPERLIQUID_MARKET_TYPE,
  defaultMarketAssetName = DEFAULT_HYPERLIQUID_MARKET_ASSET_NAME,
  children
}: Partial<{
  exchangeName: string;
  marketTypes: HyperliquidMarketType[];
  defaultMarketType: HyperliquidMarketType;
  defaultMarketAssetName: HyperliquidAsset["name"];
  children: React.ReactNode;
}>): React.ReactNode {
  const [availableMarkets, setAvailableMarkets] = React.useState<HyperliquidMarket[]>([]);
  const [currentMarket, setCurrentMarket] = React.useState<HyperliquidMarket | null>(null);
  const [currentMarketOrderbook, setCurrentMarketOrderbook] = React.useState<HyperliquidOrderbook | null>(null);
  const isInit = availableMarkets.length > 0 && currentMarket !== null && currentMarketOrderbook !== null;

  // Set available markets on mount.
  React.useEffect(() => {
    async function _getAvailableMarkets(): Promise<HyperliquidMarket[]> {
      const availableMarkets: HyperliquidMarket[] = [];
      try {
        for (const marketType of marketTypes) {
          const availableMarketsApiResp = await fetch(`https://${HYPERLIQUID_API_DOMAIN}/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: marketType === "spot" ? "spotMeta" : "meta",
              dex: exchangeName
            })
          });
          if (!availableMarketsApiResp.ok) {
            throw Error(`Error: Unable to fetch available Hyperliquid ${marketType} markets.`);
          }
          const { universe: availableAssetsResp } = await availableMarketsApiResp.json();
          for (const availableAssetResp of availableAssetsResp) {
            availableMarkets.push({
              type: marketType,
              asset: {
                name: availableAssetResp.name,
                decimalPrecision: availableAssetResp.szDecimals,
                maxLeverage: availableAssetResp.maxLeverage
              }
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
      return availableMarkets;
    }
    void _getAvailableMarkets().then((availableMarkets) => {
      setAvailableMarkets(availableMarkets);
      // Set the default market.
      const defaultMarket = availableMarkets.find(
        (availableMarket) =>
          availableMarket.type === defaultMarketType && availableMarket.asset.name === defaultMarketAssetName
      );
      if (typeof defaultMarket !== "undefined") setCurrentMarket(defaultMarket);
    });

    return () => {
      setAvailableMarkets([]);
      setCurrentMarket(null);
      setCurrentMarketOrderbook(null);
    };
  }, []);

  // Subscribe to the current market's orderbook.
  React.useEffect(() => {
    if (currentMarket === null) return;
    const hyperliquidWebsocket = new WebSocket(`wss://${HYPERLIQUID_API_DOMAIN}/ws`);
    hyperliquidWebsocket.onopen = () => {
      hyperliquidWebsocket.send(
        JSON.stringify({
          method: HYPERLIQUID_API_WEBSOCKET_SUBSCRIPTION_METHOD_NAME,
          subscription: { type: "l2Book", coin: currentMarket.asset.name }
        })
      );
    };
    hyperliquidWebsocket.onmessage = ({ data: stringifiedOrderbookSnapshot }: { data: string }) => {
      const orderbookSnapshot = JSON.parse(stringifiedOrderbookSnapshot).data;
      // The first message upon connection is a subscription confirmation, ignore it.
      if (orderbookSnapshot.method === HYPERLIQUID_API_WEBSOCKET_SUBSCRIPTION_METHOD_NAME) return;
      setCurrentMarketOrderbook({
        assetName: orderbookSnapshot.coin,
        levels: orderbookSnapshot.levels.map((side: Array<Record<string, string>>) =>
          side.map((level: Record<string, string>) => ({
            price: Number(level["px"]),
            size: Number(level["sz"]),
            numOrders: Number(level["n"])
          }))
        ),
        snapshotTimestamp: orderbookSnapshot.time
      });
    };

    return () => {
      hyperliquidWebsocket.close();
    };
  }, [currentMarket]);

  return (
    <HyperliquidContext.Provider
      value={{
        availableMarkets,
        currentMarket: isInit ? { ...currentMarket, orderbook: currentMarketOrderbook } : null,
        switchMarket: setCurrentMarket,
        isInit
      }}
    >
      {children}
    </HyperliquidContext.Provider>
  );
}

/**
 * Returns access to the {@linkcode HyperliquidContext}.
 */
export function useHyperliquid(): Hyperliquid {
  const hyperliquid = React.useContext(HyperliquidContext);
  if (typeof hyperliquid === "undefined") {
    throw Error('Error: Cannot call "useHyperliquid()" outside of a "HyperliquidProvider".');
  }
  return hyperliquid;
}
