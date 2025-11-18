
'use server';
/**
 * @fileOverview A flow to get detailed KPI data for a specific product.
 *
 * - getProductKpiData - A function that aggregates vulnerability metrics for one product.
 * - ProductKpiData - The return type for the getProductKpiData function.
 */
import {z} from 'genkit';
import { defectDojoFetchAll, getProductInfoByName } from '@/services/defectdojo';
import type { FindingSchema } from '@/services/defectdojo-types';


const ProductKpiDataSchema = z.object({
  severityCounts: z.object({
    Critical: z.number(),
    High: z.number(),
    Medium: z.number(),
    Low: z.number(),
    Info: z.number(),
    Total: z.number(),
  }),
  topCriticalFindings: z.array(z.object({
      id: z.number(),
      title: z.string(),
      severity: z.string(),
      cwe: z.string(),
  }))
});
export type ProductKpiData = z.infer<typeof ProductKpiDataSchema>;

const ProductKpiInputSchema = z.object({
    productName: z.string(),
});
export type ProductKpiInput = z.infer<typeof ProductKpiInputSchema>;

// This is no longer a Genkit flow, but a standard async function.
export async function getProductKpiData(input: ProductKpiInput): Promise<ProductKpiData> {
    const { productName } = input;
    
    const productInfo = await getProductInfoByName(productName);
    if (!productInfo) {
        throw new Error(`Product ${productName} not found`);
    }

    const allFindings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(
        `findings/?test__engagement__product=${productInfo.id}&active=true&duplicate=false`
    );

    const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
    const criticalFindings: any[] = [];

    for (const finding of allFindings) {
        if (finding.severity in severityCounts) {
             severityCounts[finding.severity]++;
             severityCounts.Total++;
        }
        if (finding.severity === 'Critical') {
            criticalFindings.push(finding);
        }
    }

    const topCriticalFindings = criticalFindings
        .sort((a, b) => {
            const scoreA = parseFloat(a.cvssv3_score) || 0;
            const scoreB = parseFloat(b.cvssv3_score) || 0;
            return scoreB - scoreA;
        })
        .slice(0, 5)
        .map((f: any) => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            cwe: f.cwe ? `CWE-${f.cwe}` : 'N/A'
        }));

    return {
        severityCounts,
        topCriticalFindings
    };
}
