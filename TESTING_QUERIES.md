# DojoGPT - Comprehensive Testing Queries

This document provides a structured list of questions to test the new, intelligent response formatting of DojoGPT. The queries are separated into two categories: those that should produce a simple list/answer, and those that should generate a full analytical report.

---

## Part 1: Simple List & Fact-Based Queries

**Goal:** Verify that the chatbot provides a direct, clean answer (e.g., a simple list, a table, or a single sentence) without any "Executive Summary" or "Actionable Remediation Plan". These queries typically start with "List", "Show", "Get", or ask for a simple count.

### Basic Asset & Finding Lists
- "List all products."
- "List all tools."
- "Show me all active findings in MCLS."
- "Get the 5 most recent findings across all products."
- "Find all open vulnerabilities in MCLS reported by SonarQube."
- "List all vulnerabilities for CVE-2021-44228."

### Simple Counts & "How Many" Questions
- "How many critical vulnerabilities are open in MCLH?"
- "What is the total count of active findings in the Carelink Network?"
- "How many total findings are present in Linq Mobile Manager?"

### KEV (Known Exploited Vulnerability) Lists
- "Show me all KEVs in Carelink Network."
- "List all known exploited vulnerabilities in the CLEM product."
- "Get all CISA KEVs across all products."

---

## Part 2: Complex Analysis & Report-Based Queries

**Goal:** Verify that the chatbot generates a full, structured "AI-Generated Report" including an "Executive Summary" and an "Actionable Remediation Plan". These queries use keywords like "analyze", "report", "prioritize", "compare", "risk", or "assessment".

### Component & Library Risk Analysis
- "Analyze component risk for the MCLH product."
- "If you could fix only one component in Patient Connector 24965, which one gives the biggest risk reduction?"
- "Generate a report of the top 3 most vulnerable libraries in CLEM."
- "What is the severity distribution for the 'openssl' component across all products? Provide a full report."
- "Prioritize the top 5 riskiest components across all products."

### Tool & Scanner Performance Analysis
- "Generate a tool comparison report for Carelink Network."
- "Which scanner has found the most 'Critical' findings across all products? Give me the full analysis."
- "Compare the findings of Jfrog and DependencyTrack in 'MyCareLink Patient Monitor'."

### Cross-Product & Comparative Analysis
- "Which vulnerable component is shared between CLEM, MCLH, and MCLS? Provide a detailed assessment."
- "Generate a report comparing the severity distribution between the MCLS and MCLH products."
- "Analyze which 3 libraries appear most frequently in critical CVEs across all products."

### Prioritization & "What if" Scenarios
- "If I could patch only one component in MyCareLink Relay, which one would reduce the highest overall risk?"
- "Which 3 libraries across all products should we focus on replacing to improve our security posture? Generate a remediation plan."
- "Generate a KEV report for MCLS, including a prioritization plan."
