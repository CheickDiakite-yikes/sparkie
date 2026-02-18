import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { query } from '../db.js';
import { getRequestId, logError, logInfo, logWarn, summarizeError, summarizeGeminiResponse } from '../logger.js';
import { createObjectStorageClient } from '../objectStorage.js';
import { checkMonthlyImageQuotaForIdea, recordUsageEvent } from '../quota.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';
const VALID_ASPECT_RATIOS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);
const VALID_IMAGE_SIZES = new Set(['1K', '2K', '4K']);
const IMAGE_COST_USD_BY_SIZE: Record<string, number> = {
  '1K': 0.134,
  '2K': 0.134,
  '4K': 0.24,
};

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

function getUsageTokens(response: any): { inputTokens: number; outputTokens: number } {
  const usage = response?.usageMetadata || {};
  const inputTokens = Number(usage?.promptTokenCount || 0);
  const outputTokens = Number(usage?.candidatesTokenCount || 0);
  return { inputTokens, outputTokens };
}

function sumUsageTokens(responses: any[]): { inputTokens: number; outputTokens: number } {
  return responses.reduce(
    (acc, response) => {
      const usage = getUsageTokens(response);
      acc.inputTokens += usage.inputTokens;
      acc.outputTokens += usage.outputTokens;
      return acc;
    },
    { inputTokens: 0, outputTokens: 0 }
  );
}

router.post('/:id/analyze', async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
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
    await recordUsageEvent({
      userId,
      ideaId,
      action: 'analysis.start',
      status: 'success',
      requestId,
      model: MODEL,
      details: {
        endpoint: '/analyze',
      },
    });

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

        const usageTotals = sumUsageTokens([marketResp, techResp, prdResp, uiuxResp, execResp, oneShotResp]);

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
        await recordUsageEvent({
          userId,
          ideaId,
          action: 'analysis.complete',
          status: 'success',
          requestId,
          model: MODEL,
          inputTokens: usageTotals.inputTokens,
          outputTokens: usageTotals.outputTokens,
          details: {
            groundedSources: groundingChunks.length,
          },
        });
        console.log(`Analysis complete for idea ${ideaId}`);
      } catch (error) {
        console.error(`Analysis failed for idea ${ideaId}:`, error);
        await query('UPDATE ideas SET status = $1, updated_at = NOW() WHERE id = $2', ['error', ideaId]);
        await recordUsageEvent({
          userId,
          ideaId,
          action: 'analysis.complete',
          status: 'failure',
          requestId,
          model: MODEL,
          details: {
            error: summarizeError(error),
          },
        });
      }
    })();
  } catch (error) {
    console.error('Analyze error:', error);
    if (req.session.userId) {
      await recordUsageEvent({
        userId: req.session.userId,
        ideaId: Number.isNaN(parseInt(req.params.id as string)) ? null : parseInt(req.params.id as string),
        action: 'analysis.start',
        status: 'failure',
        requestId,
        model: MODEL,
        details: {
          error: summarizeError(error),
        },
      });
    }
    return res.status(500).json({ error: 'Failed to start analysis' });
  }
});

router.post('/:id/ai-chat', async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
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

    const result = await chat.sendMessage(message);

    const sectionMap: Record<string, string> = {
      executiveSummary: 'executive_summary',
      marketResearch: 'market_research',
      prd: 'prd',
      uiux: 'uiux',
      oneShotPrompt: 'one_shot_prompt'
    };

    let toolCallResults: any[] = [];
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const fc of functionCalls) {
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
    const usage = getUsageTokens(result);
    await recordUsageEvent({
      userId,
      ideaId,
      action: 'chat.message',
      status: 'success',
      requestId,
      model: MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      details: {
        messageLength: String(message).length,
      },
    });

    return res.json({
      response: responseText,
      toolCalls: toolCallResults
    });
  } catch (error) {
    console.error('AI chat error:', error);
    if (req.session.userId) {
      await recordUsageEvent({
        userId: req.session.userId,
        ideaId: Number.isNaN(parseInt(req.params.id as string)) ? null : parseInt(req.params.id as string),
        action: 'chat.message',
        status: 'failure',
        requestId,
        model: MODEL,
        details: {
          error: summarizeError(error),
        },
      });
    }
    return res.status(500).json({ error: 'AI chat failed' });
  }
});

router.post('/:id/generate-image', async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
  const requestStartedAt = Date.now();

  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);
    const { prompt, aspect_ratio, image_size, style, visual_mode } = req.body || {};

    logInfo('image.generate.request', {
      requestId,
      ideaId,
      userId,
      promptProvided: typeof prompt === 'string' && prompt.trim().length > 0,
      promptLength: typeof prompt === 'string' ? prompt.length : 0,
      aspectRatio: aspect_ratio || null,
      imageSize: image_size || null,
      style: style || visual_mode || null,
    });

    if (isNaN(ideaId)) {
      return res.status(400).json({ error: 'Invalid idea ID', request_id: requestId });
    }

    const ideaResult = await query('SELECT * FROM ideas WHERE id = $1 AND user_id = $2', [ideaId, userId]);
    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found', request_id: requestId });
    }

    const idea = ideaResult.rows[0] as any;
    const ai = getAI();
    const imageQuota = await checkMonthlyImageQuotaForIdea(userId, ideaId);

    const requestedStyle = String(style || visual_mode || 'artistic');
    const normalizedStyle = requestedStyle === 'ui-flow' ? 'ui-flow' : 'artistic';

    const safeAspectRatio = VALID_ASPECT_RATIOS.has(aspect_ratio)
      ? aspect_ratio
      : (normalizedStyle === 'ui-flow' ? '16:9' : '1:1');
    const normalizedSize = typeof image_size === 'string' ? image_size.toUpperCase() : '';
    const safeImageSize = VALID_IMAGE_SIZES.has(normalizedSize)
      ? normalizedSize
      : (normalizedStyle === 'ui-flow' ? '2K' : '1K');
    const estimatedImageCostUsd = IMAGE_COST_USD_BY_SIZE[safeImageSize] || IMAGE_COST_USD_BY_SIZE['1K'];

    if (!imageQuota.allowed) {
      await recordUsageEvent({
        userId,
        ideaId,
        action: 'image.generate',
        status: 'blocked',
        requestId,
        model: IMAGE_MODEL,
        imageCount: 1,
        estimatedCostUsd: estimatedImageCostUsd,
        quotaBypass: imageQuota.isBypass,
        details: {
          reason: 'monthly_image_limit_per_idea_reached',
          used: imageQuota.used,
          limit: imageQuota.limit,
          remaining: imageQuota.remaining,
          scope: imageQuota.scope,
          email: imageQuota.email,
          imageSize: safeImageSize,
          style: normalizedStyle,
        },
      });

      return res.status(429).json({
        error: `Monthly image limit reached for this idea (${imageQuota.limit}).`,
        request_id: requestId,
        quota: {
          used: imageQuota.used,
          limit: imageQuota.limit,
          remaining: imageQuota.remaining,
          scope: imageQuota.scope,
        },
      });
    }

    let basePrompt = typeof prompt === 'string' ? prompt.trim() : '';
    let promptSource: 'request' | 'idea-context' = 'request';
    if (!basePrompt) {
      const analysisResult = await query('SELECT prd, uiux FROM analysis WHERE idea_id = $1', [ideaId]);
      const analysis = (analysisResult.rows[0] || {}) as { prd?: string; uiux?: string };
      const contextParts = [
        idea.title ? `App concept title: ${idea.title}` : '',
        idea.initial_prompt ? `Original idea summary: ${idea.initial_prompt}` : '',
        analysis.prd ? `PRD notes:\n${analysis.prd}` : '',
        analysis.uiux ? `Design notes:\n${analysis.uiux}` : '',
      ].filter(Boolean);
      basePrompt = contextParts.join('\n\n').slice(0, 8000);
      promptSource = 'idea-context';
    }

    if (!basePrompt) {
      logWarn('image.generate.prompt.empty', {
        requestId,
        ideaId,
        userId,
      });
      return res.status(400).json({ error: 'Unable to build an image prompt. Add idea notes first.', request_id: requestId });
    }

    let finalPrompt = `
Create a high-fidelity concept visual for this product idea.

${basePrompt}

Requirements:
- Professional, polished composition suitable for a product pitch deck.
- Highlight the primary user value and key interaction.
- Keep the composition clean, modern, and visually coherent.
- No watermark overlays.
`.trim();

    if (normalizedStyle === 'ui-flow') {
      finalPrompt = `
Create a high-fidelity mobile app UI flow concept based on this product idea.

${basePrompt}

Requirements:
- Show 4-6 mobile app screens in a cohesive horizontal flow.
- Keep typography, spacing, and component styles consistent.
- Include realistic UI labels and actionable states.
- Portfolio-grade product design quality.
`.trim();
    }

    const modelStartedAt = Date.now();
    try {
      logInfo('image.generate.model.request', {
        requestId,
        ideaId,
        model: IMAGE_MODEL,
        style: normalizedStyle,
        aspectRatio: safeAspectRatio,
        imageSize: safeImageSize,
        promptSource,
        promptLength: finalPrompt.length,
      });
      await recordUsageEvent({
        userId,
        ideaId,
        action: 'image.generate',
        status: 'allowed',
        requestId,
        model: IMAGE_MODEL,
        imageCount: 1,
        estimatedCostUsd: estimatedImageCostUsd,
        quotaBypass: imageQuota.isBypass,
        details: {
          used: imageQuota.used,
          limit: imageQuota.limit,
          remaining: imageQuota.remaining,
          scope: imageQuota.scope,
          imageSize: safeImageSize,
          style: normalizedStyle,
        },
      });

      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: finalPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: safeAspectRatio,
            imageSize: safeImageSize,
          },
        },
      });

      let imageData: string | null = null;
      let textResponse: string | null = null;
      const parts = response.candidates?.[0]?.content?.parts || (response as any).parts || [];

      logInfo('image.generate.model.response', {
        requestId,
        ideaId,
        model: IMAGE_MODEL,
        durationMs: Date.now() - modelStartedAt,
        diagnostics: summarizeGeminiResponse(response),
      });

      let imageMimeType = 'image/png';
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
        if (part.text) {
          textResponse = part.text;
        }
      }

      if (!imageData) {
        const blockReason = (response as any)?.promptFeedback?.blockReason;
        logWarn('image.generate.no_image_returned', {
          requestId,
          ideaId,
          model: IMAGE_MODEL,
          blockReason: blockReason || null,
          textResponseLength: textResponse?.length || 0,
        });
        return res.status(400).json({
          error: `Image generation returned no image${blockReason ? ` (${blockReason})` : ''}. Try rephrasing your concept description.`,
          request_id: requestId,
        });
      }

      const ext = imageMimeType.includes('jpeg') || imageMimeType.includes('jpg') ? 'jpg' : 'png';
      const client = createObjectStorageClient();
      const storageKey = `images/idea-${ideaId}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(imageData, 'base64');

      const uploadResult = await client.uploadFromBytes(storageKey, buffer);
      if (!uploadResult.ok) {
        logError('image.generate.storage_upload_failed', {
          requestId,
          ideaId,
          userId,
          storageKey,
          bytes: buffer.length,
          error: uploadResult.error,
        });
        return res.status(502).json({
          error: 'Image upload failed after generation. Please try again.',
          request_id: requestId,
        });
      }

      await query(
        'INSERT INTO images (idea_id, storage_key, prompt, aspect_ratio, style) VALUES ($1, $2, $3, $4, $5)',
        [ideaId, storageKey, basePrompt, safeAspectRatio, normalizedStyle]
      );

      logInfo('image.generate.success', {
        requestId,
        ideaId,
        userId,
        style: normalizedStyle,
        aspectRatio: safeAspectRatio,
        imageSize: safeImageSize,
        storageKey,
        durationMs: Date.now() - requestStartedAt,
      });
      await recordUsageEvent({
        userId,
        ideaId,
        action: 'image.generate',
        status: 'success',
        requestId,
        model: IMAGE_MODEL,
        imageCount: 1,
        estimatedCostUsd: estimatedImageCostUsd,
        quotaBypass: imageQuota.isBypass,
        details: {
          storageKey,
          imageSize: safeImageSize,
          style: normalizedStyle,
          usedAfterGenerate: imageQuota.used + 1,
          limit: imageQuota.limit,
          scope: imageQuota.scope,
        },
      });

      return res.json({
        storage_key: storageKey,
        url: `/api/images/${encodeURIComponent(storageKey)}`,
        request_id: requestId,
      });
    } catch (imgError: any) {
      logError('image.generate.failure', {
        requestId,
        ideaId,
        userId,
        style: normalizedStyle,
        aspectRatio: safeAspectRatio,
        imageSize: safeImageSize,
        durationMs: Date.now() - requestStartedAt,
        error: summarizeError(imgError),
      });
      await recordUsageEvent({
        userId,
        ideaId,
        action: 'image.generate',
        status: 'failure',
        requestId,
        model: IMAGE_MODEL,
        imageCount: 1,
        estimatedCostUsd: estimatedImageCostUsd,
        quotaBypass: imageQuota.isBypass,
        details: {
          imageSize: safeImageSize,
          style: normalizedStyle,
          error: summarizeError(imgError),
        },
      });
      return res.status(500).json({
        error: "Image generation failed. Please try again with a different prompt.",
        request_id: requestId,
      });
    }
  } catch (error) {
    logError('image.generate.unexpected_failure', {
      requestId,
      durationMs: Date.now() - requestStartedAt,
      error: summarizeError(error),
    });
    return res.status(500).json({ error: 'Image generation failed. Please try again.', request_id: requestId });
  }
});

router.delete('/:id/images/:imageId', async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
  const requestStartedAt = Date.now();

  try {
    const userId = req.session.userId!;
    const ideaId = parseInt(req.params.id as string);
    const imageId = parseInt(req.params.imageId as string);

    logInfo('image.delete.request', {
      requestId,
      userId,
      ideaId,
      imageId,
    });

    if (isNaN(ideaId) || isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid idea or image ID', request_id: requestId });
    }

    const imageResult = await query(
      `SELECT i.id, i.idea_id, i.storage_key
       FROM images i
       JOIN ideas d ON d.id = i.idea_id
       WHERE i.id = $1 AND i.idea_id = $2 AND d.user_id = $3
       LIMIT 1`,
      [imageId, ideaId, userId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found', request_id: requestId });
    }

    const image = imageResult.rows[0] as { id: number; idea_id: number; storage_key: string };
    const client = createObjectStorageClient();

    let storageDeleted = false;
    const storageDeleteResult = await client.delete(image.storage_key, { ignoreNotFound: true });
    if (!storageDeleteResult.ok) {
      logWarn('image.delete.storage_failed', {
        requestId,
        userId,
        ideaId,
        imageId,
        storageKey: image.storage_key,
        error: storageDeleteResult.error,
      });
    } else {
      storageDeleted = true;
    }

    await query('DELETE FROM images WHERE id = $1 AND idea_id = $2', [imageId, ideaId]);

    logInfo('image.delete.success', {
      requestId,
      userId,
      ideaId,
      imageId,
      storageKey: image.storage_key,
      storageDeleted,
      durationMs: Date.now() - requestStartedAt,
    });

    return res.json({
      deleted: true,
      image_id: imageId,
      storage_deleted: storageDeleted,
      request_id: requestId,
    });
  } catch (error) {
    logError('image.delete.failure', {
      requestId,
      durationMs: Date.now() - requestStartedAt,
      error: summarizeError(error),
    });
    return res.status(500).json({ error: 'Image delete failed', request_id: requestId });
  }
});

router.post('/:id/find-places', async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
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
    const usage = getUsageTokens(genResult);

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

    await recordUsageEvent({
      userId,
      ideaId,
      action: 'places.search',
      status: 'success',
      requestId,
      model: MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      details: {
        groundedSources: groundingChunks.length,
      },
    });

    return res.json({ text, grounding_sources: groundingChunks });
  } catch (error) {
    console.error('Find places error:', error);
    if (req.session.userId) {
      await recordUsageEvent({
        userId: req.session.userId,
        ideaId: Number.isNaN(parseInt(req.params.id as string)) ? null : parseInt(req.params.id as string),
        action: 'places.search',
        status: 'failure',
        requestId,
        model: MODEL,
        details: {
          error: summarizeError(error),
        },
      });
    }
    return res.status(500).json({ error: 'Places search failed' });
  }
});

export default router;
