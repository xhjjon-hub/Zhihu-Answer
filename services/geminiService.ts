import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const SEARCH_MODEL = 'gemini-3-pro-preview'; // Supports search grounding best
const DRAFT_MODEL = 'gemini-3-flash-preview'; // Fast and good for text generation

export const searchZhihuQuestions = async (expertise: string[], interests: string[]): Promise<{ title: string; url?: string; reasoning: string }[]> => {
  const expertiseStr = expertise.join(', ');
  const interestsStr = interests.join(', ');

  try {
    const prompt = `
      You are a Zhihu content strategy assistant. 
      The user is an expert in these fields: [${expertiseStr}].
      The user is interested in these topics: [${interestsStr}].
      
      Your goal: Find 5 high-quality, trending, or relevant questions on Zhihu (zhihu.com).
      
      Selection Criteria:
      1. Prioritize questions where the user's EXPERTISE allows for an authoritative answer.
      2. Include questions related to INTERESTS where the user can share a unique perspective.
      3. Avoid generic, low-quality, or spam questions.
      
      Return the result as a JSON array where each object has:
      - title: The question title.
      - url: The link to the question (if found via search).
      - reasoning: A brief explanation (1 sentence) of why this matches the user's profile.
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
    const mainTopic = expertise[0] || interests[0] || "行业";
    return [
      { 
        title: `[模拟] 关于${mainTopic}，目前行业内最大的误解是什么？`, 
        reasoning: "这是一个经典的'认知反差'类问题，适合发挥专业知识。",
        url: "https://www.zhihu.com"
      },
      { 
        title: `[模拟] 新手入门${mainTopic}有哪些“坑”是必须避开的？`, 
        reasoning: "实用向问题，长尾流量高，适合专业人士解答。",
        url: "https://www.zhihu.com"
      },
       { 
        title: `[模拟] 如何看待${mainTopic}最近的热点事件？`, 
        reasoning: "结合时事热点与兴趣，容易引发讨论。",
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
