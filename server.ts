import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

// Lazy-initialized Gemini client to prevent crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const PORT = 3000;

  // Middleware for parsing JSON with a larger limit for images
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Check key availability
  app.get("/api/check-key", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    res.json({
      hasKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
    });
  });

  // End Point 1: Beauty Analysis (TPO, Personal Color, Shape)
  app.post("/api/beauty-analysis", async (req, res) => {
    const { user_name, user_personal_color, user_face_shape, user_selected_tpo, user_product_name } = req.body;

    // Validate inputs or set defaults
    const name = user_name || "사용자";
    const personalColor = user_personal_color || "봄 웜 라이트";
    const faceShape = user_face_shape || "둥근 얼굴형, 짧은 턱";
    const tpo = user_selected_tpo || "일상 데이트";
    const product = user_product_name || "입생로랑 틴트 12호";

    try {
      const ai = getGeminiClient();
      
      const systemInstruction = `너는 종합 뷰티 테크 앱의 핵심 AI 엔진이야. 사용자의 얼굴 분석 데이터(톤, 윤곽), 선택한 상황(TPO), 그리고 소지하고 있는 화장품 정보를 바탕으로 [맞춤형 TPO 룩북], [페이스 맵핑 가이드], [화장품 궁합 진단] 결과를 단 하나의 정교한 JSON 데이터로 생성해야 해.
반드시 지정된 JSON 포맷으로만 응답하고, 마크다운 백틱을 포함한 다른 부가 설명 텍스트는 절대 출력하지 마.`;

      const prompt = `사용자 이름: ${name}
퍼스널 컬러: ${personalColor}
얼굴형/윤곽 특징: ${faceShape}
선택한 상황(TPO): ${tpo}
소지한 화장품: ${product}

[Instructions]
사용자의 톤과 윤곽을 고려하여 선택한 TPO에 맞는 최적의 메이크업 컨셉을 도출해줘.
메이크업 하우투는 피부, 아이, 립으로 나누어 친절한 에디터 톤으로 작성해줘.
페이스 맵핑(셰이딩/하이라이터/블러셔)은 프론트엔드에서 가이드라인이나 텍스트를 띄울 수 있도록 영역과 방법을 명확히 구분해줘.
소지한 화장품이 사용자의 톤과 맞는지 진단하고, 혹시 맞지 않더라도 활용할 수 있는 팁을 포함해줘.

[Output Format]
{
  "tpo_makeup_look": {
    "concept_name": "상황과 톤에 맞는 룩의 이름",
    "steps": {
      "skin_base": "피부 표현 방법 설명",
      "eye_makeup": "아이섀도우 컬러감 및 라인 가이드 설명",
      "lip_makeup": "추천 립 컬러감 및 연출법 설명"
    },
    "one_point_tip": "사용자의 얼굴형을 보완하면서 TPO를 살리는 한 줄 핵심 팁"
  },
  "face_mapping_guide": {
    "shading": {
      "target_areas": ["음영을 넣을 얼굴 부위 1", "부위 2"],
      "intensity": "Strong / Medium / Light 중 선택",
      "how_to": "거울을 보며 따라 할 수 있는 구체적인 셰이딩 테크닉"
    },
    "highlight": {
      "target_areas": ["밝혀줄 얼굴 부위 1", "부위 2"],
      "intensity": "Strong / Medium / Light 중 선택",
      "how_to": "입체감을 주기 위한 하이라이터 브러시 가이드"
    },
    "blusher": {
      "target_areas": ["블러셔 위치"],
      "direction": "바르는 방향",
      "how_to": "얼굴형 단점을 보완하는 블러셔 연출법"
    }
  },
  "pouch_diagnostic": {
    "product_name": "입력받은 화장품명",
    "match_score": 85,
    "compatibility_analysis": "이 제품이 사용자의 퍼스널 컬러/얼굴형과 왜 잘 맞는지 혹은 아쉬운지 분석",
    "utilization_tip": "이 제품을 200% 활용하거나, 톤이 맞지 않을 때 심폐소생하여 바르는 테크닉 제안"
  }
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);

    } catch (err: any) {
      console.error("Gemini Beauty analysis failed:", err);
      
      // Gracious fallback simulation if key is missing or call errors
      const fallback = {
        tpo_makeup_look: {
          concept_name: `${personalColor}과 ${tpo}를 위한 투명 광채 룩`,
          steps: {
            skin_base: `${personalColor}의 투명함을 극대화하기 위해 얇고 속이 촉촉한 글로우 파운데이션으로 윤기를 주어 건강하고 생기있게 밀착 표현합니다.`,
            eye_makeup: "과하지 않은 차분한 코랄 브라운 음영에 쉬머한 살구 골드 섀도우를 연지 곤지 두르듯 채워 가벼운 일체감을 더해줍니다.",
            lip_makeup: "촉촉한 코랄 틴트를 립 라인 전체에 가볍게 번진 형태로 그라데이션해서 맑고 촉촉한 도톰함을 발현합니다."
          },
          one_point_tip: `${faceShape}을 보완하기 위해 가로폭 선을 보정하고 가벼운 음영감을 얹어 생기 가득한 스타일을 구현해 보세요.`
        },
        face_mapping_guide: {
          shading: {
            target_areas: ["턱 끝 양 옆 단차지", "헤어라인 윗부분"],
            intensity: "Medium",
            how_to: "턱선을 쓸어 올려 이목구비를 안쪽으로 모으고 부드럽게 윤곽을 다져 갸름하고 산뜻하게 다듬습니다."
          },
          highlight: {
            target_areas: ["이마 중앙 동선느", "콧잔등 끝자락"],
            intensity: "Light",
            how_to: "작은 붓으로 콧대 앞쪽과 인중 윗선에 빛깔을 톡톡 얹어 오뚝한 입체감을 밝혀 줍니다."
          },
          blusher: {
            target_areas: ["앞광대 볼 중앙 위쪽"],
            direction: "사선 바깥쪽으로 사르르 감감하게",
            how_to: "동그란 뺨 뒤쪽으로 동그라미를 그리듯 터치해서 시선을 위쪽으로 고정시켜 줍니다."
          }
        },
        pouch_diagnostic: {
          product_name: product,
          match_score: 92,
          compatibility_analysis: `해당 제품은 ${personalColor} 특유의 뽀얗고 생생한 본연의 생기빛과 최상의 밀착 시너지를 이뤄내 자연스러운 홍조를 깔아줍니다.`,
          utilization_tip: "만약 살짝 컬러톤이 강하게 느껴지신다면 투명 베이스 크림을 한 방울 섞어 크림 타입 형태로 개어 볼가에 그라데이션해 주면 한결 부드러운 안창 효과를 볼 수 있어요!"
        }
      };
      res.json(fallback);
    }
  });

  // End Point 2: Closet & Fashion Analysis (Weather, laundry, CPW)
  app.post("/api/closet-analysis", async (req, res) => {
    const { 
      user_name, 
      current_temperature, 
      clothes_name, 
      clothes_material, 
      clothes_price, 
      wear_count, 
      days_since_last_worn 
    } = req.body;

    const name = user_name || "사용자";
    const temp = current_temperature || "24도, 맑음";
    const clothes = clothes_name || "여름 캐주얼 셔츠";
    const material = clothes_material || "면 100%";
    const price = Number(clothes_price) || 50000;
    const wears = Number(wear_count) || 2;
    const daysSince = Number(days_since_last_worn) || 10;

    try {
      const ai = getGeminiClient();

      const systemInstruction = `너는 디지털 옷장 및 스마트 패션 스타일링 앱의 핵심 AI 엔진이야. 사용자가 등록한 옷 데이터(가격, 소재, 착용 횟수)와 현재 날씨(기온) 정보를 기반으로, [소재별 맞춤 세탁 가이드], [기온 및 소재 연동 코디 제안], [옷장 소비 효율(CPW) 분석 및 리스타일링 챌린지] 결과를 정교한 하나의 JSON 데이터로 생성해야 해.
반드시 지정된 JSON 포맷으로만 응답하고, 마크다운 백틱을 포함한 다른 부가 설명 텍스트는 절대 출력하지 마.`;

      const prompt = `사용자 이름: ${name}
오늘 날씨/기온: ${temp}
분석 대상 옷 이름: ${clothes}
옷 소재 정보: ${material}
옷 구매 가격: ${price}
총 착용 횟수: ${wears}
마지막 착용일로부터 지난 기간: ${daysSince}

[Instructions]
입력된 옷의 [소재 정보]를 분석하여 장기적으로 옷을 망가뜨리지 않고 관리할 수 있는 핵심 세탁 팁과 주의사항을 한 줄로 요약해줘.
현재 [오늘 날씨/기온]을 고려했을 때, 이 옷의 소재가 오늘 날씨에 적합한지 판단하고, 내 옷장 속의 다른 아이템(소재 언급 필수)과 매칭할 수 있는 꿀조합 코디를 제안해줘.
옷의 [구매 가격]을 [총 착용 횟수]로 나눈 CPW(Cost Per Wear, 착용당 비용)를 계산해줘. (예: 50,000원짜리 옷을 2번 입었다면 CPW는 25000)
만약 [마지막 착용일로부터 지난 기간]이 30일 이상이라면, 유저가 이 옷을 다시 활용할 수 있도록 동기부여를 주는 '안 입는 옷 구출 챌린지' 문구를 다정하고 센스 있는 톤으로 작성해줘. 30일 미만이라면 격려의 멘트를 줘.

[Output Format]
{
  "laundry_and_care": {
    "material_detected": "입력받은 소재명",
    "washing_tip": "소재 맞춤형 세탁 방법 가이드 (예: 드라이클리닝 권장, 뒤집어서 망에 넣어 세탁 등)",
    "care_caution": "습기나 열 등 이 소재가 특히 주의해야 할 관리 가이드"
  },
  "weather_material_coordination": {
    "weather_suitability": "오늘 기온에 이 소재가 어울리는지 여부와 이유 설명",
    "recommended_styling": "이 옷을 주인공으로 한 오늘 날씨 맞춤형 코디 스타일링 제안",
    "text_match_tip": "함께 매치하면 햅틱 감각이나 비주얼적으로 시너지가 나는 다른 소재 추천"
  },
  "closet_efficiency_stats": {
    "cost_per_wear": 0,
    "efficiency_grade": "가성비 등급 (예: 뽕 뽑는 중 / 분발 필요 / 옷장 보관료 내는 중 등)",
    "rescue_challenge": {
      "is_dormant": true,
      "challenge_message": "최근 한 달간 잠들어 있던 이 옷을 내일 당장 멋지게 입고 나갈 수 있도록 제안하는 리스타일링 응원 문구"
    }
  }
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);

    } catch (err: any) {
      console.error("Gemini Closet analysis failed:", err);

      // Math for CPW
      const cpw = wears > 0 ? Math.round(price / wears) : price;
      const dormant = daysSince >= 30;
      const effGrade = wears >= 10 ? "뽕 뽑는 중!" : wears >= 4 ? "소비 본전 향해 순항 중" : "옷장 보관료 내는 중";

      const fallback = {
        laundry_and_care: {
          material_detected: material,
          washing_tip: "온도 변화 및 물리적 수축 예방을 위해 뒤집어서 30도 이하 미온수에 중성세제 울코스로 단독 세탁해 주세요.",
          care_caution: "통풍이 잘되는 서늘한 그늘에서 눕혀 건조해야 옷의 형태가 틀어지지 않고 변색을 방지할 수 있습니다."
        },
        weather_material_coordination: {
          weather_suitability: `오늘 기온인 ${temp}에는 적당한 두께감과 가벼운 통기성을 갖춘 ${material} 소재가 체온 유지를 도우며 가뿐하게 즐기기 가장 좋습니다!`,
          recommended_styling: `${clothes}를 가볍게 깃을 세워 아우터 셔츠 형태로 덧입고, 속에는 깔끔한 단색 크루넥 티셔츠를 조합해 화사하고 가뿐한 어반 캐주얼 미학을 펼쳐보세요.`,
          text_match_tip: "빳빳하면서 탄탄한 결이 매력적인 데님이나 사각거리는 특유의 입체감이 있는 린넨 슬랙스와 매칭 시 촉감 시너지를 낼 수 있습니다."
        },
        closet_efficiency_stats: {
          cost_per_wear: cpw,
          efficiency_grade: effGrade,
          rescue_challenge: {
            is_dormant: dormant,
            challenge_message: dormant 
              ? `어머나 ${name}님! 무려 ${daysSince}일 동안 옷장에서 단잠을 자고 있던 이 귀염둥이 ${clothes}를 내일 가볍게 깨워 데이트 룩으로 꺼내 주는 거 어떨까요? 옷이 우리 손길을 수줍게 기다리고 있어요!`
              : `자주 꺼내 입어 주신 덕분에 가성비가 쑥쑥 올라가고 있답니다! 내일도 기분 좋게 요 녀석으로 생기 발랄 보드라운 매력을 내뿜어 보자고요~`
          }
        }
      };
      res.json(fallback);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not in a serverless environment (Vercel)
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;

