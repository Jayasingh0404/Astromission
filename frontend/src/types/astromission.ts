export interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'guest';
  is_guest: boolean;
  is_active: boolean;
  display_name: string;
  avatar_id: string;
  bio: string;
  preferred_language: 'en' | 'hi';
  xp_points: number;
  learning_points: number;
  level: number;
  mission_streak: number;
  missions_attempted: number;
  missions_completed: number;
  skill_progress: Record<string, number>;
}

export interface ResourceMetric {
  current: number;
  capacity: number;
  unit: string;
  critical: number;
  production_rate?: number;
  consumption_rate?: number;
  status?: 'optimal' | 'warning' | 'critical' | 'depleted';
}

export interface MissionResources {
  oxygen: ResourceMetric;
  water: ResourceMetric;
  food: ResourceMetric;
  energy: ResourceMetric;
  radiation_shielding: number;
  cumulative_radiation_msv: number;
  crew_health: number;
  infrastructure_condition: number;
  science_points: number;
  rationing_mode?: 'normal' | 'rationed';
}

export interface MissionEnvironment {
  planet: 'moon' | 'mars';
  solar_irradiance_factor: number;
  effective_solar_multiplier: number;
  weather_condition: string;
  is_lunar_night: boolean;
  is_dust_storm: boolean;
  ambient_radiation_msv_day: number;
  surface_temp_c: number;
  dust_abrasion_rate: number;
}

export interface MissionObjective {
  id: string;
  title: string;
  type: string;
  target: number;
  resource?: string;
  progress: number;
  completed: boolean;
  failed: boolean;
}

export interface MissionScenario {
  id: string;
  name: string;
  planet: 'moon' | 'mars';
  tagline: string;
  description: string;
  difficulty_default: 'beginner' | 'intermediate' | 'expert';
  default_duration_days: number;
  default_crew_size: number;
  environmental_constraints: Record<string, any>;
  major_hazards: string[];
  objectives: Array<{ id: string; title: string; type: string; target: number; resource?: string }>;
  starting_resources: MissionResources;
  starting_facilities: Array<{ facility_id: string; level: number; grid_x: number; grid_z: number }>;
}

export interface FacilityCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  educational_explanation: string;
  construction_cost: { energy: number; water: number };
  energy_consumption: number;
  production_rates: Record<string, number>;
  storage_Modifiers: Record<string, number>;
  maintenance_cost_per_day: number;
  max_level: number;
  planet_compatibility: string[];
  functional_effects: Record<string, any>;
}

export interface SessionFacility {
  id: string;
  session_id: string;
  facility_id: string;
  name: string;
  category: string;
  description: string;
  educational_explanation: string;
  level: number;
  max_level: number;
  condition: number;
  is_operational: boolean;
  power_priority: number;
  energy_consumption: number;
  production_rates: Record<string, number>;
  construction_cost: { energy: number; water: number };
  grid_x: number;
  grid_z: number;
  built_on_day: number;
}

export interface EventDecisionOption {
  id: string;
  label: string;
  tradeoff: string;
  effects: Record<string, number>;
}

export interface MissionEventChoice {
  id: string;
  session_id: string;
  event_id: string;
  mission_day: number;
  status: 'pending' | 'resolved';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_systems: string[];
  decision_options: EventDecisionOption[];
  scientific_explanation: string;
  selected_option_id?: string | null;
  consequences_applied?: Record<string, any>;
  resolved_at?: string | null;
}

export interface MissionResultSummary {
  outcome: string;
  days_survived: number;
  target_days: number;
  total_score: number;
  score_breakdown: Record<string, { score: number; weight: string; explanation: string }>;
  crew_condition: number;
  major_decisions: string[];
  best_decisions: string[];
  major_mistakes: string[];
  educational_insights: string[];
  recommended_improvements: string[];
}

export interface MissionSession {
  id: string;
  user_id: string;
  mission_id: string;
  mission_name: string;
  planet: 'moon' | 'mars';
  difficulty: 'beginner' | 'intermediate' | 'expert';
  status: 'not_started' | 'active' | 'paused' | 'completed' | 'failed';
  current_day: number;
  target_duration_days: number;
  crew_size: number;
  random_seed: number;
  supply_preset: string;
  resources: MissionResources;
  environment: MissionEnvironment;
  objectives: MissionObjective[];
  facilities: SessionFacility[];
  events: MissionEventChoice[];
  recent_actions: Array<{
    id: string;
    mission_day: number;
    action_type: string;
    target_id?: string;
    payload: Record<string, any>;
    outcome: Record<string, any>;
    created_at?: string;
  }>;
  result?: MissionResultSummary | null;
}

export interface MentorResponse {
  commander_name: string;
  question: string;
  situation: string;
  explanation: string;
  possible_decisions: string[];
  trade_offs: string;
  learning_fact: string;
  spoken_summary: string;
  nasa_reference: {
    id: string;
    topic: string;
    source_name: string;
    source_url: string;
  };
  provider_used: string;
}

export interface LearningModule {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  summary: string;
  simple_explanation: string;
  visual_illustration_type: string;
  real_world_application: string;
  related_game_mechanic: string;
  key_takeaways: string[];
  translations: Record<string, { title: string; summary: string; simple_explanation: string }>;
  quiz_id?: string | null;
  reference?: {
    id: string;
    topic: string;
    source_name: string;
    source_url: string;
    relevant_explanation: string;
  } | null;
  quiz?: {
    id: string;
    title: string;
    difficulty: string;
    points_reward: number;
    questions: Array<{
      id: string;
      prompt: string;
      options: string[];
      correct_index: number;
      explanation: string;
    }>;
  } | null;
}

export interface ScientificReference {
  id: string;
  topic: string;
  source_name: string;
  source_url: string;
  relevant_explanation: string;
  last_verified_date: string;
  game_usage: string;
}

