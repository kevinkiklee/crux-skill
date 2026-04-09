const args = process.argv.slice(2);
let url = null;
let origin = null;
let formFactor = null;
let ect = null;
let history = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url') url = args[++i];
  else if (args[i] === '--origin') origin = args[++i];
  else if (args[i] === '--form-factor') formFactor = args[++i];
  else if (args[i] === '--ect') ect = args[++i];
  else if (args[i] === '--history') history = true;
}

if (!url && !origin) {
  console.error("Error: You must provide either --url or --origin.");
  process.exit(1);
}

if (url && origin) {
  console.error("Error: --url and --origin are mutually exclusive.");
  process.exit(1);
}

if (!process.env.CRUX_API_KEY) {
  console.error("Error: CRUX_API_KEY environment variable is not set.");
  process.exit(1);
}

console.log("Args parsed successfully.");