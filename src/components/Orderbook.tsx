import * as React from "react";
import type { ClassValue } from "clsx";

import { capitalizeFirstLetter, cn } from "../utils";
import {
  HYPERLIQUID_ORDER_SIDE,
  HYPERLIQUID_PERPETUALS_MARKET_QUOTE_ASSET_NAME,
  type HyperliquidAsset,
  type HyperliquidMarket,
  type HyperliquidOrderbookLevel,
  useHyperliquid
} from "../providers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from "./ui";

interface OrderbookLevelProps extends HyperliquidOrderbookLevel {
  asset: HyperliquidAsset;
  side: HYPERLIQUID_ORDER_SIDE;
  cumulativeSize: number;
  maxCumulativeSize: number;
  classNames?: ClassValue[];
}

const ORDERBOOK_DEPTH = 8;
const ORDERBOOK_BID_ASK_SPREAD_PERCENTAGE_MAX_DECIMAL_PRECISION = 4;

const DEFAULT_ORDERBOOK_LEVEL_TW_CLASSES = ["grid", "grid-cols-3", "px-1.5", "py-0.5"];

export function Orderbook(): React.ReactElement {
  const hyperliquid = useHyperliquid();
  const [sortedBids, sortedAsks] = React.useMemo(() => {
    if (hyperliquid.currentMarket === null) return [[], []];
    const [rawBids, rawAsks] = hyperliquid.currentMarket.orderbook.levels;
    const sortedBids = [...rawBids].sort((a, b) => b.price - a.price).slice(0, ORDERBOOK_DEPTH);
    const sortedAsks = [...rawAsks].sort((a, b) => a.price - b.price).slice(0, ORDERBOOK_DEPTH);
    return [sortedBids, sortedAsks];
  }, [hyperliquid.currentMarket]);
  const [cumulativeBids, cumulativeAsks] = React.useMemo(() => {
    let cumulativeBidSize = 0;
    const cumulativeBids = sortedBids.map((bid) => {
      cumulativeBidSize += bid.size;
      return { ...bid, cumulativeSize: cumulativeBidSize };
    });
    let cumulativeAskSize = 0;
    const cumulativeAsks = sortedAsks.map((ask) => {
      cumulativeAskSize += ask.size;
      return { ...ask, cumulativeSize: cumulativeAskSize };
    });
    return [cumulativeBids, cumulativeAsks];
  }, [sortedBids, sortedAsks]);
  const maxCumulativeSize = Math.max(cumulativeBids.at(-1)?.cumulativeSize ?? 0, cumulativeAsks.at(-1)?.cumulativeSize ?? 0);
  const bestBid = sortedBids[0]?.price ?? 0;
  const bestAsk = sortedAsks[0]?.price ?? 0;
  const bidAskSpread = bestAsk - bestBid;
  const bidAskSpreadPercentage = bestBid > 0 ? bidAskSpread / bestBid : 0;

  function _getMarketName(market: HyperliquidMarket): string {
    return market.type === "perpetuals"
      ? `${market.asset.name}-${HYPERLIQUID_PERPETUALS_MARKET_QUOTE_ASSET_NAME}`
      : market.asset.name;
  }

  function _getAssetIconUrl(asset: HyperliquidAsset): string {
    return `https://app.hyperliquid.xyz/coins/${asset.name}.svg`;
  }

  if (!hyperliquid.isInit || hyperliquid.currentMarket === null) {
    return (
      <div
        className={cn(
          "flex",
          "items-center",
          "justify-center",
          "absolute",
          "top-1/2",
          "left-1/2",
          "-translate-x-1/2",
          "-translate-y-1/2"
        )}
      >
        <Spinner className="mr-1.5" />
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div className={cn("flex", "flex-col", "w-full", "max-w-md", "p-4", "bg-[var(--card)]", "rounded-lg")}>
      <div className={cn("flex", "items-center", "justify-between", "w-full")}>
        <Select
          value={_getMarketName(hyperliquid.currentMarket)}
          onValueChange={(v) => {
            const selectedMarket = hyperliquid.availableMarkets.find((market) => v === _getMarketName(market));
            if (typeof selectedMarket !== "undefined") hyperliquid.switchMarket(selectedMarket);
          }}
        >
          <SelectTrigger
            // Remove the default `shadcn` styles.
            className={cn("!h-0", "!px-0", "!bg-transparent", "!border-0", "!shadow-none", "!outline-none", "!ring-0")}
          >
            <div className={cn("flex", "items-center", "w-full")}>
              <div className={cn("w-[35px]", "mr-3", "rounded-full", "overflow-hidden")}>
                <img
                  className={cn("w-full", "h-full", "object-cover")}
                  src={_getAssetIconUrl(hyperliquid.currentMarket.asset)}
                  alt={`${hyperliquid.currentMarket.asset.name} icon`}
                />
              </div>
              <div className={cn("flex", "items-start", "flex-col")}>
                <SelectValue placeholder="Select a market..." />
                <p className={cn("text-[var(--muted-foreground)]", "text-sm")}>
                  {capitalizeFirstLetter(hyperliquid.currentMarket.type)}
                </p>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {hyperliquid.availableMarkets.map((availableMarket, i) => {
              const availableMarketName = _getMarketName(availableMarket);
              return (
                <SelectItem key={i} value={availableMarketName}>
                  {availableMarketName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <div className={cn("flex", "items-center", "justify-center", "p-2", "bg-[var(--muted)]", "text-xs", "rounded")}>
          <p>{hyperliquid.currentMarket.asset.maxLeverage}x</p>
        </div>
      </div>
      <div
        className={cn(
          ...DEFAULT_ORDERBOOK_LEVEL_TW_CLASSES,
          "mt-4",
          "mb-2",
          "text-[var(--muted-foreground)]",
          "border-b border-[var(--muted)]"
        )}
      >
        <p>Price</p>
        <p className="text-right">Size</p>
        <p className="text-right">Total</p>
      </div>
      <div className={cn("flex", "flex-col")}>
        {[...cumulativeAsks]
          .reverse()
          .map(
            (askLevel, i) =>
              hyperliquid.currentMarket !== null && (
                <OrderbookLevel
                  key={`ask-${i}`}
                  asset={hyperliquid.currentMarket.asset}
                  side={HYPERLIQUID_ORDER_SIDE.ASK}
                  maxCumulativeSize={maxCumulativeSize}
                  {...askLevel}
                  classNames={i > 0 ? ["mt-1"] : undefined}
                />
              )
          )}
      </div>
      <div
        className={cn(
          ...DEFAULT_ORDERBOOK_LEVEL_TW_CLASSES,
          "my-2",
          "bg-[var(--background)]",
          "text-[var(--muted-foreground)]",
          "rounded"
        )}
      >
        <p>Spread</p>
        <p className="text-right">{bidAskSpread}</p>
        <p className="text-right">
          {(bidAskSpreadPercentage * 100).toFixed(ORDERBOOK_BID_ASK_SPREAD_PERCENTAGE_MAX_DECIMAL_PRECISION)}%
        </p>
      </div>
      <div className={cn("flex", "flex-col")}>
        {cumulativeBids.map(
          (bidLevel, i) =>
            hyperliquid.currentMarket !== null && (
              <OrderbookLevel
                key={`bid-${i}`}
                asset={hyperliquid.currentMarket.asset}
                side={HYPERLIQUID_ORDER_SIDE.BID}
                maxCumulativeSize={maxCumulativeSize}
                {...bidLevel}
                classNames={i > 0 ? ["mt-1"] : undefined}
              />
            )
        )}
      </div>
    </div>
  );
}

function OrderbookLevel({
  asset,
  side,
  price,
  size,
  cumulativeSize,
  maxCumulativeSize,
  classNames = []
}: OrderbookLevelProps): React.ReactElement {
  const barWidth = maxCumulativeSize > 0 ? (cumulativeSize / maxCumulativeSize) * 100 : 0;
  const cssColorVariable = `var(--${side === HYPERLIQUID_ORDER_SIDE.BID ? "success" : "error"})`;

  return (
    <div className={cn(...DEFAULT_ORDERBOOK_LEVEL_TW_CLASSES, "relative", "overflow-hidden", ...classNames)}>
      <div
        className={cn("absolute", "inset-0", "opacity-10")}
        style={{ width: `${barWidth}%`, backgroundColor: cssColorVariable }}
      />
      <p className="relative" style={{ color: cssColorVariable }}>
        {price.toLocaleString()}
      </p>
      <p className={cn("relative", "text-right")}>{Number(size.toFixed(asset.decimalPrecision)).toLocaleString()}</p>
      <p className={cn("relative", "text-right")}>
        {Number(cumulativeSize.toFixed(asset.decimalPrecision)).toLocaleString()}
      </p>
    </div>
  );
}
