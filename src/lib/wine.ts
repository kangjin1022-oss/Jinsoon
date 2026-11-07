import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const WineSchema = z.object({
  is_wine: z.boolean().describe("사진에 와인 라벨/병이 있으면 true"),
  name: z.string().describe("와인 이름 (라벨 원문 표기)"),
  name_ko: z.string().describe("와인 이름 한글 표기"),
  producer: z.string(),
  vintage: z.string().describe("빈티지 연도, 없으면 'NV' 또는 빈 문자열"),
  type: z.enum(["레드", "화이트", "로제", "스파클링", "디저트", "주정강화", "기타"]),
  country: z.string(),
  region: z.string(),
  appellation: z.string(),
  grapes: z.array(z.string()),
  alcohol: z.string().describe("예: 13.5%, 모르면 빈 문자열"),
  tasting_notes: z.string().describe("향과 맛 특징 2~3문장"),
  body: z.number().int().describe("바디감 1(가벼움)~5(무거움)"),
  sweetness: z.number().int().describe("당도 1(드라이)~5(스위트)"),
  acidity: z.number().int().describe("산도 1~5"),
  tannin: z.number().int().describe("탄닌 1~5, 화이트는 1"),
  food_pairing: z.array(z.string()),
  serving_temp: z.string().describe("예: 16~18°C"),
  drinking_window: z.string().describe("음용 적기, 예: 지금~2030"),
  price_range_krw: z.string().describe("국내 대략적 소매가, 예: 3~5만원"),
  confidence: z.enum(["높음", "보통", "낮음"]),
  notes: z.string().describe("판독 불확실한 부분이나 추가 설명"),
});

export type WineInfo = z.infer<typeof WineSchema>;

const SYSTEM = `당신은 소믈리에이자 와인 라벨 판독 전문가입니다.
사용자가 보낸 와인 라벨(또는 병) 사진을 보고 와인을 식별해 정보를 한국어로 채워 주세요.
- 라벨에서 읽은 내용을 우선하고, 읽지 못한 부분은 해당 와인에 대한 일반적인 지식으로 보완하세요.
- 확실하지 않은 정보는 추측임을 notes에 밝히고 confidence를 낮추세요.
- 와인이 아닌 사진이면 is_wine을 false로 두고 나머지는 빈 값으로 채우세요.`;

export async function recognizeWine(apiKey: string, imageBase64: string): Promise<WineInfo> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(WineSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: "이 와인을 식별해 주세요." },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("요청이 거절되었습니다. 다른 사진으로 시도해 주세요.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("응답을 해석하지 못했습니다. 다시 시도해 주세요.");
  }
  return response.parsed_output;
}

export function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "API 키가 올바르지 않습니다. 설정에서 확인해 주세요.";
  if (e instanceof Anthropic.RateLimitError) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (e instanceof Anthropic.APIConnectionError) return "네트워크 연결을 확인해 주세요.";
  if (e instanceof Anthropic.APIError) return `API 오류 (${e.status ?? "?"}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

/** 사진을 최대 1568px JPEG으로 줄여 base64(헤더 제외)와 미리보기용 썸네일을 돌려준다. */
export async function prepareImage(file: File): Promise<{ base64: string; thumb: string }> {
  const bitmap = await createImageBitmap(file);
  const draw = (max: number, quality: number) => {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  };
  const full = draw(1568, 0.85);
  const thumb = draw(320, 0.7);
  bitmap.close();
  return { base64: full.split(",")[1], thumb };
}
