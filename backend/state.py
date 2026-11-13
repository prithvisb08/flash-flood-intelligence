import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import copy
from config import LOCATIONS
from settings import settings


class SessionState:
    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.live_mode: bool = True
        self.sih_demo_step: int = 0
        self.simulation_overrides: Dict[str, Dict[str, float]] = {}
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.last_accessed_at: str = self.created_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "live_mode": self.live_mode,
            "sih_demo_step": self.sih_demo_step,
            "simulation_overrides": self.simulation_overrides,
            "last_accessed_at": self.last_accessed_at,
        }


class StateManager:
    """Session-isolated state manager with fallback to in-memory store."""

    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}
        self._lock = asyncio.Lock()
        self.total_syncs: int = 0
        self.failed_syncs: int = 0
        self.last_synced_at: str = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        self.sync_in_progress: bool = False
        
        # Telemetry storage
        self.live_data_cache: Dict[str, Dict[str, Any]] = {}
        self.historical_readings: Dict[str, List[float]] = {loc["id"]: [] for loc in LOCATIONS}
        
        # Initialize default baselines deterministically (ZERO random numbers)
        self.default_baselines: Dict[str, Dict[str, float]] = {}
        for loc in LOCATIONS:
            # Deterministic calculation from location annual rainfall & vulnerability
            base_rain = round(loc["annual_rainfall_mm"] / (365.0 * 24.0), 2)
            base_soil = round(min(98.0, max(20.0, 30.0 + (loc["vulnerability"] * 40.0))), 1)
            base_wl = round(1.5 + (base_rain * 0.05), 2)
            base_rise = round(max(0.02, base_rain * 0.02), 2)
            self.default_baselines[loc["id"]] = {
                "rainfall_1h": base_rain,
                "soil_moisture": base_soil,
                "water_level": base_wl,
                "water_level_rise_rate": base_rise,
            }

    async def get_session(self, session_id: Optional[str] = None) -> SessionState:
        sid = session_id or "default"
        async with self._lock:
            if sid not in self._sessions:
                self._sessions[sid] = SessionState(session_id=sid)
            session = self._sessions[sid]
            session.last_accessed_at = datetime.now(timezone.utc).isoformat()
            return session

    async def update_session_mode(self, session_id: Optional[str], live_mode: bool) -> SessionState:
        session = await self.get_session(session_id)
        async with self._lock:
            session.live_mode = live_mode
            return session

    async def update_simulation_override(
        self, session_id: Optional[str], location_id: str, params: Dict[str, float]
    ) -> SessionState:
        session = await self.get_session(session_id)
        async with self._lock:
            session.live_mode = False  # Entering simulation overrides live stream for this session
            if location_id not in session.simulation_overrides:
                session.simulation_overrides[location_id] = {}
            session.simulation_overrides[location_id].update(params)
            return session

    async def advance_demo_step(self, session_id: Optional[str]) -> int:
        session = await self.get_session(session_id)
        async with self._lock:
            session.live_mode = False
            session.sih_demo_step += 1
            return session.sih_demo_step

    async def reset_session(self, session_id: Optional[str]) -> SessionState:
        sid = session_id or "default"
        async with self._lock:
            self._sessions[sid] = SessionState(session_id=sid)
            return self._sessions[sid]

    def get_effective_telemetry(self, session: SessionState, loc_id: str) -> Dict[str, Any]:
        """Returns effective telemetry for a location: simulation override if present, else live cached, else baseline."""
        if not session.live_mode and loc_id in session.simulation_overrides:
            override = session.simulation_overrides[loc_id]
            base = copy.deepcopy(self.default_baselines.get(loc_id, {}))
            base.update(override)
            base["is_simulated"] = True
            base["data_source"] = "SIMULATED_SESSION_OVERRIDE"
            return base

        if session.live_mode and loc_id in self.live_data_cache:
            data = copy.deepcopy(self.live_data_cache[loc_id])
            data["is_simulated"] = False
            data["data_source"] = "LIVE_TELEMETRY_STREAM"
            return data

        # Fallback to deterministic baseline
        base = copy.deepcopy(self.default_baselines.get(loc_id, {}))
        base["is_simulated"] = True
        base["data_source"] = "DERIVED_HISTORICAL_BASELINE"
        return base


state_manager = StateManager()
