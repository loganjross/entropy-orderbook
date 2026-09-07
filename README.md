# Entropy Orderbook

An orderbook widget of Entropy's markets on Hyperliquid.

## Notes for team

- Kept it to just showing perp markets so I didn't spend too much time on it.
- I like using the strictest possible configs for `tsconfig` and `eslint`, so you might see weird stuff like `typeof x !== "undefined"` rather than `!x`.
- For the sake of speed I grabbed a couple [Shadcn components](https://ui.shadcn.com/), the snippets they provide are messy so they're relegated to `./components/ui`.

## Installation

Clone the repo, install dependencies, and run the development server:

```sh
git clone https://github.com/loganjross/entropy-orderbook.git

cd entropy-orderbook

npm i && npm run dev
```

Once the development server is running, open your browser to `http://localhost:3000`
