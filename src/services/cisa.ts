
'use server';

// This is a workaround for development environments where local issuer certificates may not be available.
// It disables TLS certificate validation for all outbound fetch requests from this module.
// Warning: Do not use this in production.
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const KEV_CATALOG_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

type KevVulnerability = { 
    cveID: string;
    vulnerabilityName: string;
    dateAdded: string;
    shortDescription: string;
    requiredAction: string;
    dueDate: string;
    notes: string;
};

type KevCatalog = { 
    title: string;
    catalogVersion: string;
    dateReleased: string;
    count: number;
    vulnerabilities: KevVulnerability[]; 
};

let cachedKevCatalog: Map<string, KevVulnerability> | null = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Fetches the CISA KEV catalog and returns it as a Map where the key is the CVE ID.
 * Caches the result for 4 hours.
 */
export async function getKevCatalogMap(): Promise<Map<string, KevVulnerability>> {
  const now = Date.now();

  if (cachedKevCatalog && now - lastFetchTimestamp < CACHE_DURATION_MS) {
    console.log('✅ Using cached CISA KEV catalog.');
    return cachedKevCatalog;
  }

  console.log(`📞 Fetching CISA KEV catalog: ${KEV_CATALOG_URL}`);

  try {
    const response = await fetch(KEV_CATALOG_URL);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const catalog: KevCatalog = await response.json();

    if (!catalog.vulnerabilities || !Array.isArray(catalog.vulnerabilities)) {
      console.error('❌ Invalid KEV catalog format:', catalog);
      // Return the cached version if available, otherwise an empty map
      return cachedKevCatalog || new Map();
    }

    const cveMap = new Map<string, KevVulnerability>();
    for (const v of catalog.vulnerabilities) {
        if(v.cveID) {
            cveMap.set(v.cveID.toUpperCase(), v);
        }
    }

    cachedKevCatalog = cveMap;
    lastFetchTimestamp = now;

    console.log(`✅ Loaded ${cveMap.size} KEVs from live CISA catalog.`);
    return cveMap;
  } catch (error) {
    console.error('❌ Error fetching KEV catalog:', error);
    // Return the cached version if available, otherwise an empty map
    return cachedKevCatalog || new Map();
  }
}
