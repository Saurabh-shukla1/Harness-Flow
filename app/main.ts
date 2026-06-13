import { runAgent } from "./agent";
import { isValidModelFlag } from "./model";

async function main() {
  const [, , modelFlag, pFlag, prompt] = process.argv;

  if (!isValidModelFlag(modelFlag)) {
    process.stderr.write(
      "Warning: No model flag specified, defaulting to -free. Currently only -free and -claude models are supported.\n",
    );
    process.exit(1);
  }

  if (pFlag !== "-p" || !prompt) {
    process.stderr.write("Error: -p flag is required.\n");
    process.exit(1);
  }

  const result = await runAgent({ modelFlag, prompt });
  process.stdout.write(result);
  console.error("Logs from your program will appear here!");
}

main();
