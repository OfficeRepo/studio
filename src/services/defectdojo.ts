

'use server';

import { z } from 'zod';
import { PRODUCT_MAP, KNOWN_COMPONENTS } from './defectdojo-maps';
import { ProductSchema, TestTypeSchema, FindingSchema } from './defectdojo-types';
import { getKevCatalogMap } from './cisa';


const API_URL = process.env.DEFECTDOJO_API_URL;
const API_KEY = process.env.DEFECTDOJO_API_KEY;

const FindingListSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    results: z.array(FindingSchema),
});


// A helper to make authenticated requests to the DefectDojo API
async function defectDojoFetch(url: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error('DefectDojo API URL or Key is not configured.');
    }

    const fullUrl = url.startsWith('http') ? url : `${API_URL.replace(/\/$/, '')}/api/v2/${url.replace(/^\//, '')}`;

    console.log(`[DefectDojo Fetch] Calling API: ${fullUrl}`);

    const response = await fetch(fullUrl, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Token ${API_KEY}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DefectDojo Fetch] Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch from DefectDojo: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }
    
    return response.json();
}

/**
 * Fetches all results from a paginated DefectDojo endpoint by following the 'next' links.
 */
export async function defectDojoFetchAll<T>(initialRelativeUrl: string): Promise<T[]> {
    let allResults: T[] = [];
    let currentUrl: string | null = initialRelativeUrl;
    
    console.log(`[defectDojoFetchAll] Starting full fetch for: ${initialRelativeUrl}`);
    
    while (currentUrl) {
        try {
            const data = await defectDojoFetch(currentUrl);
            const parsed = FindingListSchema.safeParse(data);
            
            if (parsed.success) {
                console.log(`[defectDojoFetchAll] Fetched page with ${parsed.data.results.length} results.`);
                allResults.push(...(parsed.data.results as T[]));
                currentUrl = parsed.data.next; 
                if (currentUrl) {
                    console.log(`[defectDojoFetchAll] Following next page...`);
                }
            } else {
                 console.log("[defectDojoFetchAll] Response is not a standard paginated list. Assuming single response.");
                 if (Array.isArray(data)) {
                    allResults.push(...(data as T[]));
                 } else if (typeof data === 'object' && data !== null) {
                    allResults.push(data as T);
                 }
                 currentUrl = null;
            }
        } catch (error) {
            console.error(`[defectDojoFetchAll] Failed to fetch page ${currentUrl}:`, error);
            currentUrl = null;
        }
    }
    
    console.log(`[defectDojoFetchAll] Total results fetched: ${allResults.length}`);
    return allResults;
}


export async function getProductInfoByName(productName: string): Promise<{ id: number; name: string } | null> {
    const lowerProductName = productName.trim().toLowerCase().replace(/[\s\-_]/g, '');
    
    for (const key in PRODUCT_MAP) {
        if (key.toLowerCase() === lowerProductName || PRODUCT_MAP[key].name.toLowerCase().replace(/[\s\-_]/g, '') === lowerProductName) {
            console.log(`[getProductInfoByName] Found product '${productName}' in cache.`);
            return PRODUCT_MAP[key];
        }
    }
    
    try {
        console.log(`[getProductInfoByName] Product '${productName}' not in cache, querying API...`);
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>(`products/?limit=1000`);
        const foundProduct = products.find(p => 
            p.name.toLowerCase().replace(/[\s\-_]/g, '') === lowerProductName || 
            String(p.id) === lowerProductName
        );
        if (foundProduct) {
             console.log(`[getProductInfoByName] Found product '${productName}' via API.`);
            return { id: foundProduct.id, name: foundProduct.name };
        }
        console.warn(`[getProductInfoByName] Product '${productName}' not found via API.`);
        return null;
    } catch (error) {
        console.error(`[getProductInfoByName] Error fetching product info for ${productName}:`, error);
        return null;
    }
}

export async function getProductList(): Promise<{id: number, name: string}[]> {
    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>('products/?limit=200');
        const productList = products.map(p => ({ id: p.id, name: p.name })).filter(p => !!p.name);
        productList.sort((a, b) => a.name.localeCompare(b.name));
        return productList;
    } catch (error) {
        console.error("Failed to fetch product list", error);
        return [];
    }
}

export async function getToolList(): Promise<string[]> {
    try {
        const tools = await defectDojoFetchAll<z.infer<typeof TestTypeSchema>>('test_types/?limit=200');
        const toolList = tools.map(t => t.name).filter(name => !!name);
        toolList.sort((a, b) => a.localeCompare(b));
        return toolList;
    } catch (error) {
        console.error("Failed to fetch tool list", error);
        return [];
    }
}


/**
 * Extracts a known component name from a vulnerability title.
 */
function extractComponentFromTitle(title: string): string {
    const lowerTitle = title.toLowerCase();
    for (const component of KNOWN_COMPONENTS) {
        const regex = new RegExp(`\\b${component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerTitle)) {
            return component === 'golang' ? 'go' : component;
        }
    }
    return 'unknown';
}

/**
 * Extracts a CVE identifier from a finding from multiple possible fields.
 */
export function extractCveFromFinding(f: z.infer<typeof FindingSchema>): string | null {
  // 1. From cve field
  if (f.cve && f.cve !== "N/A") return f.cve.toUpperCase();

  // 2. From title
  const titleMatch = f.title?.match(/CVE-\d{4}-\d{4,7}/i);
  if (titleMatch) return titleMatch[0].toUpperCase();

  // 3. From description
  const descriptionMatch = f.description?.match(/CVE-\d{4}-\d{4,7}/i);
  if (descriptionMatch) return descriptionMatch[0].toUpperCase();
  
  // Nothing found
  return null;
}

const GetFindingsInputSchema = z.object({
    productName: z.string().optional(),
    severity: z.string().optional(),
    active: z.boolean().default(true),
    limit: z.number().default(10),
    toolName: z.string().optional(),
    cve: z.string().optional(),
    componentName: z.string().optional(),
    isKev: z.boolean().optional(),
});
type GetFindingsInput = z.infer<typeof GetFindingsInputSchema>;

export async function getFindings(input: GetFindingsInput) {
    const { productName, severity, active, limit, toolName, cve, componentName, isKev } = GetFindingsInputSchema.parse(input);
    try {
        const queryParams = new URLSearchParams({
            duplicate: 'false',
            active: String(active),
            limit: '2000', // Fetch large pages for in-memory filtering
            prefetch: 'test,test__test_type,test__engagement,test__engagement__product',
        });

        if (cve) queryParams.set('cve', cve);

        let requestedProductName = 'All Products';
        if (productName) {
            const productInfo = await getProductInfoByName(productName);
            if (productInfo) {
                queryParams.set('test__engagement__product', String(productInfo.id));
                requestedProductName = productInfo.name;
            } else {
                return { message: `Product '${productName}' not found.` };
            }
        }
        
        if (toolName) queryParams.set('test__test_type__name', toolName);
        if (componentName) queryParams.set('component_name', componentName);
        
        console.log(`[getFindings] Querying with params: ${queryParams.toString()}`);
        const allFindings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(`findings/?${queryParams.toString()}`);
        console.log(`[getFindings] Fetched a total of ${allFindings.length} findings for initial filtering.`);
        
        // =================================================================
        // ALWAYS ENRICH WITH KEV INFORMATION
        // =================================================================
        console.log("[getFindings] KEV flag is true. Enriching findings with CISA KEV data...");
        const kevMap = await getKevCatalogMap();
        let processedFindings = allFindings.map(f => {
            const findingCve = extractCveFromFinding(f);
            const kevDetails = findingCve ? kevMap.get(findingCve) : null;
            
            return {
                ...f,
                cve: findingCve, // Overwrite with extracted CVE
                isKev: !!kevDetails,
                kevDetails: kevDetails || null,
                severity: kevDetails ? 'Critical' : f.severity // ALWAYS upgrade severity for KEVs
            };
        });


        // =================================================================
        // IF THE USER EXPLICITLY ASKED FOR KEVs, FILTER DOWN TO ONLY KEVs
        // =================================================================
        if (isKev === true) {
            processedFindings = processedFindings.filter(f => f.isKev);
            console.log(`[getFindings] Found ${processedFindings.length} KEVs after filtering.`);
        } else if (severity) {
            // Also filter by severity if it was provided and we are not exclusively looking for KEVs
            processedFindings = processedFindings.filter(f => f.severity === severity);
        }

        // Sort findings by severity (Critical first) and then score
        processedFindings.sort((a, b) => {
            const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Info': 4 };
            const severityA = severityOrder[a.severity as keyof typeof severityOrder] ?? 5;
            const severityB = severityOrder[b.severity as keyof typeof severityOrder] ?? 5;
            if (severityA !== severityB) return severityA - severityB;
            
            const scoreA = parseFloat(String(a.cvssv3_score)) || 0;
            const scoreB = parseFloat(String(b.cvssv3_score)) || 0;
            return scoreB - scoreA;
        });


        if (processedFindings.length === 0) {
            const criteria = [productName, severity, toolName, cve, componentName, isKev ? 'KEV' : null].filter(Boolean).join(', ');
            return { message: `No active vulnerabilities were found for the specified criteria: ${criteria}.` };
        }
        
        const allProductsList = await getProductList();
        const productMap = new Map(allProductsList.map(p => [p.id, p.name]));

        const finalFindings = processedFindings.slice(0, limit).map(f => {
            let findingProduct = 'Unknown Product';
            if (f.test && typeof f.test === 'object' && f.test.engagement && typeof f.test.engagement === 'object' && f.test.engagement.product) {
                findingProduct = productMap.get(f.test.engagement.product) ?? 'Unknown Product';
            }
            
            const findingData: any = {
                id: f.id,
                title: f.title,
                component: f.component_name || extractComponentFromTitle(f.title) || 'unknown',
                product: findingProduct,
                cve: f.cve || 'N/A',
                cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                cvssv3_score: f.cvssv3_score || 'N/A',
                severity: f.severity,
                tool: (f.test && typeof f.test === 'object' && f.test.test_type) ? f.test.test_type.name : 'Unknown',
                date: f.date,
            };

            if(f.isKev && f.kevDetails) {
                findingData.remediation = f.kevDetails.requiredAction;
                findingData.kev_due_date = f.kevDetails.dueDate;
            }

            return findingData;
        });

        return {
            totalCount: processedFindings.length,
            showing: finalFindings.length,
            product: requestedProductName,
            findings: finalFindings,
        };

    } catch (error) {
        console.error(`An exception occurred during getFindings. Details:`, error);
        return { error: `An exception occurred during getFindings. Details: ${error instanceof Error ? error.message : String(error)}` };
    }
}


export async function analyzeVulnerabilityData(analysisType: 'component_risk' | 'tool_comparison' | 'vulnerability_age' | 'cross_product_component_usage' | 'product_risk' | 'cve_analysis', productName?: string, severities?: string[], limit: number = 5) {
    try {
        const queryParams = new URLSearchParams({
            active: 'true',
            duplicate: 'false',
            limit: '2000',
            prefetch: 'test,test__test_type,test__engagement,test__engagement__product'
        });
        
        console.log(`[analyzeVulnerabilityData] Starting analysis type: ${analysisType}`);

        let productsToAnalyze: {id: number, name: string}[] = [];
        let requestedProductName = 'All Products';
        
        if (productName) {
            const productNames = productName.split(',').map(p => p.trim());
            const productInfos = await Promise.all(productNames.map(name => getProductInfoByName(name)));
            
            productsToAnalyze = productInfos.filter(p => p !== null) as {id: number, name: string}[];

            if (productsToAnalyze.length > 0) {
                const productIds = productsToAnalyze.map(p => p.id);
                if (productIds.length > 1) {
                   queryParams.set('test__engagement__product__in', productIds.join(','));
                   requestedProductName = productsToAnalyze.map(p => p.name).join(', ');
                } else {
                   queryParams.set('test__engagement__product', productIds[0].toString());
                   requestedProductName = productsToAnalyze[0].name;
                }
            } else {
                 console.warn(`[analyzeVulnerabilityData] None of the specified products were found: ${productName}`);
                 return { error: `None of the specified products were found: ${productName}` };
            }
        }


        if (severities && severities.length > 0) {
            queryParams.set('severity__in', severities.join(','));
        }
        
        console.log(`[analyzeVulnerabilityData] Querying findings with params: ${queryParams.toString()}`);
        const allFindings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(`findings/?${queryParams.toString()}`);
        
        if (allFindings.length === 0) {
            console.log("[analyzeVulnerabilityData] No active findings found for the specified criteria.");
            return { message: "No active findings found for the specified criteria to analyze." };
        }
        
        const allProductsList = await getProductList();
        const productMap = new Map(allProductsList.map(p => [p.id, p.name]));

        const findingsWithDetails = allFindings.map(f => {
            let findingProductName = 'Unknown Product';
            if (f.test && typeof f.test === 'object' && f.test.engagement && typeof f.test.engagement === 'object' && f.test.engagement.product) {
                findingProductName = productMap.get(f.test.engagement.product) ??- 'Unknown Product';
            }
            return {
                ...f,
                component: f.component_name || extractComponentFromTitle(f.title) || 'unknown',
                tool: (f.test && typeof f.test === 'object' && f.test.test_type) ? f.test.test_type.name : 'Unknown',
                product_name: findingProductName
            }
        });
        
        console.log(`[analyzeVulnerabilityData] Processing ${findingsWithDetails.length} findings.`);

        if (analysisType === 'component_risk') {
            const componentVulns: Record<string, { count: number; severities: Record<string, number> }> = {};
            
            for (const f of findingsWithDetails) {
                if (f.component === 'unknown') continue;

                if (!componentVulns[f.component]) {
                    componentVulns[f.component] = { count: 0, severities: {} };
                }
                componentVulns[f.component].count++;
                componentVulns[f.component].severities[f.severity] = (componentVulns[f.component].severities[f.severity] || 0) + 1;
            }

            const sortedComponents = Object.entries(componentVulns)
                .map(([name, data]) => {
                    const critical = data.severities['Critical'] || 0;
                    const high = data.severities['High'] || 0;
                    return { name, ...data, critical, high };
                })
                .sort((a, b) => {
                    if (b.critical !== a.critical) return b.critical - a.critical;
                    if (b.high !== a.high) return b.high - a.high;
                    return b.count - a.count;
                })
                .slice(0, limit);

            return { analysis: 'Component Risk', product: requestedProductName, results: sortedComponents };
        }

        if (analysisType === 'vulnerability_age') {
            const sortedByDate = findingsWithDetails
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, limit);

            return {
                analysis: 'Vulnerability Age',
                product: requestedProductName,
                results: sortedByDate.map(f => ({
                    title: f.title,
                    component: f.component,
                    product: f.product_name,
                    date: f.date,
                    severity: f.severity,
                    id: f.id,
                }))
            };
        }
        
        if (analysisType === 'tool_comparison') {
            const toolStats: Record<string, { count: number; components: Record<string, number>; severities: Record<string, number> }> = {};

            for (const f of findingsWithDetails) {
                if (f.tool === 'Unknown') continue;

                if (!toolStats[f.tool]) {
                    toolStats[f.tool] = { count: 0, components: {}, severities: {} };
                }

                toolStats[f.tool].count++;
                toolStats[f.tool].components[f.component] = (toolStats[f.tool].components[f.component] || 0) + 1;
                toolStats[f.tool].severities[f.severity] = (toolStats[f.tool].severities[f.severity] || 0) + 1;
            }

            const sortedTools = Object.entries(toolStats)
                .map(([name, data]) => {
                    const mostAffectedComponent = Object.entries(data.components).sort((a, b) => b[1] - a[1])[0];
                    return {
                        name,
                        count: data.count,
                        mostAffectedComponent: mostAffectedComponent ? mostAffectedComponent[0] : 'N/A',
                        severities: data.severities
                    };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return { analysis: 'Tool Comparison', product: requestedProductName, results: sortedTools };
        }

        if (analysisType === 'cross_product_component_usage') {
             const componentUsage: Record<string, { products: Set<string>, count: number, critical: number, high: number }> = {};
             
             for (const f of findingsWithDetails) {
                if (f.component === 'unknown' || !f.product_name || f.product_name === 'Unknown Product') continue;
                
                if (!componentUsage[f.component]) {
                    componentUsage[f.component] = { products: new Set(), count: 0, critical: 0, high: 0 };
                }
                
                componentUsage[f.component].products.add(f.product_name);
                componentUsage[f.component].count++;
                if (f.severity === 'Critical') componentUsage[f.component].critical++;
                if (f.severity === 'High') componentUsage[f.component].high++;
             }

             const requiredProductNames = new Set(productsToAnalyze.map(p => p.name));
             const sharedComponents = Object.entries(componentUsage)
                .map(([name, data]) => ({ name, productCount: data.products.size, vuln_count: data.count, critical: data.critical, high: data.high, products: Array.from(data.products) }))
                .filter(c => requiredProductNames.size > 0 ? Array.from(requiredProductNames).every(pName => c.products.includes(pName)) : c.productCount > 1) 
                .sort((a, b) => {
                    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
                    if (b.critical !== a.critical) return b.critical - a.critical;
                    if (b.high !== a.high) return b.high - a.high;
                    return b.vuln_count - a.vuln_count;
                })
                .slice(0, limit);

            return { analysis: 'Cross-Product Component Usage', results: sharedComponents };
        }
        
        if (analysisType === 'product_risk') {
            const productStats: Record<string, { count: number; severities: Record<string, number> }> = {};
            
            for (const f of findingsWithDetails) {
                if (!f.product_name || f.product_name === 'Unknown Product') continue;

                if (!productStats[f.product_name]) {
                    productStats[f.product_name] = { count: 0, severities: {} };
                }
                productStats[f.product_name].count++;
                productStats[f.product_name].severities[f.severity] = (productStats[f.product_name].severities[f.severity] || 0) + 1;
            }

            const sortedProducts = Object.entries(productStats)
                .map(([name, data]) => {
                    const critical = data.severities['Critical'] || 0;
                    const high = data.severities['High'] || 0;
                    return { name, ...data, critical, high };
                })
                .sort((a, b) => {
                    if (b.critical !== a.critical) return b.critical - a.critical;
                    if (b.high !== a.high) return b.count - a.count;
                })
                .slice(0, limit);
            
            return { analysis: 'Product Risk', results: sortedProducts };
        }

        if (analysisType === 'cve_analysis') {
            const cveCounts: Record<string, number> = {};
            for (const f of findingsWithDetails) {
                const cve = extractCveFromFinding(f);
                if (cve) {
                    cveCounts[cve] = (cveCounts[cve] || 0) + 1;
                }
            }

            const sortedCves = Object.entries(cveCounts)
                .map(([cve, count]) => ({ cve, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return { analysis: 'CVE Analysis', product: requestedProductName, results: sortedCves };
        }


        return { error: `Analysis type '${analysisType}' is not yet implemented.` };

    } catch (error) {
        console.error(`[analyzeVulnerabilityData] An exception occurred. Details:`, error);
        return { error: `An exception occurred during analysis. Details: ${error instanceof Error ? error.message : String(error)}` };
    }
}


export async function getTotalFindingCount(productName?: string, severity?: string) {
    try {
        const queryParams = new URLSearchParams({
            duplicate: 'false',
            limit: '1',
            active: 'true',
        });
        
        if (productName) {
            const productInfo = await getProductInfoByName(productName);
            if (productInfo) {
                queryParams.set('test__engagement__product', String(productInfo.id));
            }
        }
        if (severity) {
            queryParams.set('severity', severity);
        }

        const endpoint = `findings/?${queryParams.toString()}`;
        console.log(`[getTotalFindingCount] Querying with params: ${queryParams.toString()}`);
        const data = await defectDojoFetch(endpoint);
        const parsedData = z.object({ count: z.number() }).parse(data);
        return { count: parsedData.count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[getTotalFindingCount] Error: ${errorMessage}`);
        return { error: `Failed to retrieve total finding count: ${errorMessage}` };
    }
}

    