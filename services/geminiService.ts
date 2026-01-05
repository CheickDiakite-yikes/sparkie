import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse } from "@google/genai";
import { AspectRatio, GroundingChunk, ImageSize, UserNote, AIAnalysisSections } from "../types";

// Helper to ensure fresh instance with latest key (e.g. after user selects one)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AGENT PROMPTS ---

const RESEARCH_AGENT_PROMPT = `
You are an Elite Market Researcher & Trend Analyst. 
Your goal is to validate the user's idea against the CURRENT market (2024-2025).

INSTRUCTIONS:
1. **Deep Search**: Look for direct competitors, recent startup launches (ProductHunt, TechCrunch), and similar features in major apps.
2. **Critical Analysis**: Don't just list them. Analyze *why* they are successful or failing.
3. **News Check**: Specifically look for news from the last 12 months relevant to this domain.

Output Format (Markdown):
* **🛡️ Competitor Landscape**: List 3-5 real competitors with their strengths/weaknesses.
* **📈 Market Pulse**: Current trends, funding news, or user shifts in this space.
* **🎯 The "Why Now"**: Why is this the right time for this idea?
`;

const TECH_SCOUT_PROMPT = `
You are a Principal Software Architect and CTO.
Your goal is to figure out HOW to build this idea using the latest technology.

INSTRUCTIONS:
1. **Search Repos & Docs**: Look for open-source libraries (GitHub), APIs, and SDKs that solve the core problems of this idea.
2. **Feasibility Check**: Identify the hardest technical challenges (e.g., latency, cost, hardware access).
3. **Stack Recommendation**: Suggest a modern stack (e.g., specific AI models, databases, frameworks).

Output Format (Markdown):
* **🏗️ Recommended Stack**: Frontend, Backend, AI Models, Database.
* **🧩 Key APIs & Libraries**: Specific tools to use (e.g., "Use Stripe Connect for payments", "Use LangChain for orchestration").
* **⚠️ Technical Risks**: What will be the hardest thing to engineer?
`;

const PRODUCT_AGENT_PROMPT = `
You are a Senior Product Manager.
Review the User's Notes, the Market Research, and the Technical Feasibility Report.
Create a detailed Product Requirements Document (PRD).

INSTRUCTIONS:
* Be specific. Don't say "User Authentication", say "Magic Link Login via Supabase".
* Prioritize "Dopamine" moments—features that delight users instantly.

Output Format (Markdown):
* **💎 Core Value Prop**: One sentence that sells it.
* **👤 Target Personas**: Who are we building for?
* **🚀 MVP Feature Set**: The absolute must-haves for V1.
* **✨ The "Magic Moment"**: The specific interaction that hooks the user.
* **📖 User Stories**: 3 critical flows.
`;

const DESIGN_AGENT_PROMPT = `
You are a Lead UI/UX Designer known for "Dopamine Design" and "App Store Award" winning aesthetics.
Review the PRD and User Notes. Define the visual and interaction experience.

Output Format (Markdown):
* **🎨 Design Philosophy**: The "Vibe" (e.g., "Neo-Brutalism", "Soft Pop", "Glassmorphism").
* **🌈 Color & Typography**: Specific palette suggestions (hex codes if possible) and font pairings.
* **📱 Key Screens**: Detailed breakdown of the Home, Action, and Settings views.
* **⚡ Micro-Interactions**: Fun animations and feedback loops (e.g., "Confetti burst on save").
`;

const ONE_SHOT_AGENT_PROMPT = `
You are a Lead AI Prompt Engineer.
Your goal is to write the ULTIMATE "One-Shot" prompt that a user can paste into an AI coding agent (like Cursor, Windsurf, or Bolt) to build this exact app.

INSTRUCTIONS:
1. **Contextualize**: Start by defining the role for the AI agent (e.g., "You are a Senior React Native Engineer").
2. **Tech Stack**: Use the stack recommended in the Technical Feasibility report.
3. **Step-by-Step**: Create a detailed plan (Setup, Database, UI, Logic).
4. **Files**: List key files to create.
5. **Tone**: Detailed, strict, and professional.

Output Format (Markdown):
# Build Prompt for [App Name]

**Role**: You are an expert...
**Goal**: Build...

[...Detailed Prompt Content...]
`;

const EXECUTIVE_AGENT_PROMPT = `
You are the Chief Strategy Officer.
Summarize the entire project (Market, Tech, Product, Design) into a tight Executive Brief.
Highlight the biggest Opportunity and the biggest Risk.
Keep it under 200 words. Make it punchy.
`;

// --- TOOLS DEFINITION ---

const updateBlueprintTool: FunctionDeclaration = {
  name: 'updateProjectBlueprint',
  description: 'Updates a specific section of the project documentation (Blueprints). Use this when the user asks to modify or rewrite the PRD, Design, Strategy, Research, or the One-Shot Prompt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      section: {
        type: Type.STRING,
        enum: ['executiveSummary', 'marketResearch', 'prd', 'uiux', 'oneShotPrompt'],
        description: 'The section ID to update.'
      },
      content: {
        type: Type.STRING,
        description: 'The new full markdown content for this section.'
      }
    },
    required: ['section', 'content']
  }
};

// --- ORCHESTRATOR ---

export const analyzeIdeaRecursive = async (
  title: string,
  notes: UserNote[]
): Promise<{ analysis: AIAnalysisSections; groundingChunks: GroundingChunk[] }> => {
  try {
    const ai = getAI();
    // 1. Prepare Context
    const combinedNotes = notes.map(n => `[${new Date(n.timestamp).toLocaleDateString()}] ${n.text}`).join('\n\n');
    const context = `PROJECT TITLE: ${title}\n\nUSER NOTES HISTORY:\n${combinedNotes}`;

    // 2. DUAL-TRACK RESEARCH (Parallel Execution)
    console.log("Starting Dual-Track Research...");
    
    const [marketResp, techResp] = await Promise.all([
      // Track A: Market
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${RESEARCH_AGENT_PROMPT}\n\n${context}`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 2048 } // Think about competitors
        }
      }),
      // Track B: Tech
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${TECH_SCOUT_PROMPT}\n\n${context}`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 2048 } // Think about architecture
        }
      })
    ]);

    const marketText = marketResp.text || "Market research pending...";
    const techText = techResp.text || "Technical research pending...";
    
    // Collect grounding chunks from both
    const groundingChunks = [
      ...(marketResp.candidates?.[0]?.groundingMetadata?.groundingChunks || []),
      ...(techResp.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
    ];

    // Combine them for the display
    const combinedResearch = `${marketText}\n\n---\n\n### 🛠️ Technical Architecture & Feasibility\n\n${techText}`;

    // 3. GENERATE BLUEPRINTS (Parallel Execution)
    const enrichedContext = `${context}\n\n--- 🌍 MARKET RESEARCH ---\n${marketText}\n\n--- 🛠️ TECHNICAL FEASIBILITY ---\n${techText}`;

    console.log("Generating Blueprints...");

    const [prdResp, uiuxResp, execResp, oneShotResp] = await Promise.all([
      // Product Agent
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${PRODUCT_AGENT_PROMPT}\n\n${enrichedContext}`,
        config: { tools: [{ googleSearch: {} }] } 
      }),
      // Design Agent
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${DESIGN_AGENT_PROMPT}\n\n${enrichedContext}`,
      }),
      // Executive Agent
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${EXECUTIVE_AGENT_PROMPT}\n\n${enrichedContext}`,
      }),
      // One-Shot Prompt Engineer
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${ONE_SHOT_AGENT_PROMPT}\n\n${enrichedContext}`,
      })
    ]);

    // Aggregate extra grounding from PRD if any
    if (prdResp.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        groundingChunks.push(...prdResp.candidates[0].groundingMetadata.groundingChunks);
    }

    return {
      analysis: {
        marketResearch: combinedResearch, 
        prd: prdResp.text || "Pending PRD...",
        uiux: uiuxResp.text || "Pending Design Specs...",
        executiveSummary: execResp.text || "Pending Summary...",
        oneShotPrompt: oneShotResp.text || "Pending Build Prompt..."
      },
      groundingChunks: groundingChunks as GroundingChunk[]
    };

  } catch (error) {
    console.error("Recursive Analysis Error:", error);
    throw error;
  }
};

// --- CHAT AGENT WITH TOOLS ---

export const sendAgentChat = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  context?: string
): Promise<{ response: GenerateContentResponse; chat: Chat }> => {
  try {
    const ai = getAI();
    const systemInstruction = context 
      ? `You are a helpful creative assistant in a notes app called SparkGarden. 
         The user is currently looking at a project with specific context provided below.
         
         CONTEXT:
         ${context}
         
         CAPABILITIES:
         1. You can answer questions about the idea using the context.
         2. You can UPDATE the project blueprints (PRD, Design, Market Research, One-Shot Prompt) using the 'updateProjectBlueprint' tool.
         
         If the user asks to "Refine the PRD" or "Update the build prompt", USE THE TOOL.
         
         Note: You do not have direct access to live Google Search in this chat session. Rely on the detailed research provided in the CONTEXT.`
      : `You are a helpful creative assistant in a notes app called SparkGarden. Help the user develop their ideas.`;

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction,
        tools: [
            { functionDeclarations: [updateBlueprintTool] }
            // Removed googleSearch to prevent "Tool use with function calling is unsupported" error
        ]
      },
      history: history,
    });

    const response = await chat.sendMessage({ message: newMessage });
    return { response, chat };

  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

// --- IMAGE GEN ---

export const generateConceptImage = async (
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.SQUARE,
  size: ImageSize = ImageSize.ONE_K,
  style: 'artistic' | 'ui-flow' = 'artistic'
): Promise<string> => {
  try {
    const ai = getAI();
    let finalPrompt = prompt;
    
    // Enrich prompt based on style
    if (style === 'ui-flow') {
        finalPrompt = `
        High-fidelity professional UI design mockup for mobile app.
        Content: ${prompt}.
        Layout: A horizontal sequence of 5 mobile screens side-by-side, showcasing a cohesive user flow with transitions. 
        Style: Modern, clean, Dribbble trending, Figma portfolio presentation, sleek typography, high contrast, dark mode aesthetics if appropriate.
        Resolution: 4k, incredibly detailed, photorealistic.
        `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Visuals still need Pro Image model
      contents: {
        parts: [{ text: finalPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: size
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image gen error:", error);
    throw error;
  }
};

// --- MAPS ---

export const findRelevantPlaces = async (
  query: string,
  userLocation?: { lat: number; lng: number }
): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  try {
    const ai = getAI();
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (userLocation) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.lat,
            longitude: userLocation.lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: config
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, groundingChunks: groundingChunks as GroundingChunk[] };

  } catch (error) {
    console.error("Maps error:", error);
    throw error;
  }
};