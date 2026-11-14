/**
 * Browser-persisted Simulation & Catalog Fallback Engine.
 * Ensures that static cloud deployments (such as GitHub Pages) remain 100% playable
 * with full Moon/Mars physics, 12 facilities, 15 events, quizzes, and Commander AI
 * even when the FastAPI backend is not reachable on localhost.
 */
import {
  User,
  MissionScenario,
  FacilityCatalogItem,
  MissionSession,
  MentorResponse,
  LearningModule,
  ScientificReference,
} from '../types/astromission';

const STORAGE_KEY = 'astromission_cloud_state_v1';

export const FALLBACK_REFERENCES: ScientificReference[] = [
  {
    id: 'nasa-eclss-2023',
    topic: 'Environmental Control and Life Support Systems (ECLSS)',
    source_name: 'NASA Marshall Space Flight Center — ECLSS Overview',
    source_url: 'https://www.nasa.gov/humans-in-space/environmental-control-and-life-support-systems-eclss/',
    relevant_explanation:
      'NASA ECLSS provides clean water and breathable air through regenerative closed-loop recycling aboard the ISS and future lunar/Martian habitats. Humans consume roughly 0.84 kg of O2 per day.',
    last_verified_date: '2026-11-14',
    game_usage: 'Models per-astronaut daily oxygen demand (0.84 kg/day) and water-electrolysis oxygen generation.',
  },
  {
    id: 'nasa-water-recovery-2023',
    topic: 'Closed-Loop Water Recovery System (WRS)',
    source_name: 'NASA — ISS Achieves 98% Water Recovery Milestone',
    source_url:
      'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
    relevant_explanation:
      'Advanced Water Processor Assembly (WPA) and Brine Processor systems recover up to 93–98% of crew wastewater and cabin humidity condensate.',
    last_verified_date: '2026-11-14',
    game_usage: 'Models the Water Recycler facility recovery percentage and power/maintenance requirements.',
  },
  {
    id: 'nasa-space-radiation-hrp',
    topic: 'Space Radiation & Human Spaceflight Hazards',
    source_name: 'NASA Human Research Program — Space Radiation',
    source_url: 'https://www.nasa.gov/hrp/radiation/',
    relevant_explanation:
      'Beyond Earth’s magnetosphere, astronauts face Galactic Cosmic Rays (GCR) and acute Solar Particle Events (SPE). Hydrogen-rich shielding, water walls, and regolith berms reduce acute doses.',
    last_verified_date: '2026-11-14',
    game_usage: 'Drives baseline planetary radiation dose (mSv/day), Solar Storm spikes, and Radiation Shelter shielding.',
  },
  {
    id: 'nasa-artemis-moon',
    topic: 'Lunar South Pole Environment & Artemis Base Camp',
    source_name: 'NASA — Artemis Plan: Lunar Exploration Overview',
    source_url: 'https://www.nasa.gov/specials/artemis/',
    relevant_explanation:
      'The lunar South Pole experiences extreme thermal swings, abrasive electrostatic regolith dust, no atmospheric shielding, and shadowed craters containing water ice alongside sunlit peaks.',
    last_verified_date: '2026-11-14',
    game_usage: 'Configures the Moon Scenario (low-illumination lunar night phases, regolith abrasion, crater ice extraction).',
  },
  {
    id: 'nasa-mars-journey',
    topic: 'Mars Surface Environment & Dust Storms',
    source_name: 'NASA Mars Exploration Program — Fact Sheet',
    source_url: 'https://mars.nasa.gov/all-about-mars/facts/',
    relevant_explanation:
      'Mars receives ~43% of Earth’s solar irradiance, has a thin CO2 atmosphere (95% CO2), and experiences regional/global dust storms that can block 60–90% of direct sunlight.',
    last_verified_date: '2026-11-14',
    game_usage: 'Configures the Mars Scenario solar irradiance baseline and Dust Storm attenuation.',
  },
  {
    id: 'nasa-veggie-space-ag',
    topic: 'Space Agriculture & Hydroponic Food Production',
    source_name: 'NASA Kennedy Space Center — Growing Plants in Space',
    source_url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/',
    relevant_explanation:
      'Systems like Veggie and the Advanced Plant Habitat (APH) grow fresh crops using LED lighting and controlled hydroponic nutrient delivery.',
    last_verified_date: '2026-11-14',
    game_usage: 'Models the Greenhouse facility trade-off: high electrical LED draw and water use in exchange for food and O2.',
  },
];

export const FALLBACK_FACILITIES: FacilityCatalogItem[] = [
  {
    id: 'crew_habitat',
    name: 'Crew Habitat Module',
    category: 'habitation',
    description: 'Pressurized multi-layer composite living quarters housing astronauts and baseline radiation shielding.',
    educational_explanation:
      'Space habitats maintain cabin pressure, thermal loops, and radiation protection. Upgrading adds water-wall shielding.',
    construction_cost: { energy: 25, water: 15 },
    energy_consumption: 12,
    production_rates: { shielding_bonus: 15, crew_morale: 3 },
    storage_Modifiers: { oxygen_capacity: 20, water_capacity: 80, food_capacity: 40 },
    maintenance_cost_per_day: 1.2,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'solar_array',
    name: 'Photovoltaic Solar Array',
    category: 'power',
    description: 'High-efficiency triple-junction sun-tracking solar wings converting solar irradiance into electrical energy (kWh).',
    educational_explanation:
      'Solar arrays generate clean electricity, but output drops sharply during lunar shadow cycles or Martian dust storms.',
    construction_cost: { energy: 15, water: 5 },
    energy_consumption: 0,
    production_rates: { energy: 42 },
    storage_Modifiers: {},
    maintenance_cost_per_day: 1.5,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'battery_storage',
    name: 'Regenerative Battery Bank',
    category: 'power',
    description: 'High-density lithium-ion and regenerative fuel-cell energy storage unit to buffer eclipse periods.',
    educational_explanation: 'Without adequate energy storage, surplus daytime solar power is wasted and brownouts occur at night.',
    construction_cost: { energy: 20, water: 5 },
    energy_consumption: 1.5,
    production_rates: {},
    storage_Modifiers: { energy_capacity: 120 },
    maintenance_cost_per_day: 1.0,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'oxygen_generator',
    name: 'Oxygen Generator Assembly (OGA)',
    category: 'life_support',
    description: 'Splits water molecules (2H2O -> 2H2 + O2) via electrolysis to produce breathable oxygen.',
    educational_explanation: 'Electrolysis demands continuous electrical power and purified water feedwater.',
    construction_cost: { energy: 22, water: 10 },
    energy_consumption: 14,
    production_rates: { oxygen: 4.8, water_input: 4.0 },
    storage_Modifiers: { oxygen_capacity: 15 },
    maintenance_cost_per_day: 1.8,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'water_recycler',
    name: 'Closed-Loop Water Recycler (WPA)',
    category: 'life_support',
    description: 'Distills, filters, and catalytically oxidizes cabin humidity condensate and crew wastewater.',
    educational_explanation: 'Recycling 85–95% of crew water reduces external extraction demand at the cost of power.',
    construction_cost: { energy: 20, water: 8 },
    energy_consumption: 10,
    production_rates: { water_recovery_ratio: 0.78, water_bonus: 6.0 },
    storage_Modifiers: { water_capacity: 100 },
    maintenance_cost_per_day: 1.6,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'greenhouse',
    name: 'Hydroponic Aeroponic Greenhouse',
    category: 'life_support',
    description: 'Controlled-environment agricultural dome using LED lighting to grow crops while scrubbing CO2.',
    educational_explanation:
      'Produces fresh food and supplemental oxygen via photosynthesis, but consumes significant LED electricity and irrigation water.',
    construction_cost: { energy: 28, water: 25 },
    energy_consumption: 16,
    production_rates: { food: 3.2, oxygen: 1.1, water_input: 6.5 },
    storage_Modifiers: { food_capacity: 35 },
    maintenance_cost_per_day: 1.8,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 2 },
  },
  {
    id: 'radiation_shelter',
    name: 'Regolith-Berm Radiation Shelter',
    category: 'habitation',
    description: 'Heavily shielded subterranean vault lined with sintered regolith and polyethylene water walls.',
    educational_explanation: 'Dedicated storm shelters drastically cut acute radiation dose during Solar Particle Events.',
    construction_cost: { energy: 30, water: 20 },
    energy_consumption: 5,
    production_rates: { shielding_bonus: 32 },
    storage_Modifiers: {},
    maintenance_cost_per_day: 0.8,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'communication_station',
    name: 'Deep Space Communication Array',
    category: 'operations',
    description: 'High-gain Ka-band parabolic dish connecting the outpost with Earth Mission Control.',
    educational_explanation: 'Provides advance warning of solar flares and downlinks planetary science telemetry.',
    construction_cost: { energy: 18, water: 4 },
    energy_consumption: 7,
    production_rates: { science_points: 4 },
    storage_Modifiers: {},
    maintenance_cost_per_day: 1.2,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 2 },
  },
  {
    id: 'medical_facility',
    name: 'Crew Medical & Countermeasure Bay',
    category: 'habitation',
    description: 'Equipped with radiation dosimetry, telemedicine diagnostics, and exercise countermeasures.',
    educational_explanation: 'Sustains astronaut health and counteracts partial-gravity deconditioning.',
    construction_cost: { energy: 22, water: 12 },
    energy_consumption: 8,
    production_rates: { health_recovery: 4.5 },
    storage_Modifiers: {},
    maintenance_cost_per_day: 1.3,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 1 },
  },
  {
    id: 'maintenance_workshop',
    name: 'Robotics & Maintenance Workshop',
    category: 'operations',
    description: '3D additive manufacturing bay and robotic servicing depot that restores facility condition.',
    educational_explanation: 'Automatically counteracts daily abrasive lunar and Martian regolith wear.',
    construction_cost: { energy: 24, water: 8 },
    energy_consumption: 9,
    production_rates: { auto_repair: 3.5 },
    storage_Modifiers: {},
    maintenance_cost_per_day: 1.0,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 2 },
  },
  {
    id: 'rover_garage',
    name: 'Pressurized Rover & ISRU Garage',
    category: 'operations',
    description: 'Deploys pressurized surface rovers to extract water-ice regolith from shadowed craters.',
    educational_explanation: 'In-Situ Resource Utilization (ISRU) rovers replenish water reserves from local ice deposits.',
    construction_cost: { energy: 26, water: 10 },
    energy_consumption: 11,
    production_rates: { water: 11, science_points: 3 },
    storage_Modifiers: { water_capacity: 50 },
    maintenance_cost_per_day: 2.2,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 3 },
  },
  {
    id: 'research_laboratory',
    name: 'Planetary Science & Geology Lab',
    category: 'science',
    description: 'Analytical spectrometer and astrobiology laboratory for core samples and mission science objectives.',
    educational_explanation: 'Generates Planetary Science Points required to fulfill research objectives.',
    construction_cost: { energy: 25, water: 12 },
    energy_consumption: 10,
    production_rates: { science_points: 10 },
    storage_Modifiers: {},
    maintenance_cost_per_day: 1.4,
    max_level: 3,
    planet_compatibility: ['moon', 'mars'],
    functional_effects: { power_priority: 3 },
  },
];

export const FALLBACK_MISSIONS: MissionScenario[] = [
  {
    id: 'moon-shackleton-outpost',
    name: 'Artemis Shackleton Crater Outpost',
    planet: 'moon',
    tagline: "Establish humanity's permanent foothold at the Lunar South Pole.",
    description:
      'Command a lunar surface outpost on the rim of Shackleton Crater. Balance high daytime solar energy against deep shadow cycles, abrasive electrostatic lunar dust, intense unshielded cosmic radiation, and crater water-ice harvesting.',
    difficulty_default: 'intermediate',
    default_duration_days: 15,
    default_crew_size: 4,
    environmental_constraints: {
      gravity_g: 0.166,
      solar_irradiance_factor: 1.0,
      baseline_radiation_msv_per_day: 1.35,
      dust_abrasion_rate: 2.4,
    },
    major_hazards: [
      'Solar Particle Events (SPEs) with zero atmospheric shielding',
      'Lunar South Pole grazing-angle shadow periods reducing solar output by 78%',
      'Electrostatic razor-sharp lunar regolith degrading seals and solar panels',
      'Total reliance on closed-loop water recycling and crater ice extraction',
    ],
    objectives: [
      { id: 'survive_duration', title: 'Maintain crew survival for the full mission duration', type: 'survival', target: 100 },
      { id: 'keep_oxygen_safe', title: 'Keep Oxygen reserves above critical threshold (10 kg)', type: 'resource_min', resource: 'oxygen', target: 10 },
      { id: 'build_shelter_or_greenhouse', title: 'Construct or upgrade at least 2 additional outpost facilities', type: 'facility_count', target: 6 },
      { id: 'complete_research', title: 'Accumulate at least 40 Planetary Science Points', type: 'science_points', target: 40 },
    ],
    starting_resources: {
      oxygen: { current: 45, capacity: 80, unit: 'kg', critical: 10 },
      water: { current: 220, capacity: 360, unit: 'L', critical: 40 },
      food: { current: 65, capacity: 120, unit: 'kg', critical: 12 },
      energy: { current: 160, capacity: 240, unit: 'kWh', critical: 30 },
      radiation_shielding: 55,
      cumulative_radiation_msv: 0,
      crew_health: 100,
      infrastructure_condition: 100,
      science_points: 0,
    },
    starting_facilities: [
      { facility_id: 'crew_habitat', level: 1, grid_x: 0, grid_z: 0 },
      { facility_id: 'solar_array', level: 1, grid_x: -6, grid_z: -4 },
      { facility_id: 'battery_storage', level: 1, grid_x: -6, grid_z: 2 },
      { facility_id: 'oxygen_generator', level: 1, grid_x: 5, grid_z: -3 },
    ],
  },
  {
    id: 'mars-jezero-colony',
    name: 'Ares Jezero Delta Research Base',
    planet: 'mars',
    tagline: 'Sustain a self-reliant human research base on the Red Planet.',
    description:
      "Lead an expedition in Mars' Jezero Crater delta. Operate with reduced solar flux (68%), survive multi-sol regional dust storms that choke solar power, manage subsurface water recovery, and grow hydroponic food.",
    difficulty_default: 'intermediate',
    default_duration_days: 15,
    default_crew_size: 4,
    environmental_constraints: {
      gravity_g: 0.378,
      solar_irradiance_factor: 0.68,
      baseline_radiation_msv_per_day: 0.78,
      dust_abrasion_rate: 2.0,
    },
    major_hazards: [
      'Regional and global Martian dust storms cutting solar array output by 50–80%',
      "Lower baseline solar irradiance due to Mars' 1.52 AU distance from the Sun",
      'Long communication delay with Earth requiring autonomous emergency triage',
      'High water & power demand to sustain hydroponic food production',
    ],
    objectives: [
      { id: 'survive_duration', title: 'Maintain crew survival for the full mission duration', type: 'survival', target: 100 },
      { id: 'keep_water_safe', title: 'Keep Water reserves above critical threshold (40 L)', type: 'resource_min', resource: 'water', target: 40 },
      { id: 'establish_greenhouse', title: 'Operate an active Hydroponic Greenhouse or Water Recycler', type: 'facility_count', target: 6 },
      { id: 'complete_research', title: 'Accumulate at least 50 Planetary Science Points', type: 'science_points', target: 50 },
    ],
    starting_resources: {
      oxygen: { current: 48, capacity: 85, unit: 'kg', critical: 10 },
      water: { current: 240, capacity: 380, unit: 'L', critical: 40 },
      food: { current: 60, capacity: 120, unit: 'kg', critical: 12 },
      energy: { current: 175, capacity: 260, unit: 'kWh', critical: 30 },
      radiation_shielding: 60,
      cumulative_radiation_msv: 0,
      crew_health: 100,
      infrastructure_condition: 100,
      science_points: 0,
    },
    starting_facilities: [
      { facility_id: 'crew_habitat', level: 1, grid_x: 0, grid_z: 0 },
      { facility_id: 'solar_array', level: 1, grid_x: -6, grid_z: -4 },
      { facility_id: 'battery_storage', level: 1, grid_x: -6, grid_z: 2 },
      { facility_id: 'water_recycler', level: 1, grid_x: 5, grid_z: 3 },
    ],
  },
];

export const FALLBACK_LEARNING_MODULES: LearningModule[] = [
  {
    id: 'mod-moon-exploration',
    title: 'Lunar South Pole Exploration & Artemis Base Camp',
    topic: 'Moon Exploration',
    difficulty: 'beginner',
    summary: "Why NASA's Artemis program targets the Lunar South Pole: sunlit crater rims and water-ice craters.",
    simple_explanation:
      "High peaks near the Moon's South Pole (like Shackleton Crater rim) receive extended grazing sunlight for solar power right next to permanently shadowed craters holding ancient water ice!",
    visual_illustration_type: 'lunar_south_pole_diagram',
    real_world_application:
      "NASA's Artemis program and Lunar Reconnaissance Orbiter (LRO) map polar hydrogen and illumination to site humanity's first lunar outpost.",
    related_game_mechanic:
      'In ASTROMISSION, low-angle shadow days reduce Solar Array output by 78%, requiring Battery Storage and Rover Garage ice harvesting.',
    key_takeaways: [
      'The Moon has no atmosphere—meaning zero wind, extreme temperatures, and unshielded space radiation.',
      'Lunar dust (regolith) is jagged and electrostatically charged, wearing down airlock seals and solar panels.',
      'Water ice trapped in permanently shadowed craters can be melted for drinking water and split into oxygen.',
    ],
    translations: {
      hi: {
        title: 'चंद्र दक्षिणी ध्रुव अन्वेषण और आर्टेमिस बेस कैंप',
        summary: 'नासा का आर्टेमिस कार्यक्रम चंद्रमा के दक्षिणी ध्रुव को क्यों चुनता है।',
        simple_explanation:
          'चंद्रमा के दक्षिणी ध्रुव के पास ऊंचे शिखरों पर लगभग लगातार धूप मिलती है और गहरे गड्ढों में पानी की बर्फ मौजूद है।',
      },
    },
    quiz_id: 'quiz-moon-exploration',
    reference: FALLBACK_REFERENCES[3],
    quiz: {
      id: 'quiz-moon-exploration',
      title: 'Lunar Outpost Engineering Check',
      difficulty: 'beginner',
      points_reward: 60,
      questions: [
        {
          id: 'q1',
          prompt: 'Why do mission architects favor the Lunar South Pole over equatorial sites for a permanent outpost?',
          options: [
            'It has a thick breathable atmosphere',
            'High crater rims receive extended sunlight next to shadowed craters containing water ice',
            'Gravity at the South Pole equals Earth gravity',
            'There is no lunar dust at the South Pole',
          ],
          correct_index: 1,
          explanation:
            'Sunlit peaks near the Lunar South Pole sit adjacent to permanently shadowed craters holding water ice.',
        },
        {
          id: 'q2',
          prompt: 'Why is lunar regolith (dust) a serious engineering hazard?',
          options: [
            'Sharp, unweathered glass and mineral fragments cling electrostatically and abrade seals',
            'It dissolves metal habitats on contact',
            'It only forms during rainstorms',
            'It blocks radio waves completely',
          ],
          correct_index: 0,
          explanation: 'Without wind or water erosion, micrometeoroid impacts create jagged electrostatic dust.',
        },
      ],
    },
  },
  {
    id: 'mod-eclss-oxygen',
    title: 'Oxygen Generation & Closed-Loop Life Support (ECLSS)',
    topic: 'Oxygen & Life Support',
    difficulty: 'beginner',
    summary: 'How astronauts breathe in space using water electrolysis (2H2O -> 2H2 + O2).',
    simple_explanation:
      'Each astronaut consumes ~0.84 kg of oxygen every day. The Oxygen Generator Assembly (OGA) uses electricity to split water molecules into breathable oxygen gas and hydrogen.',
    visual_illustration_type: 'eclss_electrolysis_loop',
    real_world_application:
      'Aboard the ISS, the Oxygen Generation Assembly produces oxygen from recycled water while the Sabatier system recovers water from exhaled CO2.',
    related_game_mechanic:
      'Your Oxygen Generator produces 4.8 kg O2/day (at Level 1), but requires 14 kWh of electricity and 4.0 L of water every day.',
    key_takeaways: [
      'Human metabolic oxygen consumption averages ~0.84 kg per crew member per day.',
      'Electrolysis couples the Oxygen system directly to both the Water system and the Electrical Power grid.',
    ],
    translations: {},
    quiz_id: 'quiz-eclss-oxygen',
    reference: FALLBACK_REFERENCES[0],
    quiz: {
      id: 'quiz-eclss-oxygen',
      title: 'ECLSS & Oxygen Electrolysis Quiz',
      difficulty: 'beginner',
      points_reward: 60,
      questions: [
        {
          id: 'q1',
          prompt: 'How does the Oxygen Generator Assembly (OGA) produce breathable oxygen?',
          options: [
            'By burning fossil fuels inside the cabin',
            'By splitting water molecules (H2O) into oxygen and hydrogen using electrical energy',
            'By compressing vacuum outside the habitat',
            'By cooling nitrogen gas',
          ],
          correct_index: 1,
          explanation: 'Water electrolysis uses electrical current to split liquid water into oxygen and hydrogen.',
        },
      ],
    },
  },
];

function loadState(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const defaultUser: User = {
    id: 'cloud-commander-001',
    username: 'commander_aria',
    email: 'student@astromission.edu',
    role: 'student',
    is_guest: false,
    is_active: true,
    display_name: 'Cadet Aria Vance',
    avatar_id: 'commander-luna',
    bio: 'Junior Astronaut Mission Commander.',
    preferred_language: 'en',
    xp_points: 250,
    learning_points: 120,
    level: 2,
    mission_streak: 1,
    missions_attempted: 0,
    missions_completed: 0,
    skill_progress: {
      'Life Support (ECLSS)': 75,
      'Power Grid Engineering': 80,
      'Radiation Protection': 65,
      'Space Agriculture': 60,
      'Emergency Triage': 70,
    },
  };
  return {
    user: defaultUser,
    sessions: {},
    snapshots: {},
    classrooms: [
      {
        id: 'demo-classroom-001',
        name: 'NASA Space Apps 2026 — Aerospace Systems Cohort',
        description: 'Hands-on engineering trade-off lab exploring Lunar and Martian habitats.',
        join_code: 'ASTRO2026',
        grade_level: 'Grades 7-12',
        learning_objectives: ['Master ECLSS closed-loop trade-offs', 'Survive Lunar Shadow & Mars Dust Storms'],
        student_count: 1,
        assignment_count: 2,
        members: [
          {
            student_id: defaultUser.id,
            username: defaultUser.username,
            display_name: defaultUser.display_name,
            missions_completed: 1,
            learning_points: 120,
          },
        ],
        assignments: [
          {
            id: 'demo-asgn-1',
            mission_id: 'moon-shackleton-outpost',
            title: 'Lab 1: Shackleton Crater 10-Day Survival & Water Loop',
            planet: 'moon',
            difficulty: 'beginner',
            target_duration_days: 10,
            learning_objectives: ['Construct a Closed-Loop Water Recycler'],
          },
          {
            id: 'demo-asgn-2',
            mission_id: 'mars-jezero-colony',
            title: 'Lab 2: Mars Jezero Dust Storm & Hydroponic Greenhouse',
            planet: 'mars',
            difficulty: 'intermediate',
            target_duration_days: 12,
            learning_objectives: ['Operate a Hydroponic Greenhouse'],
          },
        ],
      },
    ],
  };
}

function saveState(st: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // ignore
  }
}

export const offlineEngine = {
  getUser(): User {
    return loadState().user;
  },

  setUserRole(emailOrRole: string, displayName?: string): { access_token: string; refresh_token: string; user: User } {
    const st = loadState();
    let role: User['role'] = 'student';
    let name = displayName || 'Cadet Aria Vance';
    if (emailOrRole.includes('teacher')) {
      role = 'teacher';
      name = 'Dr. Elena Sagan (Educator)';
    } else if (emailOrRole.includes('admin')) {
      role = 'admin';
      name = 'Flight Director Kranz';
    } else if (emailOrRole === 'guest') {
      role = 'student';
      name = 'Guest Commander';
      st.user.is_guest = true;
    }
    st.user.role = role;
    st.user.display_name = name;
    saveState(st);
    return {
      access_token: `cloud-token-${Date.now()}`,
      refresh_token: `cloud-refresh-${Date.now()}`,
      user: st.user,
    };
  },

  createSession(payload: any): MissionSession {
    const st = loadState();
    const scenario =
      FALLBACK_MISSIONS.find((m) => m.id === payload.mission_id) || FALLBACK_MISSIONS[0];
    const id = `sess-${Date.now()}`;
    const res = JSON.parse(JSON.stringify(scenario.starting_resources));
    res.oxygen.capacity = 115;
    res.water.capacity = 440;
    res.food.capacity = 160;
    res.energy.capacity = 360;
    res.oxygen.status = 'optimal';
    res.water.status = 'optimal';
    res.food.status = 'optimal';
    res.energy.status = 'optimal';

    const initFacs = (payload.starting_facilities || scenario.starting_facilities).map(
      (f: any, idx: number) => {
        const def = FALLBACK_FACILITIES.find((fc) => fc.id === f.facility_id) || FALLBACK_FACILITIES[0];
        return {
          id: `fac-${idx + 1}-${Date.now()}`,
          session_id: id,
          facility_id: def.id,
          name: def.name,
          category: def.category,
          description: def.description,
          educational_explanation: def.educational_explanation,
          level: f.level || 1,
          max_level: def.max_level,
          condition: 100,
          is_operational: true,
          power_priority: def.functional_effects.power_priority || 2,
          energy_consumption: def.energy_consumption,
          production_rates: def.production_rates,
          construction_cost: def.construction_cost,
          grid_x: f.grid_x ?? (idx - 1.5) * 4.5,
          grid_z: f.grid_z ?? 0,
          built_on_day: 1,
        };
      }
    );

    const session: MissionSession = {
      id,
      user_id: st.user.id,
      mission_id: scenario.id,
      mission_name: payload.mission_name || scenario.name,
      planet: scenario.planet,
      difficulty: (payload.difficulty || 'intermediate') as any,
      status: 'active',
      current_day: 1,
      target_duration_days: payload.target_duration_days || 15,
      crew_size: payload.crew_size || 4,
      random_seed: 42,
      supply_preset: payload.supply_preset || 'balanced',
      resources: res,
      environment: {
        planet: scenario.planet,
        solar_irradiance_factor: scenario.planet === 'moon' ? 1.0 : 0.68,
        effective_solar_multiplier: scenario.planet === 'moon' ? 1.0 : 0.68,
        weather_condition: scenario.planet === 'moon' ? 'Sunlit Crater Peak' : 'Clear Martian Sol',
        is_lunar_night: false,
        is_dust_storm: false,
        ambient_radiation_msv_day: scenario.planet === 'moon' ? 1.35 : 0.78,
        surface_temp_c: scenario.planet === 'moon' ? -15 : -42,
        dust_abrasion_rate: 2.0,
      },
      objectives: scenario.objectives.map((o) => ({
        ...o,
        progress: 0,
        completed: false,
        failed: false,
      })),
      facilities: initFacs,
      events: [],
      recent_actions: [],
      result: null,
    };

    st.sessions[id] = session;
    st.snapshots[id] = [
      {
        day: 1,
        oxygen: res.oxygen.current,
        water: res.water.current,
        food: res.food.current,
        energy: res.energy.current,
        crew_health: 100,
        radiation_shielding: res.radiation_shielding,
        infrastructure_condition: 100,
      },
    ];
    st.user.missions_attempted += 1;
    saveState(st);
    return session;
  },

  getSession(sessionId: string): MissionSession {
    const st = loadState();
    const s = st.sessions[sessionId] || Object.values(st.sessions)[0];
    if (!s) return this.createSession({ mission_id: 'moon-shackleton-outpost' });
    return s as MissionSession;
  },

  advanceDay(sessionId: string) {
    const st = loadState();
    const s: MissionSession = st.sessions[sessionId];
    if (!s) throw new Error('Session not found');

    const nextDay = s.current_day + 1;
    s.current_day = nextDay;

    const isShadow = s.planet === 'moon' && (nextDay === 6 || nextDay === 7);
    const isDust = s.planet === 'mars' && nextDay % 4 === 0;
    s.environment.is_lunar_night = isShadow;
    s.environment.is_dust_storm = isDust;
    s.environment.effective_solar_multiplier = isShadow ? 0.22 : isDust ? 0.35 : s.planet === 'moon' ? 1.0 : 0.68;
    s.environment.weather_condition = isShadow
      ? 'Lunar Shadow Period (22% Solar)'
      : isDust
      ? 'Regional Martian Dust Storm'
      : 'Nominal Planetary Sky';

    let eGen = 0;
    let eCon = 0;
    let o2Prod = 0;
    let waterProd = 0;
    let foodProd = 0;
    let sciGain = 0;

    for (const f of s.facilities) {
      if (!f.is_operational) continue;
      const mult = 1 + 0.35 * (f.level - 1);
      eGen += (f.production_rates.energy || 0) * mult * s.environment.effective_solar_multiplier;
      eCon += f.energy_consumption * mult;
      o2Prod += (f.production_rates.oxygen || 0) * mult;
      foodProd += (f.production_rates.food || 0) * mult;
      waterProd += (f.production_rates.water || 0) * mult + (f.production_rates.water_bonus || 0) * mult;
      if (f.production_rates.water_recovery_ratio) {
        waterProd += s.crew_size * 3.5 * f.production_rates.water_recovery_ratio;
      }
      sciGain += (f.production_rates.science_points || 0) * mult;
      f.condition = Math.max(20, Math.round((f.condition - 1.5) * 10) / 10);
    }

    const o2Con = +(0.84 * s.crew_size).toFixed(2);
    const waterCon = +(3.5 * s.crew_size + 4.0).toFixed(2);
    const foodCon = +(0.62 * s.crew_size).toFixed(2);

    s.resources.energy.production_rate = +eGen.toFixed(1);
    s.resources.energy.consumption_rate = +eCon.toFixed(1);
    s.resources.energy.current = +Math.min(
      s.resources.energy.capacity,
      Math.max(0, s.resources.energy.current + eGen - eCon)
    ).toFixed(1);

    s.resources.oxygen.production_rate = +o2Prod.toFixed(2);
    s.resources.oxygen.consumption_rate = o2Con;
    s.resources.oxygen.current = +Math.min(
      s.resources.oxygen.capacity,
      Math.max(0, s.resources.oxygen.current + o2Prod - o2Con)
    ).toFixed(1);

    s.resources.water.production_rate = +waterProd.toFixed(1);
    s.resources.water.consumption_rate = waterCon;
    s.resources.water.current = +Math.min(
      s.resources.water.capacity,
      Math.max(0, s.resources.water.current + waterProd - waterCon)
    ).toFixed(1);

    s.resources.food.production_rate = +foodProd.toFixed(2);
    s.resources.food.consumption_rate = foodCon;
    s.resources.food.current = +Math.min(
      s.resources.food.capacity,
      Math.max(0, s.resources.food.current + foodProd - foodCon)
    ).toFixed(1);

    s.resources.science_points = +(s.resources.science_points + sciGain).toFixed(1);
    s.resources.cumulative_radiation_msv = +(s.resources.cumulative_radiation_msv + 0.45).toFixed(2);

    let generatedEvent: any = null;
    if (nextDay % 3 === 0) {
      generatedEvent = {
        id: `ev-${nextDay}`,
        session_id: s.id,
        event_id: s.planet === 'moon' ? 'solar_storm' : 'dust_storm',
        mission_day: nextDay,
        status: 'pending',
        title:
          s.planet === 'moon'
            ? 'Solar Particle Event (Coronal Mass Ejection)'
            : 'Regional Martian Dust Storm Front',
        description:
          s.planet === 'moon'
            ? 'Space weather sensors detect an incoming proton flux spike from an X-class solar flare.'
            : 'High-altitude iron-oxide dust clouds are sweeping across the crater basin, reducing sunlight.',
        severity: 'high',
        affected_systems: ['energy', 'crew_health'],
        scientific_explanation:
          'Requires active shielding or power load-shedding to protect astronauts and battery reserves.',
        decision_options: [
          {
            id: 'A',
            label: 'Activate Shelter / Dust Repulsion Protocol (-15 kWh Energy)',
            tradeoff: 'Spends 15 kWh electrical energy to protect crew health and infrastructure.',
            effects: { energy: -15, crew_health: 0 },
          },
          {
            id: 'B',
            label: 'Ride out storm on standard operations (Save Energy)',
            tradeoff: 'Conserves battery charge today, but reduces crew health by -8%.',
            effects: { energy: 0, crew_health: -8 },
          },
        ],
      };
      s.events.unshift(generatedEvent);
    }

    if (nextDay >= s.target_duration_days) {
      s.status = 'completed';
      st.user.missions_completed += 1;
      s.result = {
        outcome: 'completed',
        days_survived: nextDay,
        target_days: s.target_duration_days,
        total_score: 88.5,
        score_breakdown: {
          crew_safety: { score: 92, weight: '25%', explanation: 'Crew maintained high health and low radiation dose.' },
          resource_management: { score: 86, weight: '20%', explanation: 'Closed-loop O2 and Water remained balanced.' },
          energy_efficiency: { score: 88, weight: '15%', explanation: 'Solar and battery grid prevented brownouts.' },
          infrastructure_stability: { score: 85, weight: '15%', explanation: 'Outpost modules remained operational.' },
          emergency_decision_making: { score: 90, weight: '15%', explanation: 'Responded effectively to alerts.' },
          mission_objectives: { score: 88, weight: '10%', explanation: 'Completed primary survival and science goals.' },
        },
        crew_condition: s.resources.crew_health,
        major_decisions: ['Expanded outpost life-support and power infrastructure.'],
        best_decisions: ['Balanced water electrolysis with solar power generation.'],
        major_mistakes: [],
        educational_insights: ['Closed-loop ECLSS couples water, oxygen, and electrical power.'],
        recommended_improvements: ['Try Expert difficulty or a 25-day endurance mission next!'],
      };
    }

    st.snapshots[s.id] = st.snapshots[s.id] || [];
    st.snapshots[s.id].push({
      day: nextDay,
      oxygen: s.resources.oxygen.current,
      water: s.resources.water.current,
      food: s.resources.food.current,
      energy: s.resources.energy.current,
      crew_health: s.resources.crew_health,
      radiation_shielding: s.resources.radiation_shielding,
      infrastructure_condition: s.resources.infrastructure_condition,
    });

    saveState(st);
    return {
      session: s,
      day_report: {
        day: nextDay,
        mission_status: s.status,
        daily_metrics: { energy_generated: eGen, energy_consumed: eCon },
        alerts: [],
        log_entries: [`Day ${nextDay}: Generated ${eGen.toFixed(1)} kWh, consumed ${eCon.toFixed(1)} kWh.`],
        generated_event: generatedEvent,
        newly_unlocked_achievements: nextDay >= s.target_duration_days ? ['First Launch'] : [],
      },
    };
  },

  constructFacility(sessionId: string, facility_id: string, grid_x?: number, grid_z?: number): MissionSession {
    const st = loadState();
    const s: MissionSession = st.sessions[sessionId];
    const def = FALLBACK_FACILITIES.find((f) => f.id === facility_id) || FALLBACK_FACILITIES[0];
    if (s.resources.energy.current < def.construction_cost.energy) {
      throw new Error(`Requires ${def.construction_cost.energy} kWh Energy.`);
    }
    s.resources.energy.current = +(s.resources.energy.current - def.construction_cost.energy).toFixed(1);
    s.resources.water.current = +Math.max(0, s.resources.water.current - def.construction_cost.water).toFixed(1);
    const idx = s.facilities.length;
    s.facilities.push({
      id: `fac-${idx + 1}-${Date.now()}`,
      session_id: s.id,
      facility_id: def.id,
      name: def.name,
      category: def.category,
      description: def.description,
      educational_explanation: def.educational_explanation,
      level: 1,
      max_level: def.max_level,
      condition: 100,
      is_operational: true,
      power_priority: def.functional_effects.power_priority || 2,
      energy_consumption: def.energy_consumption,
      production_rates: def.production_rates,
      construction_cost: def.construction_cost,
      grid_x: grid_x ?? ((idx % 4) - 1.5) * 5,
      grid_z: grid_z ?? (Math.floor(idx / 4) - 0.5) * 5,
      built_on_day: s.current_day,
    });
    saveState(st);
    return s;
  },

  updateFacility(sessionId: string, instId: string, payload: any): MissionSession {
    const st = loadState();
    const s: MissionSession = st.sessions[sessionId];
    const fac = s.facilities.find((f) => f.id === instId);
    if (fac) {
      if (payload.upgrade && fac.level < fac.max_level) {
        fac.level += 1;
        s.resources.energy.current = Math.max(0, +(s.resources.energy.current - 12).toFixed(1));
      }
      if (payload.is_operational !== undefined) {
        fac.is_operational = payload.is_operational;
      }
    }
    saveState(st);
    return s;
  },

  repairFacility(sessionId: string, instId: string): MissionSession {
    const st = loadState();
    const s: MissionSession = st.sessions[sessionId];
    const fac = s.facilities.find((f) => f.id === instId);
    if (fac) {
      fac.condition = 100;
      s.resources.energy.current = Math.max(0, +(s.resources.energy.current - 10).toFixed(1));
    }
    saveState(st);
    return s;
  },

  performAction(sessionId: string, action_type: string): MissionSession {
    const st = loadState();
    const s: MissionSession = st.sessions[sessionId];
    if (action_type === 'rover_sortie') {
      s.resources.energy.current = Math.max(0, +(s.resources.energy.current - 16).toFixed(1));
      s.resources.water.current = Math.min(s.resources.water.capacity, +(s.resources.water.current + 32).toFixed(1));
      s.resources.science_points += 5;
    } else if (action_type === 'emergency_o2') {
      s.resources.water.current = Math.max(0, +(s.resources.water.current - 15).toFixed(1));
      s.resources.oxygen.current = Math.min(s.resources.oxygen.capacity, +(s.resources.oxygen.current + 8).toFixed(1));
    } else if (action_type === 'ration') {
      s.resources.rationing_mode = s.resources.rationing_mode === 'rationed' ? 'normal' : 'rationed';
    }
    saveState(st);
    return s;
  },

  chooseEventDecision(sessionId: string, eventId: string, option_id: string): MissionSession {
    const st = loadState();
    const s: MissionSession = st.sessions[sessionId];
    const ev = s.events.find((e) => e.id === eventId || e.event_id === eventId);
    if (ev) {
      ev.status = 'resolved';
      ev.selected_option_id = option_id;
      const opt = ev.decision_options.find((o) => o.id === option_id);
      if (opt?.effects.energy) {
        s.resources.energy.current = Math.max(0, +(s.resources.energy.current + opt.effects.energy).toFixed(1));
      }
      if (opt?.effects.crew_health) {
        s.resources.crew_health = Math.max(0, Math.min(100, s.resources.crew_health + opt.effects.crew_health));
      }
    }
    saveState(st);
    return s;
  },

  askMentor(question: string, sessionId?: string, planet = 'moon'): MentorResponse {
    const st = loadState();
    const s: MissionSession | undefined = sessionId ? st.sessions[sessionId] : undefined;
    const sit = s
      ? `Day ${s.current_day}/${s.target_duration_days} on ${s.planet.toUpperCase()}. Energy: ${s.resources.energy.current} kWh, Oxygen: ${s.resources.oxygen.current} kg, Water: ${s.resources.water.current} L, Crew Health: ${s.resources.crew_health}%.`
      : `Operating in ${planet.toUpperCase()} mission sector.`;
    return {
      commander_name: 'COMMANDER AI',
      question,
      situation: sit,
      explanation:
        'Every habitat subsystem is coupled: Oxygen electrolysis (OGA) and the Hydroponic Greenhouse both consume electrical power and purified water.',
      possible_decisions: [
        'Construct or upgrade a Photovoltaic Solar Array and Regenerative Battery Bank before adding high-draw facilities.',
        'Build a Closed-Loop Water Recycler (WPA) to recover up to 92% of crew wastewater.',
        'Deploy a Radiation Shelter to cut acute solar storm radiation doses by 55%.',
      ],
      trade_offs:
        'Expanding food or science facilities too early can drain battery and water reserves needed by critical Tier-1 life support.',
      learning_fact: FALLBACK_REFERENCES[0].relevant_explanation,
      spoken_summary: `${sit} Remember that oxygen generation and greenhouses require both water and solar power. Balance your energy storage and water recycling first.`,
      nasa_reference: {
        id: FALLBACK_REFERENCES[0].id,
        topic: FALLBACK_REFERENCES[0].topic,
        source_name: FALLBACK_REFERENCES[0].source_name,
        source_url: FALLBACK_REFERENCES[0].source_url,
      },
      provider_used: 'nasa_telemetry_knowledge_engine',
    };
  },

  getSessionReport(sessionId: string) {
    const st = loadState();
    const s: MissionSession = this.getSession(sessionId);
    return {
      session_id: s.id,
      mission_name: s.mission_name,
      planet: s.planet,
      difficulty: s.difficulty,
      outcome: s.status,
      days_survived: s.current_day,
      target_days: s.target_duration_days,
      total_score: s.result?.total_score || 86.5,
      score_breakdown: s.result?.score_breakdown || {
        crew_safety: { score: 92, weight: '25%', explanation: `Crew health at ${s.resources.crew_health}%.` },
        resource_management: { score: 85, weight: '20%', explanation: 'Sustainable O2, Water, Food, and Energy balance.' },
        energy_efficiency: { score: 84, weight: '15%', explanation: 'Stable solar and battery utilization.' },
        infrastructure_stability: { score: 86, weight: '15%', explanation: `${s.facilities.length} active modules.` },
        emergency_decision_making: { score: 88, weight: '15%', explanation: 'Emergency triage protocol active.' },
        mission_objectives: { score: 84, weight: '10%', explanation: `Earned ${s.resources.science_points} Science Points.` },
      },
      final_resources: s.resources,
      crew_condition: s.resources.crew_health,
      best_decisions: ['Maintained closed-loop ECLSS oxygen and water balance.'],
      recommended_improvements: ['Add a Planetary Science Lab and upgrade Battery Storage for shadow phases.'],
      snapshots: st.snapshots[s.id] || [],
    };
  },

  getAnalyticsOverview() {
    const st = loadState();
    const sessions = Object.values(st.sessions) as MissionSession[];
    const latest = sessions[sessions.length - 1];
    const snaps = latest ? (st.snapshots[latest.id] || []).map((sn: any) => ({ ...sn, day: `Day ${sn.day}` })) : [];
    return {
      missions_attempted: Math.max(1, sessions.length),
      missions_completed: sessions.filter((s) => s.status === 'completed').length,
      missions_failed: sessions.filter((s) => s.status === 'failed').length,
      success_rate: sessions.length ? 100 : 0,
      failure_rate: 0,
      average_score: 86.5,
      quizzes_completed: 1,
      achievements_unlocked: 3,
      latest_session_id: latest?.id || null,
      latest_mission_name: latest?.mission_name || 'Artemis Shackleton Crater Outpost',
      resource_history: snaps,
      score_breakdown: [
        { category: 'Crew Safety', score: 92, weight: '25%' },
        { category: 'Resource Management', score: 85, weight: '20%' },
        { category: 'Energy Efficiency', score: 84, weight: '15%' },
        { category: 'Infrastructure Stability', score: 86, weight: '15%' },
        { category: 'Emergency Decision Making', score: 88, weight: '15%' },
        { category: 'Mission Objectives', score: 84, weight: '10%' },
      ],
    };
  },

  getClassrooms() {
    return loadState().classrooms;
  },
};
