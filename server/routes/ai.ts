import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { query } from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = 'gemini-2.0-flash';

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

const updateBlueprintTool = {
  name: 'updateProjectBlueprint',
  description: 'Updates a specific section of the project documentation (Blueprints). Use this when the user asks to modify or rewrite the PRD, Design, Strategy, Research, or the One-Shot Prompt.',
  parametersJsonSchema: {
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

router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const ideaResult = await query('SELECT * FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const idea = ideaResult.rows[0];

    await query('UPDATE ideas SET status = $1, updated_at = NOW() WHERE id = $2', ['processing', ideaId]);

    res.json({ status: 'processing', message: 'Analysis started' });

    (async () => {
      try {
        const ai = getAI();
        const notesResult = await query('SELECT * FROM user_notes WHERE idea_id = $1 ORDER BY created_at ASC', [ideaId]);
        const combinedNotes = notesResult.rows.map((n: any) => `[${new Date(n.created_at).toLocaleDateString()}] ${n.text}`).join('\n\n');
        const context = `PROJECT TITLE: ${idea.title}\n\nUSER NOTES HISTORY:\n${combinedNotes}`;

        const [marketResp, techResp] = await Promise.all([
          ai.models.generateContent({
            model: MODEL,
            contents: `${RESEARCH_AGENT_PROMPT}\n\n${context}`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          }),
          ai.models.generateContent({
            model: MODEL,
            contents: `${TECH_SCOUT_PROMPT}\n\n${context}`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          })
        ]);

        const marketText = marketResp.text || "Market research pending...";
        const techText = techResp.text || "Technical research pending...";

        const groundingChunks: any[] = [
          ...(marketResp.candidates?.[0]?.groundingMetadata?.groundingChunks || []),
          ...(techResp.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        ];

        const combinedResearch = `${marketText}\n\n---\n\n### 🛠️ Technical Architecture & Feasibility\n\n${techText}`;
        const enrichedContext = `${context}\n\n--- 🌍 MARKET RESEARCH ---\n${marketText}\n\n--- 🛠️ TECHNICAL FEASIBILITY ---\n${techText}`;

        const [prdResp, uiuxResp, execResp, oneShotResp] = await Promise.all([
          ai.models.generateContent({
            model: MODEL,
            contents: `${PRODUCT_AGENT_PROMPT}\n\n${enrichedContext}`,
            config: {
              tools: [{ googleSearch: {} }],
            }
          }),
          ai.models.generateContent({
            model: MODEL,
            contents: `${DESIGN_AGENT_PROMPT}\n\n${enrichedContext}`,
          }),
          ai.models.generateContent({
            model: MODEL,
            contents: `${EXECUTIVE_AGENT_PROMPT}\n\n${enrichedContext}`,
          }),
          ai.models.generateContent({
            model: MODEL,
            contents: `${ONE_SHOT_AGENT_PROMPT}\n\n${enrichedContext}`,
          })
        ]);

        const analysisData = {
          executive_summary: execResp.text || "Pending Summary...",
          market_research: combinedResearch,
          prd: prdResp.text || "Pending PRD...",
          uiux: uiuxResp.text || "Pending Design Specs...",
          one_shot_prompt: oneShotResp.text || "Pending Build Prompt..."
        };

        if (prdResp.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          groundingChunks.push(...prdResp.candidates[0].groundingMetadata.groundingChunks);
        }

        await query(
          `INSERT INTO analysis (idea_id, executive_summary, market_research, prd, uiux, one_shot_prompt, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (idea_id) DO UPDATE SET
             executive_summary = $2, market_research = $3, prd = $4, uiux = $5, one_shot_prompt = $6, updated_at = NOW()`,
          [ideaId, analysisData.executive_summary, analysisData.market_research, analysisData.prd, analysisData.uiux, analysisData.one_shot_prompt]
        );

        for (const chunk of groundingChunks) {
          const web = (chunk as any).web;
          const maps = (chunk as any).maps;
          if (web) {
            await query('INSERT INTO grounding_sources (idea_id, source_type, uri, title) VALUES ($1, $2, $3, $4)',
              [ideaId, 'web', web.uri, web.title]);
          } else if (maps) {
            await query('INSERT INTO grounding_sources (idea_id, source_type, uri, title) VALUES ($1, $2, $3, $4)',
              [ideaId, 'maps', maps.uri, maps.title]);
          }
        }

        await query('UPDATE ideas SET status = $1, updated_at = NOW() WHERE id = $2', ['ready', ideaId]);
        console.log(`Analysis complete for idea ${ideaId}`);
      } catch (error) {
        console.error(`Analysis failed for idea ${ideaId}:`, error);
        await query('UPDATE ideas SET status = $1, updated_at = NOW() WHERE id = $2', ['error', ideaId]);
      }
    })();
  } catch (error) {
    console.error('Analyze error:', error);
    return res.status(500).json({ error: 'Failed to start analysis' });
  }
});

router.post('/:id/ai-chat', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const ideaResult = await query('SELECT * FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await query('INSERT INTO chat_messages (idea_id, role, text) VALUES ($1, $2, $3)', [ideaId, 'user', message]);

    const analysisResult = await query('SELECT * FROM analysis WHERE idea_id = $1', [ideaId]);
    const analysis = analysisResult.rows[0];

    let contextStr = '';
    if (analysis) {
      contextStr = `
PROJECT: ${ideaResult.rows[0].title}

EXECUTIVE SUMMARY:
${analysis.executive_summary}

MARKET RESEARCH:
${analysis.market_research}

PRD:
${analysis.prd}

UI/UX DESIGN:
${analysis.uiux}

ONE-SHOT PROMPT:
${analysis.one_shot_prompt}
`;
    }

    const ai = getAI();
    const systemInstruction = contextStr
      ? `You are a helpful creative assistant in a notes app called SparkGarden. 
         The user is currently looking at a project with specific context provided below.
         
         CONTEXT:
         ${contextStr}
         
         CAPABILITIES:
         1. You can answer questions about the idea using the context.
         2. You can UPDATE the project blueprints (PRD, Design, Market Research, One-Shot Prompt) using the 'updateProjectBlueprint' tool.
         
         If the user asks to "Refine the PRD" or "Update the build prompt", USE THE TOOL.
         
         Note: You do not have direct access to live Google Search in this chat session. Rely on the detailed research provided in the CONTEXT.`
      : `You are a helpful creative assistant in a notes app called SparkGarden. Help the user develop their ideas.`;

    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: MODEL,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [updateBlueprintTool] }],
      },
      history: chatHistory,
    });

    const result = await chat.sendMessage({ message });

    const sectionMap: Record<string, string> = {
      executiveSummary: 'executive_summary',
      marketResearch: 'market_research',
      prd: 'prd',
      uiux: 'uiux',
      oneShotPrompt: 'one_shot_prompt'
    };

    let toolCallResults: any[] = [];
    if (result.functionCalls) {
      for (const fc of result.functionCalls) {
        if (fc.name === 'updateProjectBlueprint') {
          const args = fc.args as any;
          const dbColumn = sectionMap[args.section];
          if (dbColumn && args.content) {
            await query(
              `UPDATE analysis SET ${dbColumn} = $1, updated_at = NOW() WHERE idea_id = $2`,
              [args.content, ideaId]
            );
            toolCallResults.push({ section: args.section, updated: true });
          }
        }
      }
    }

    const responseText = result.text || '';
    await query('INSERT INTO chat_messages (idea_id, role, text) VALUES ($1, $2, $3)', [ideaId, 'model', responseText]);

    return res.json({
      response: responseText,
      toolCalls: toolCallResults
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: 'AI chat failed' });
  }
});

router.post('/:id/generate-image', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const ideaResult = await query('SELECT * FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { prompt, aspect_ratio, style } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAI();
    let finalPrompt = prompt;

    if (style === 'ui-flow') {
      finalPrompt = `
        High-fidelity professional UI design mockup for mobile app.
        Content: ${prompt}.
        Layout: A horizontal sequence of 5 mobile screens side-by-side, showcasing a cohesive user flow with transitions. 
        Style: Modern, clean, Dribbble trending, Figma portfolio presentation, sleek typography, high contrast, dark mode aesthetics if appropriate.
        Resolution: 4k, incredibly detailed, photorealistic.
      `;
    }

    const aspectMap: Record<string, string> = {
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
    };

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectMap[aspect_ratio] || '1:1',
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        return res.status(400).json({
          error: "Image generation returned no results. The prompt may have been filtered by safety settings. Try rephrasing your concept description."
        });
      }

      const imageBytes = response.generatedImages[0].image?.imageBytes;
      if (!imageBytes) {
        return res.status(400).json({
          error: "Image generation completed but no image data was returned. Please try again."
        });
      }

      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      const storageKey = `images/idea-${ideaId}/${Date.now()}.png`;
      const buffer = Buffer.from(imageBytes, 'base64');

      await client.uploadFromBytes(storageKey, buffer);

      await query(
        'INSERT INTO images (idea_id, storage_key, prompt, aspect_ratio, style) VALUES ($1, $2, $3, $4, $5)',
        [ideaId, storageKey, prompt, aspect_ratio || '1:1', style || 'artistic']
      );

      return res.json({ storage_key: storageKey, url: `/api/images/${encodeURIComponent(storageKey)}` });
    } catch (imgError: any) {
      console.error('Image generation error:', imgError);
      if (imgError.message?.includes('not found') || imgError.message?.includes('not supported')) {
        return res.status(400).json({
          error: "The Imagen model is not available with the current API key. Image generation requires a Gemini API key with Imagen access enabled."
        });
      }
      throw imgError;
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return res.status(500).json({ error: 'Image generation failed. Please try again.' });
  }
});

router.post('/:id/find-places', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID' });
    }

    const ideaResult = await query('SELECT * FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const { search_query, user_location } = req.body;
    if (!search_query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const ai = getAI();

    const genResult = await ai.models.generateContent({
      model: MODEL,
      contents: search_query,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = genResult.text || "";
    const groundingChunks = genResult.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    for (const chunk of groundingChunks) {
      const web = (chunk as any).web;
      const maps = (chunk as any).maps;
      if (web) {
        await query('INSERT INTO grounding_sources (idea_id, source_type, uri, title) VALUES ($1, $2, $3, $4)',
          [ideaId, 'web', web.uri, web.title]);
      } else if (maps) {
        await query('INSERT INTO grounding_sources (idea_id, source_type, uri, title) VALUES ($1, $2, $3, $4)',
          [ideaId, 'maps', maps.uri, maps.title]);
      }
    }

    return res.json({ text, grounding_sources: groundingChunks });
  } catch (error) {
    console.error('Find places error:', error);
    return res.status(500).json({ error: 'Places search failed' });
  }
});

export default router;
