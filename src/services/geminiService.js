import { GoogleGenerativeAI }
from "@google/generative-ai";

const genAI =
    new GoogleGenerativeAI(
        import.meta.env.VITE_GEMINI_API_KEY
    );

const model =
    genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

export async function observeSnapshot(
    snapshot
) {

    const prompt = `
You are an Observation Agent.

Observe only the current disaster state.

Do NOT:
- Predict future events
- Recommend actions
- Use historical information

Describe only what is currently observable.

Snapshot:

${JSON.stringify(snapshot, null, 2)}
`;

    const result =
        await model.generateContent(
            prompt
        );

    return result.response.text();
}