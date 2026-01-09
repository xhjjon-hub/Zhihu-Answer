import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const SEARCH_MODEL = 'gemini-3-pro-preview'; // Supports search grounding best
const DRAFT_MODEL = 'gemini-3-flash-preview'; // Fast and good for text generation

export const searchZhihuQuestions = async (
  expertise: string[], 
  interests: string[], 
  scope: 'personal' | 'hot' | 'random' = 'personal'
): Promise<{ title: string; url?: string; reasoning: string }[]> => {
  const expertiseStr = expertise.join(', ');
  const interestsStr = interests.join(', ');

  let scopeInstruction = "";
  if (scope === 'hot') {
    scopeInstruction = `
      Focus exclusively on currently TRENDING, VIRAL, and HOT LIST questions on Zhihu across all categories (Society, Tech, Lifestyle, Career).
      Ignore the user's specific niche unless it overlaps with trending topics.
      The goal is to find traffic-heavy questions.
    `;
  } else if (scope === 'random') {
    scopeInstruction = `
      Focus on a purely RANDOM and DIVERSE selection of interesting questions from various fields (History, Science, Daily Life, Psychology, etc.).
      Do not limit to the user's expertise. Surprise the user with variety.
    `;
  } else {
    // Personal (Default)
    scopeInstruction = `
      Focus strictly on the user's profile:
      Expertise: [${expertiseStr}]
      Interests: [${interestsStr}]
      Find questions where the user can provide expert authoritative answers or unique personal insights based on their interests.
    `;
  }

  try {
    const prompt = `
      You are a Zhihu content strategy assistant.
      
      Task: Find 12 high-quality questions on Zhihu (zhihu.com) based on the following strategy:
      ${scopeInstruction}
      
      General Criteria:
      1. Questions should be open-ended and suitable for a high-quality answer.
      2. Avoid spam or extremely low-quality questions.
      
      Return the result as a JSON array where each object has:
      - title: The question title.
      - url: The link to the question (if found via search).
      - reasoning: A brief explanation (1 sentence) of why this matches the selected strategy ('${scope}').
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ["title", "reasoning"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error searching questions:", error);
    // Fallback simulation if search fails
    const mainTopic = expertise[0] || "生活";
    return [
      { 
        title: `[模拟] 关于${mainTopic}，目前行业内最大的误解是什么？`, 
        reasoning: "这是一个经典的'认知反差'类问题，适合发挥专业知识。",
        url: "https://www.zhihu.com"
      },
      { 
        title: `[模拟] 2024年，${mainTopic}领域有哪些值得关注的趋势？`, 
        reasoning: "热点趋势类问题，流量较大。",
        url: "https://www.zhihu.com"
      },
       { 
        title: `[模拟] 如何看待最近关于${mainTopic}的热门事件？`, 
        reasoning: "结合时事热点与兴趣，容易引发讨论。",
        url: "https://www.zhihu.com"
      },
      { 
        title: `[模拟] 有哪些鲜为人知的${mainTopic}冷知识？`, 
        reasoning: "猎奇向问题，容易获得高赞。",
        url: "https://www.zhihu.com"
      },
      { 
        title: `[模拟] 作为一个${mainTopic}从业者，你有哪些忠告？`, 
        reasoning: "身份代入感强，适合现身说法。",
        url: "https://www.zhihu.com"
      }
    ];
  }
};

export const generateDraft = async (question: string, expertise: string[], interests: string[]): Promise<string> => {
  const expertiseStr = expertise.join(', ');
  try {
    const prompt = `
      Task: Write a high-quality Zhihu answer for the question: "${question}".
      User Expertise: ${expertiseStr}.
      User Interests: ${interests.join(', ')}.
      
      Style Guidelines:
      1.  **Format**: Use Markdown (Bold for emphasis, Lists for structure, Headers for sections).
      2.  **Tone**: Professional, objective, "Zhihu style" (Start with "谢邀" (Thanks for the invite) if appropriate, or a direct professional hook).
      3.  **Content**: Be well-reasoned, data-backed if possible, and provide unique insights based on the user's expertise.
      4.  **Length**: Roughly 400-800 words, enough to be substantial but readable.
      
      Output ONLY the Markdown content of the answer.
    `;

    const response = await ai.models.generateContent({
      model: DRAFT_MODEL,
      contents: prompt,
    });

    return response.text || "Draft generation failed.";
  } catch (error) {
    console.error("Error generating draft:", error);
    return "Error generating draft. Please check your API limits or try again.";
  }
};
