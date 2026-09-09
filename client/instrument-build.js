const fs = module['require']('fs');
const path = module['require']('path');
const { createInstrumenter } = module['require']('istanbul-lib-instrument');

const outputDir = path.resolve(__dirname, process.argv[2] || 'build');

if (!fs.existsSync(outputDir)) {
  throw new Error(`Build output not found: ${outputDir}`);
}

const instrumenter = createInstrumenter({
  esModules: true,
  produceSourceMap: true,
  compact: true,
  coverageGlobalScope: 'window',
  coverageGlobalScopeFunc: false,
});

const collectJavaScriptFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(dir, entry.name);
  if (entry.isDirectory()) {
    return entry.name === 'assets' ? [] : collectJavaScriptFiles(entryPath);
  }
  return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
});

const readSourceMap = (jsPath) => {
  const mapPath = `${jsPath}.map`;
  if (!fs.existsSync(mapPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch {
    return null;
  }
};

const coversApplicationSources = (sourceMap) => Array.isArray(sourceMap?.sources)
  && sourceMap.sources.some((source) => typeof source === 'string' && /(^|\/)src\//.test(source));

const absolutizeSources = (sourceMap) => ({
  ...sourceMap,
  sources: sourceMap.sources.map((source) => (typeof source === 'string' ? path.resolve(__dirname, source) : source)),
});

let instrumentedCount = 0;
let skippedCount = 0;

for (const jsPath of collectJavaScriptFiles(outputDir)) {
  const inputSourceMap = readSourceMap(jsPath);

  if (!coversApplicationSources(inputSourceMap)) {
    skippedCount += 1;
    continue;
  }

  const source = fs.readFileSync(jsPath, 'utf8');
  const instrumented = instrumenter.instrumentSync(source, jsPath, absolutizeSources(inputSourceMap));
  const outputSourceMap = instrumenter.lastSourceMap();

  fs.writeFileSync(jsPath, instrumented);
  if (outputSourceMap) {
    fs.writeFileSync(`${jsPath}.map`, JSON.stringify(outputSourceMap));
  }
  instrumentedCount += 1;
}

if (instrumentedCount === 0) {
  throw new Error(`No application bundles were instrumented in ${outputDir}`);
}

process.stdout.write(`Instrumented ${instrumentedCount} bundles for coverage (${skippedCount} vendor bundles skipped)\n`);
