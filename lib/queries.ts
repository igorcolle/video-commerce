// =====================================================================
// Listas de colunas dos SELECTs do Supabase, centralizadas para não
// repetir (e divergir) entre loadJourney, a página do editor e os actions.
// São um superconjunto seguro: colunas a mais são apenas ignoradas.
// =====================================================================

export const STEP_COLUMNS =
  "id, journey_id, type, title, question_text, video_url, position, next_step_id, pos_x, pos_y, buttons_layout, button_template, button_color, button_opacity, button_font_color, button_font, button_border_color, button_shadow, buttons_reveal_enabled, buttons_reveal_seconds, question_position, question_font_size, question_font_color, question_bg_enabled, question_bg_color, button_text_size, result_cta";

export const OPTION_COLUMNS =
  "id, step_id, label, subtitle, icon, next_step_id, position";

export const FIELD_COLUMNS = "id, step_id, kind, label, required, position";

export const PRODUCT_COLUMNS =
  "id, company_id, journey_id, category_id, name, photo_url, benefits, buy_link, whatsapp, tag, tag_color, summary, description, status, specs_enabled, specs_summary, buttons, position, highlights_reveal_seconds";

export const PRODUCT_CATEGORY_COLUMNS = "id, company_id, name, position";

export const PRODUCT_SPEC_COLUMNS =
  "id, product_id, attribute, value, position";

export const PRODUCT_VIDEO_COLUMNS =
  "id, product_id, title, video_url, thumb_url, is_main, is_highlight, position";

export const STEP_PRODUCT_COLUMNS = "step_id, product_id, position";
