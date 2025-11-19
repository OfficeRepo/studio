# DojoGPT: AI-Powered Vulnerability Management Assistant

## Project Goal

DojoGPT was built to revolutionize how security teams interact with DefectDojo, our system of record for vulnerability management. The goal was to transform the tedious, manual process of searching, filtering, and analyzing vulnerability data into a fast, intuitive, and conversational experience. We wanted to empower any user—from a security analyst to a product manager—to ask complex questions in plain English and get immediate, actionable intelligence about our security posture.

---

## Core Features (What it Can Do)

After a rigorous process of development, debugging, and refinement, DojoGPT is now a robust and intelligent assistant with the following stable features:

-   **AI-Powered Q&A**: Ask complex questions in natural language and receive intelligent, context-aware answers.
    -   *"What are the top 5 critical vulnerabilities in Carelink Network?"*
    -   *"How many high-severity findings are in MCLH?"*

-   **Dynamic, Multi-Product Analysis**: Perform complex analysis and comparisons across one, many, or all products simultaneously.
    -   *"Which vulnerable component is shared between CLEM, MCLH, and MCLS?"*
    -   *"Compare the severity distribution between the MCLS and MCLH products."*

-   **Component and Library Risk Assessment**: Identify which software components and libraries pose the highest risk to your products.
    -   *"If you could fix only one component in Patient Connector 24965, which one gives the biggest risk reduction?"*
    -   *"What are the top 3 most vulnerable libraries in CLEM?"*

-   **Tool and Scanner Performance Analysis**: Analyze and compare the effectiveness of different security scanners integrated with DefectDojo.
    -   *"Which scanner has found the most 'Critical' findings across all products?"*
    -   *"Show me all findings from DependencyTrack in the CLEM product."*

-   **Direct Data Listing**: Get raw, unfiltered lists of your core assets right from the DefectDojo API.
    -   *"List all products."*
    -   *"Can you list all the tools?"*

---

## The Development Journey: From Broken to Brilliant

Building a truly intelligent AI assistant is an iterative process. Our journey with DojoGPT involved overcoming significant technical challenges, primarily related to the complex and sometimes inconsistent nature of API data.

Initially, the chatbot struggled with fundamental queries. It would fail to retrieve data, give incorrect "no results" answers, or crash entirely. Through a persistent cycle of user feedback, debugging, and architectural refinement, we systematically addressed each failure:

1.  **Intelligent Response Formatting:** The chatbot was too rigid, responding to every query with a formal, executive-level report. This was unhelpful for simple questions.
    *   **The Fix:** We implemented smarter response logic. The AI now distinguishes between simple questions (e.g., "list all tools") and complex analysis ("generate a risk report"). It provides direct, conversational answers for simple queries and reserves the full, structured report for deep analysis, making the interaction far more natural.

2.  **Unreadable UI and Messy Data:** When the chatbot returned data, it was often in a poorly formatted, unreadable block of text. Markdown tables were not rendering correctly, making lists of vulnerabilities useless.
    *   **The Fix:** We integrated `react-markdown` with table support (`remark-gfm`) into the UI. Now, all Markdown responses, especially tables, are rendered beautifully. This transforms messy data into clean, professional, and easy-to-read lists.

3.  **Lack of Actionable Dashboards:** The KPI Dashboard was slow, buggy, and didn't highlight the most critical information. The "Top Vulnerable Products" and "Product Deep Dive" features were broken.
    *   **The Fix:** We completely overhauled the KPI Dashboard. We removed the non-working sections and replaced them with two new, highly-visual components: a **"KEV Overview"** donut chart and a **"Top 5 Riskiest Components"** bar chart. This provides immediate, actionable intelligence about active exploits and high-risk components.

4.  **The Inefficiency of Data Analysis:** The backend was incredibly slow and prone to crashes, making hundreds of unnecessary API calls. Complex analytical queries were failing because the analysis engine couldn't properly group and compare data.
    *   **The Fix:** We completely refactored the data analysis engine. The KPI dashboard now uses a bulk-fetching strategy, grabbing all necessary data in a few efficient calls. The `analyze_vulnerability_data` function was overhauled to correctly perform complex grouping and cross-product analysis, finally unlocking the chatbot's most powerful analytical features.

This journey highlights a core principle of building with AI: the intelligence is only as good as the data you feed it and the clarity with which it's presented. By building a robust data-handling layer and a clean UI, we transformed DojoGPT from a frustrating prototype into a powerful and reliable tool.

---

## Technology Stack

This application is built with a modern, server-centric web architecture designed for performance, type safety, and a great developer experience.

-   **Framework**: **Next.js 15** (with App Router and Server Actions for secure backend logic).
-   **Language**: **TypeScript**.
-   **AI Integration**: Medtronic GPT API for natural language understanding and response generation.
-   **Data Fetching & Validation**: Direct `fetch` calls to the DefectDojo REST API with robust data validation using **Zod**.
-   **Frontend**: **React** with React Context for state management.
-   **UI Components**: **ShadCN UI** - A collection of beautifully designed, accessible, and composable components.
-   **Styling**: **Tailwind CSS** - For rapid, utility-first styling.
-   **Icons**: **Lucide React** - For crisp, lightweight icons.
-   **Deployment**: The project includes a `DEPLOY.md` guide for deploying to a production Ubuntu server using **Nginx** and **PM2**.

---

## Project Workflow & File Structure

Here’s a step-by-step breakdown of how a user's question flows through the application and a guide to the key files involved.

### Request Lifecycle (How it Works)

1.  **User Sends a Message**:
    *   You type a question into the chatbox and hit "Send".
    *   **File**: `src/app/(app)/chat/page.tsx`
    *   **Logic**: This React component captures your input and calls a Server Action to get the AI's response.

2.  **Calling the Backend (Server Action)**:
    *   The frontend calls the `answerVulnerabilityQuestions` function.
    *   **File**: `src/app/actions.ts`
    *   **Logic**: This file acts as a secure bridge, passing the user's question from the client to the server-side AI flow.

3.  **Orchestrating the AI (AI Flow)**:
    *   The action calls the `answerVulnerabilityQuestions` flow.
    *   **File**: `src/ai/flows/answer-vulnerability-questions.ts`
    *   **Logic**: This is the application's "brain". It receives the question and makes the first call to the Medtronic GPT API. It also defines the "tools" (like `get_findings` or `get_product_list`) that the AI is allowed to use.

4.  **AI Decides to Use a Tool**:
    *   The Medtronic GPT API analyzes your question and the list of available tools. It determines that to answer your question, it needs data from DefectDojo.
    *   It sends a response back to our application saying, "I need to call the `get_findings` tool with these arguments (e.g., `productName: 'CLEM'`)."

5.  **Executing the Tool (Fetching Data)**:
    *   The AI flow receives the AI's request to use a tool.
    *   It calls the appropriate function from the `services` directory.
    *   **File**: `src/services/defectdojo.ts`
    *   **Logic**: This file is responsible for all communication with the DefectDojo API. It handles authentication, builds the correct API URL, fetches the live data, and validates it with Zod schemas.

6.  **Sending Data Back to the AI**:
    *   The data from DefectDojo is returned to the AI flow.
    *   The flow then makes a *second* call to the Medtronic GPT API, sending the original question plus the new data. It essentially says, "Here's the data you asked for; now you can form your final answer."

7.  **Generating and Displaying the Final Answer**:
    *   The Medtronic GPT API generates a human-readable, Markdown-formatted answer, which is sent all the way back through the call stack and rendered on the chat page.
