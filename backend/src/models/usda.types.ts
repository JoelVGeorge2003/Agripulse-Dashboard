export interface NassRow {
  commodity_desc?: string;
  statisticcat_desc?: string;
  agg_level_desc?: string;
  state_alpha?: string;
  state_name?: string;
  state_ansi?: string;
  county_name?: string;
  county_ansi?: string;
  year?: number;
  begin_code?: string;
  reference_period_desc?: string;
  unit_desc?: string;
  Value?: string;
  short_desc?: string;
  domain_desc?: string;
  CV_PERCENT?: string;
}

export interface NassResponse {
  data?: NassRow[];
  error?: string[] | string;
}
