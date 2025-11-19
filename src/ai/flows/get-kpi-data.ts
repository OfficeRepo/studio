
'use server';
/**
 * @fileOverview A flow to gather Key Performance Indicator (KPI) data from DefectDojo.
 *
 * - getKpiData - A function that aggregates various vulnerability metrics.
 * - KpiData - The return type for the getKpiData function.
 */
import {z} from 'zod';
import { getProductList, defectDojoFetchAll } from '@/services/defectdojo';
import { getKevCatalogMap } from '@/services/cisa';
import { FindingSchema, extractCveFromFinding } from '@/services/defectdojo-types';


const KpiDataSchema = z.object({
  severityCounts: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    info: z.number(),
  }),
  openVsClosedCounts: z.object({
    open: z.number(),
    closed: z.number(),
  }),
  kevCounts: z.object({
    kev: z.number(),
    nonKev: z.number(),
  }),
  topRiskiestComponents: z.array(z.object({
    name: z.string(),
    critical: z.number(),
    high: z.number(),
    total: z.number(),
  })),
  allProducts: z.array(z.object({
      id: z.number(),
      name: z.string()
  })),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

function extractComponentFromTitle(title: string): string {
    const lowerTitle = title.toLowerCase();
    // A simplified version of the logic in defectdojo.ts
    // This is just a fallback.
    const common_components = ['openssl', 'log4j', 'spring-boot', 'go', 'python', 'java'];
    for (const comp of common_components) {
        if (lowerTitle.includes(comp)) {
            return comp;
        }
    }
    return 'unknown';
}


// This function is no longer a Genkit flow. It's a standard async function.
export async function getKpiData(): Promise<KpiData> {
    console.log("Fetching live KPI data from DefectDojo...");
    
    const [allProducts, allActiveFindings, allClosedFindings, kevMap] = await Promise.all([
        getProductList(),
        defectDojoFetchAll<z.infer<typeof FindingSchema>>('findings/?active=true&duplicate=false&limit=2000&prefetch=test__engagement__product'),
        defectDojoFetchAll<z.infer<typeof FindingSchema>>('findings/?active=false&verified=true&duplicate=false&limit=2000'),
        getKevCatalogMap(),
    ]);
    
    let totalSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let kevFindingCount = 0;
    const componentVulnCounts: Record<string, { critical: number, high: number, total: number }> = {};

    for (const f of allActiveFindings) {
        const cve = extractCveFromFinding(f);
        const isKev = !!(cve && kevMap.has(cve));
        
        let severity = f.severity.toLowerCase();
        if (isKev) {
            kevFindingCount++;
            severity = 'critical'; // Always treat KEVs as critical
        }
        
        if (severity in totalSeverityCounts) {
            (totalSeverityCounts as any)[severity]++;
        }

        // Aggregate component risk
        const componentName = f.component_name || extractComponentFromTitle(f.title);
        if (componentName && componentName !== 'unknown') {
            if (!componentVulnCounts[componentName]) {
                componentVulnCounts[componentName] = { critical: 0, high: 0, total: 0 };
            }
            componentVulnCounts[componentName].total++;
            if (severity === 'critical') {
                componentVulnCounts[componentName].critical++;
            }
            if (severity === 'high') {
                componentVulnsCounts[componentName].high++;
            }
        }
    }
    
    const openFindingsCount = allActiveFindings.length;
    const closedFindingsCount = allClosedFindings.length;

    const topRiskiestComponents = Object.entries(componentVulnCounts)
        .map(([name, counts]) => ({ name, ...counts }))
        .sort((a, b) => {
            if (b.critical !== a.critical) return b.critical - a.critical;
            if (b.high !== a.high) return b.high - a.high;
            return b.total - a.total;
        })
        .slice(0, 5);


    const result = {
        severityCounts: totalSeverityCounts,
        openVsClosedCounts: {
            open: openFindingsCount,
            closed: closedFindingsCount,
        },
        kevCounts: {
            kev: kevFindingCount,
            nonKev: openFindingsCount - kevFindingCount,
        },
        topRiskiestComponents: topRiskiestComponents,
        allProducts: allProducts
    };
    
    console.log("Successfully fetched and processed KPI data.");
    return result;
}
