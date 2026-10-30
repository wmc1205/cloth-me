import { generateJson, imageMessage, type ImageInput } from './generate-json'
import { styleAnalysisSchema, type StyleAnalysis } from './style-analysis-schema'
import { buildStyleAnalysisPrompt } from './prompts/style-analysis'

export function analyzeStyle(input: {
  image: ImageInput
  userProfile?: string
  trendContext?: string
}): Promise<StyleAnalysis> {
  return generateJson({
    system: buildStyleAnalysisPrompt(input),
    schema: styleAnalysisSchema,
    messages: imageMessage('이 사진을 분석해줘.', input.image),
  })
}
