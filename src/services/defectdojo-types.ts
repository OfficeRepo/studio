
import { z } from 'zod';

/**
 * @fileOverview This file contains the Zod schemas for validating DefectDojo API responses.
 * These schemas are used across both server and client components.
 */

export const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
});

export const EngagementSchema = z.object({
    id: z.number(),
    name: z.string(),
    product: z.number(),
});

export const TestTypeSchema = z.object({
    id: z.number(),
    name: z.string(),
});

export const TestObjectSchema = z.object({
    id: z.number(),
    test_type: TestTypeSchema,
    engagement: EngagementSchema,
});

export const FindingSchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    description: z.string(),
    mitigation: z.string().nullable().optional(),
    active: z.boolean(),
    cwe: z.number().nullable(),
    cve: z.string().nullable().optional(),
    cvssv3_score: z.union([z.string(), z.number()]).nullable(),
    // The 'test' field can either be a full object or just an ID (number).
    // We also make it optional as some findings might not have it.
    test: z.union([TestObjectSchema, z.number()]).optional(),
    found_by: z.array(z.number()),
    date: z.string(), // ISO date string
    component_name: z.string().nullable().optional(),
    component_version: z.string().nullable().optional(),
    product_name: z.string().optional().nullable(),
});

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
