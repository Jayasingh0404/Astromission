import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { OutpostBlueprint2D } from './three/scenes/OutpostScene3D';
import { CommanderAIPanel } from './components/CommanderAIPanel';
import { MissionSelectionPage } from './pages/MissionSelectionPage';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            commander_name: 'COMMANDER AI',
            question: 'Status check',
            situation: 'Day 1 on Moon.',
            explanation: 'Systems nominal.',
            possible_decisions: ['Build Solar Array', 'Build Water Recycler'],
            trade_offs: 'Power vs Water balance.',
            learning_fact: 'ECLSS recycles water.',
            spoken_summary: 'Day 1 on Moon.',
            nasa_reference: {
              id: 'nasa-eclss-2023',
              topic: 'ECLSS',
              source_name: 'NASA ECLSS',
              source_url: 'https://www.nasa.gov',
            },
          }),
      })
    )
  );
});

describe('ASTROMISSION Frontend Suite', () => {
  it('renders Landing Page with project title, tagline, and primary navigation buttons', () => {
    render(<App />);
    expect(screen.getAllByText(/ASTROMISSION/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your Mission\. Your Decisions\. Your Survival\./i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Start Mission/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Meet Your AI Commander/i })).toBeInTheDocument();
  });

  it('renders Mission Selection Page with Moon and Mars scenarios and difficulty controls', () => {
    render(
      <MemoryRouter>
        <MissionSelectionPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Select Your Space Mission/i)).toBeInTheDocument();
    expect(screen.getByText(/Artemis Shackleton Crater Outpost/i)).toBeInTheDocument();
    expect(screen.getByText(/Ares Jezero Delta Research Base/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expert/i })).toBeInTheDocument();
  });

  it('renders Commander AI Panel with voice fallback and structured engineering queries', () => {
    const onClose = vi.fn();
    render(<CommanderAIPanel isOpen={true} onClose={onClose} planet="moon" />);
    expect(screen.getByText(/COMMANDER AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Commander, why is my energy decreasing\?/i)).toBeInTheDocument();
  });

  it('renders 2D Tactical Blueprint fallback and supports building selection & grid placement', () => {
    const onSelect = vi.fn();
    const onPlace = vi.fn();

    render(
      <OutpostBlueprint2D
        planet="moon"
        facilities={[
          {
            id: 'fac-1',
            session_id: 'sess-1',
            facility_id: 'crew_habitat',
            name: 'Crew Habitat Module',
            category: 'habitation',
            description: 'Habitat',
            educational_explanation: 'ECLSS shell',
            level: 1,
            max_level: 3,
            condition: 98,
            is_operational: true,
            power_priority: 1,
            energy_consumption: 12,
            production_rates: {},
            construction_cost: { energy: 25, water: 15 },
            grid_x: 0,
            grid_z: 0,
            built_on_day: 1,
          },
        ]}
        environment={{
          planet: 'moon',
          solar_irradiance_factor: 1.0,
          effective_solar_multiplier: 1.0,
          weather_condition: 'Sunlit Crater Peak',
          is_lunar_night: false,
          is_dust_storm: false,
          ambient_radiation_msv_day: 1.35,
          surface_temp_c: -15,
          dust_abrasion_rate: 2.4,
        }}
        selectedFacilityId={null}
        onSelectFacility={onSelect}
        placementFacilityType="solar_array"
        onPlaceFacilityAt={onPlace}
      />
    );

    const habBtn = screen.getByText(/Crew Habitat Module/i);
    fireEvent.click(habBtn);
    expect(onSelect).toHaveBeenCalledWith('fac-1');

    const deployBtns = screen.getAllByText(/Click to Deploy Here/i);
    fireEvent.click(deployBtns[0]);
    expect(onPlace).toHaveBeenCalled();
  });
});
