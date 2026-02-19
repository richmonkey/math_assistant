import { getOllama } from "./ollama";

export type QuestionGradingResult = {
    questionId: string;
    score: number;
    maxScore: number;
    comment: string;
    isCorrect: boolean;

};


export type QuestionData = {
    id: string;
    type: string;
    prompt: string;
    answer: string;
};

/**
 * 对单个题目进行 AI 批改
 */
export async function gradeQuestion(
    question: QuestionData,
    maxScore: number = 10
): Promise<QuestionGradingResult> {
    const prompt = `你是一位专业的数学教师，请对学生的答案进行批改。

题目类型：${question.type}
题目内容：${question.prompt}
学生答案：${question.answer}
满分：${maxScore}分

请根据以下标准进行评分：
1. 答案的正确性（占70%）
2. 解题步骤的完整性（占20%）
3. 书写的规范性（占10%）

请以 JSON 格式返回评分结果，格式如下：
{
  "score": <得分，0-${maxScore}之间的数字>,
  "isCorrect": <true或false，表示答案是否完全正确>,
  "comment": "<详细的批改意见，指出优点和不足>"
}

注意：
- 只返回 JSON，不要有其他内容
- comment 要具体、有建设性
- 如果学生答案为空或明显错误，给0分`;

    try {
        const ollama = getOllama();
        const response = await ollama.chat({
            model: "qwen3-vl:8b-instruct",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const content = response.message.content?.trim() ?? "";
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");

        let result;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const jsonStr = content.slice(jsonStart, jsonEnd + 1);
            result = JSON.parse(jsonStr);
        } else {
            throw new Error("Invalid response format");
        }

        return {
            questionId: question.id,
            score: Math.min(Math.max(result.score ?? 0, 0), maxScore),
            maxScore,
            comment: result.comment ?? "批改完成",
            isCorrect: result.isCorrect ?? false,

        };
    } catch (error) {
        console.error("Error grading question:", error);
        // 如果 AI 批改失败，返回默认结果
        return {
            questionId: question.id,
            score: 0,
            maxScore,
            comment: "批改过程中出现错误，请稍后重试。",
            isCorrect: false,

        };
    }
}

/**
 * 对整张试卷进行 AI 总结
 */
export async function generateOverallComment(
    questionResults: QuestionGradingResult[],
    totalScore: number,
    maxTotalScore: number
): Promise<string> {
    const scoreRate = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;

    const questionSummary = questionResults.map((result, index) =>
        `第${index + 1}题：得分${result.score}/${result.maxScore}，${result.isCorrect ? "正确" : "错误"}`
    ).join("\n");

    const prompt = `你是一位经验丰富的数学教师，请根据学生的答题情况写一份整体评语。

考试总分：${totalScore}/${maxTotalScore}（得分率：${scoreRate.toFixed(1)}%）

各题得分情况：
${questionSummary}

请写一份200字左右的整体评语，包括：
1. 对学生整体表现的评价
2. 指出掌握较好的知识点
3. 指出需要加强的薄弱环节
4. 给出具体的学习建议

要求：
- 语言亲切、鼓励为主
- 建议具体、可操作
- 只返回评语文本，不要有其他格式`;

    try {
        const ollama = getOllama();
        const response = await ollama.chat({
            model: "qwen3-vl:8b-instruct",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        return response.message.content?.trim() ?? "评语生成失败，请稍后重试。";
    } catch (error) {
        console.error("Error generating overall comment:", error);
        return "评语生成过程中出现错误，请稍后重试。";
    }
}
