type EsriRequire = (
  modulePaths: string[],
  onLoad: (...loadedModules: unknown[]) => void,
  onError: (error: unknown) => void,
) => void;

interface EsriAmdGlobal {
  require?: EsriRequire;
}

const ARCGIS_API_VERSION = '4.34';
const ARCGIS_API_URL = `https://js.arcgis.com/${ARCGIS_API_VERSION}/`;

let arcgisApiLoader: Promise<EsriRequire> | null = null;

function resolveEsriRequire(): EsriRequire | undefined {
  return (window as unknown as EsriAmdGlobal).require;
}

function loadArcgisApi(): Promise<EsriRequire> {
  const alreadyLoaded = resolveEsriRequire();
  if (alreadyLoaded) {
    return Promise.resolve(alreadyLoaded);
  }

  if (arcgisApiLoader) {
    return arcgisApiLoader;
  }

  arcgisApiLoader = new Promise<EsriRequire>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${ARCGIS_API_URL}"]`);
    const script = existingScript ?? document.createElement('script');

    script.addEventListener('load', () => {
      const esriRequire = resolveEsriRequire();
      if (esriRequire) {
        resolve(esriRequire);
        return;
      }
      reject(new Error(`ArcGIS API ${ARCGIS_API_VERSION} loaded without an AMD loader`));
    }, { once: true });

    script.addEventListener('error', () => {
      reject(new Error(`Failed to load ArcGIS API from ${ARCGIS_API_URL}`));
    }, { once: true });

    if (!existingScript) {
      script.src = ARCGIS_API_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    arcgisApiLoader = null;
    throw error;
  });

  return arcgisApiLoader;
}

export function loadEsriModules<TModules extends unknown[]>(modulePaths: string[]): Promise<TModules> {
  return loadArcgisApi().then(esriRequire => new Promise<TModules>((resolve, reject) => {
    const onLoad = (...loadedModules: unknown[]) => {
      resolve(loadedModules as TModules);
    };
    const onError = (error: unknown) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    esriRequire(modulePaths, onLoad, onError);
  }));
}
