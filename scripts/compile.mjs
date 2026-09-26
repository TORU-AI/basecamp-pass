// Compile contracts/AccessKey.sol with solc-js → src/lib/AccessKey.json (abi + bytecode).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import solc from "solc";

const require = createRequire(import.meta.url);
const input = {
  language: "Solidity",
  sources: { "AccessKey.sol": { content: readFileSync("contracts/AccessKey.sol", "utf8") } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const findImports = (path) => {
  try {
    return { contents: readFileSync(require.resolve(path), "utf8") };
  } catch {
    return { error: `not found: ${path}` };
  }
};

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (out.errors ?? []).filter((e) => e.severity === "error");
for (const e of out.errors ?? []) console.error(e.formattedMessage);
if (errors.length) process.exit(1);

const c = out.contracts["AccessKey.sol"].AccessKey;
writeFileSync("src/lib/AccessKey.json", JSON.stringify({ abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` }, null, 2));
console.log("compiled → src/lib/AccessKey.json", c.evm.bytecode.object.length / 2, "bytes");
