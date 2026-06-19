// =====================================================================
// Fixtures dos testes — uma jornada publicada completa + usuário admin.
// É a "base de dados" servida pelo servidor mock no lugar do Supabase.
// IDs fixos => tudo determinístico. (ESM puro, sem TS, p/ rodar no Node.)
// =====================================================================

export const IDS = {
  company: "00000000-0000-0000-0000-0000000000c1",
  user: "00000000-0000-0000-0000-0000000000a1",
  journey: "00000000-0000-0000-0000-0000000000j1",
  q1: "00000000-0000-0000-0000-0000000000s1",
  collect1: "00000000-0000-0000-0000-0000000000s2",
  result1: "00000000-0000-0000-0000-0000000000s3",
  opt1: "00000000-0000-0000-0000-0000000000o1",
  opt2: "00000000-0000-0000-0000-0000000000o2",
  f1: "00000000-0000-0000-0000-0000000000f1",
  f2: "00000000-0000-0000-0000-0000000000f2",
  p1: "00000000-0000-0000-0000-0000000000p1",
  p2: "00000000-0000-0000-0000-0000000000p2",
};

export const MOCK_USER = {
  id: IDS.user,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@teste.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const MOCK_SESSION = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "mock-refresh-token",
  user: MOCK_USER,
};

const styleDefaults = {
  pos_x: 80,
  pos_y: 80,
  buttons_layout: "stack",
  button_template: "solid",
  button_color: "#1a1d21",
  button_opacity: 100,
  button_font_color: "#ffffff",
  button_font: "inter",
  button_border_color: "",
  button_shadow: "md",
  buttons_reveal_enabled: false,
  buttons_reveal_seconds: 5,
  question_position: "bottom",
  question_font_size: "lg",
  question_font_color: "#ffffff",
  question_bg_enabled: true,
  question_bg_color: "#000000",
  button_text_size: "md",
  result_cta: null,
};

// Fábrica: cria uma base nova a cada início do servidor (estado isolado).
export function makeDB() {
  return {
    companies: [
      { id: IDS.company, name: "Empresa Teste", created_at: "2024-01-01T00:00:00Z" },
    ],
    profiles: [{ id: IDS.user, company_id: IDS.company, full_name: "Admin Teste" }],
    journeys: [
      {
        id: IDS.journey,
        company_id: IDS.company,
        name: "Jornada Demo",
        slug: "demo",
        status: "published",
        start_step_id: IDS.q1,
        widget_format: "rectangle",
        widget_border: true,
        widget_position: "right",
        widget_size: 100,
        widget_border_color: "#ffffff",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ],
    steps: [
      {
        id: IDS.q1,
        journey_id: IDS.journey,
        type: "question",
        title: "Uso",
        question_text: "Para que você vai usar?",
        video_url: null,
        position: 1,
        next_step_id: null,
        ...styleDefaults,
        pos_x: 60,
        pos_y: 80,
      },
      {
        id: IDS.collect1,
        journey_id: IDS.journey,
        type: "collect",
        title: "Seus dados",
        question_text: "Deixe seu contato",
        video_url: null,
        position: 2,
        next_step_id: IDS.result1,
        ...styleDefaults,
        pos_x: 420,
        pos_y: 80,
      },
      {
        id: IDS.result1,
        journey_id: IDS.journey,
        type: "result",
        title: "Resultado",
        question_text: "Essas são as melhores opções para você.",
        video_url: null,
        position: 3,
        next_step_id: null,
        ...styleDefaults,
        pos_x: 780,
        pos_y: 80,
        result_cta: {
          kind: "whatsapp",
          label: "Falar com consultor",
          value: "5562999999999",
        },
      },
    ],
    options: [
      {
        id: IDS.opt1,
        step_id: IDS.q1,
        label: "Em casa",
        subtitle: "Jardim e quintal",
        icon: "🏠",
        next_step_id: IDS.collect1,
        position: 1,
      },
      {
        id: IDS.opt2,
        step_id: IDS.q1,
        label: "No trabalho",
        subtitle: "Uso profissional",
        icon: "🚜",
        next_step_id: IDS.result1,
        position: 2,
      },
    ],
    step_fields: [
      {
        id: IDS.f1,
        step_id: IDS.collect1,
        kind: "full_name",
        label: "Nome completo",
        required: true,
        position: 1,
      },
      {
        id: IDS.f2,
        step_id: IDS.collect1,
        kind: "whatsapp",
        label: "WhatsApp",
        required: true,
        position: 2,
      },
    ],
    products: [
      {
        id: IDS.p1,
        journey_id: IDS.journey,
        name: "Produto A",
        photo_url: "https://img.test/a.png",
        benefits: "Leve e ágil para áreas pequenas.",
        buy_link: "https://exemplo.com/a",
        whatsapp: null,
        buttons: [
          { kind: "whatsapp", label: "Falar no WhatsApp", value: "5562999999999" },
          { kind: "custom", label: "Ver produto", value: "https://exemplo.com/a" },
        ],
      },
      {
        id: IDS.p2,
        journey_id: IDS.journey,
        name: "Produto B",
        photo_url: "https://img.test/b.png",
        benefits: "Mais potência para áreas grandes.",
        buy_link: "https://exemplo.com/b",
        whatsapp: null,
        buttons: [
          { kind: "whatsapp", label: "Falar no WhatsApp", value: "5562999999999" },
        ],
      },
    ],
    step_products: [
      { step_id: IDS.q1, product_id: IDS.p1, position: 1 },
      { step_id: IDS.q1, product_id: IDS.p2, position: 2 },
      { step_id: IDS.result1, product_id: IDS.p1, position: 1 },
      { step_id: IDS.result1, product_id: IDS.p2, position: 2 },
    ],
    leads: [],
    events: [],
  };
}
