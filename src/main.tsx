import * as ReactDOM from "react-dom/client";

import { cn } from "./utils";
import { ENTROPY_EXCHANGE_NAME, HyperliquidProvider } from "./providers";
import { Orderbook } from "./components";

const root = document.getElementById("root");
if (root === null) throw new Error('Error: No element of ID "root" found.');
ReactDOM.createRoot(root).render(
  // For now, only show Entropy's perp markets (defaulting to OpenAI pre-IPO).
  <HyperliquidProvider
    exchangeName={ENTROPY_EXCHANGE_NAME}
    marketTypes={["perpetuals"]}
    defaultMarketAssetName={`${ENTROPY_EXCHANGE_NAME}:OAI`}
  >
    <div className={cn("flex", "items-start", "justify-center", "w-screen", "h-screen", "p-5")}>
      <Orderbook />
    </div>
  </HyperliquidProvider>
);
