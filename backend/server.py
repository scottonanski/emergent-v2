from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class Valence(BaseModel):
    curiosity: float = Field(ge=0, le=1, description="Curiosity valence (0-1)")
    certainty: float = Field(ge=0, le=1, description="Certainty valence (0-1)")
    dissonance: float = Field(ge=0, le=1, description="Dissonance valence (0-1)")

class TUnit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(description="The thought/content of the T-unit")
    valence: Valence = Field(description="Valence values for the T-unit")
    parents: List[str] = Field(default=[], description="IDs of parent T-units")
    children: List[str] = Field(default=[], description="IDs of child T-units")
    linkage: str = Field(default="generative", description="Type of linkage")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    phase: Optional[str] = Field(default=None, description="Transformation phase if applicable")

class TUnitCreate(BaseModel):
    content: str
    valence: Valence
    linkage: str = "generative"
    phase: Optional[str] = None

class SynthesisRequest(BaseModel):
    t_unit_ids: List[str] = Field(min_length=3, description="At least 3 T-unit IDs for synthesis")

class TransformationRequest(BaseModel):
    t_unit_id: str = Field(description="T-unit ID to transform")
    anomaly: str = Field(description="Anomaly string to trigger transformation")

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = Field(description="Event type (synthesis, transformation, etc.)")
    t_unit_id: str = Field(description="Related T-unit ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default={}, description="Additional event data")

# ============== COGNITIVE ALGORITHMS ==============

def average_valence(valences: List[Valence]) -> Valence:
    """Calculate average valence from multiple T-units"""
    if not valences:
        return Valence(curiosity=0.5, certainty=0.5, dissonance=0.5)
    
    total_curiosity = sum(v.curiosity for v in valences)
    total_certainty = sum(v.certainty for v in valences)
    total_dissonance = sum(v.dissonance for v in valences)
    count = len(valences)
    
    return Valence(
        curiosity=total_curiosity / count,
        certainty=total_certainty / count,
        dissonance=total_dissonance / count
    )

def synthesize_content(contents: List[str]) -> str:
    """Synthesize content from multiple T-units"""
    return f"SYNTHESIS: {' | '.join(contents)}"

def apply_transformation_phase(valence: Valence, phase: str) -> Valence:
    """Apply transformation phase modifications to valence"""
    new_valence = Valence(
        curiosity=valence.curiosity,
        certainty=valence.certainty,
        dissonance=valence.dissonance
    )
    
    if phase == "Shattering":
        new_valence.dissonance = min(1.0, new_valence.dissonance + 0.2)
    elif phase == "Remembering":
        new_valence.curiosity = min(1.0, new_valence.curiosity + 0.1)
    elif phase == "Re-feeling":
        new_valence.dissonance = max(0.0, new_valence.dissonance - 0.1)
    elif phase == "Re-centering":
        new_valence.certainty = min(1.0, new_valence.certainty + 0.1)
    elif phase == "Becoming":
        new_valence.certainty = min(1.0, new_valence.certainty + 0.2)
    
    return new_valence

def generate_transformation_content(original_content: str, phase: str, anomaly: str) -> str:
    """Generate content for transformation phase"""
    return f"{phase.upper()}: {original_content} [ANOMALY: {anomaly}]"

# ============== ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "CEP-Web API - Cognitive Emergence Protocol"}

@api_router.post("/t-units", response_model=TUnit)
async def create_t_unit(t_unit: TUnitCreate):
    """Create a new T-unit"""
    new_t_unit = TUnit(**t_unit.dict())
    await db.t_units.insert_one(new_t_unit.dict())
    return new_t_unit

@api_router.get("/t-units", response_model=List[TUnit])
async def get_t_units():
    """Get all T-units"""
    t_units = await db.t_units.find().to_list(1000)
    return [TUnit(**t_unit) for t_unit in t_units]

@api_router.get("/t-units/{t_unit_id}", response_model=TUnit)
async def get_t_unit(t_unit_id: str):
    """Get specific T-unit"""
    t_unit = await db.t_units.find_one({"id": t_unit_id})
    if not t_unit:
        raise HTTPException(status_code=404, detail="T-unit not found")
    return TUnit(**t_unit)

@api_router.post("/synthesize", response_model=TUnit)
async def synthesize_t_units(request: SynthesisRequest):
    """Synthesize 3+ T-units into a new T-unit"""
    # Get the T-units to synthesize
    t_units = []
    for t_unit_id in request.t_unit_ids:
        t_unit_doc = await db.t_units.find_one({"id": t_unit_id})
        if t_unit_doc:
            t_units.append(TUnit(**t_unit_doc))
    
    if len(t_units) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 T-units for synthesis")
    
    # Synthesize content and valence
    contents = [t.content for t in t_units]
    valences = [t.valence for t in t_units]
    
    new_t_unit = TUnit(
        content=synthesize_content(contents),
        valence=average_valence(valences),
        parents=request.t_unit_ids,
        linkage="generative"
    )
    
    # Update parent T-units to include this as a child
    for t_unit_id in request.t_unit_ids:
        await db.t_units.update_one(
            {"id": t_unit_id},
            {"$push": {"children": new_t_unit.id}}
        )
    
    # Save new T-unit
    await db.t_units.insert_one(new_t_unit.dict())
    
    # Log synthesis event
    event = Event(
        type="synthesis",
        t_unit_id=new_t_unit.id,
        metadata={"parent_ids": request.t_unit_ids}
    )
    await db.events.insert_one(event.dict())
    
    return new_t_unit

@api_router.post("/transform", response_model=List[TUnit])
async def transform_t_unit(request: TransformationRequest):
    """Transform a T-unit through the 5-phase transformation loop"""
    # Get the original T-unit
    t_unit_doc = await db.t_units.find_one({"id": request.t_unit_id})
    if not t_unit_doc:
        raise HTTPException(status_code=404, detail="T-unit not found")
    
    original_t_unit = TUnit(**t_unit_doc)
    
    # 5 phases of transformation
    phases = ["Shattering", "Remembering", "Re-feeling", "Re-centering", "Becoming"]
    new_t_units = []
    
    for phase in phases:
        # Apply phase transformation
        new_valence = apply_transformation_phase(original_t_unit.valence, phase)
        new_content = generate_transformation_content(original_t_unit.content, phase, request.anomaly)
        
        # Create new T-unit for this phase
        phase_t_unit = TUnit(
            content=new_content,
            valence=new_valence,
            parents=[request.t_unit_id],
            linkage="transformational",
            phase=phase
        )
        
        new_t_units.append(phase_t_unit)
        
        # Save to database
        await db.t_units.insert_one(phase_t_unit.dict())
        
        # Log transformation event
        event = Event(
            type="transformation",
            t_unit_id=phase_t_unit.id,
            metadata={"phase": phase, "parent_id": request.t_unit_id, "anomaly": request.anomaly}
        )
        await db.events.insert_one(event.dict())
    
    # Update original T-unit with children
    child_ids = [t.id for t in new_t_units]
    await db.t_units.update_one(
        {"id": request.t_unit_id},
        {"$push": {"children": {"$each": child_ids}}}
    )
    
    return new_t_units

@api_router.get("/events", response_model=List[Event])
async def get_events():
    """Get all events"""
    events = await db.events.find().sort("timestamp", -1).to_list(1000)
    return [Event(**event) for event in events]

@api_router.post("/genesis/import")
async def import_genesis_log(genesis_data: dict):
    """Import genesis log data"""
    # Clear existing data
    await db.t_units.delete_many({})
    await db.events.delete_many({})
    
    # Import T-units
    if "t_units" in genesis_data:
        for t_unit_data in genesis_data["t_units"]:
            t_unit = TUnit(**t_unit_data)
            await db.t_units.insert_one(t_unit.dict())
    
    # Import events
    if "events" in genesis_data:
        for event_data in genesis_data["events"]:
            event = Event(**event_data)
            await db.events.insert_one(event.dict())
    
    return {"message": "Genesis log imported successfully"}

@api_router.get("/genesis/export")
async def export_genesis_log():
    """Export current state as genesis log"""
    t_units = await db.t_units.find().to_list(1000)
    events = await db.events.find().to_list(1000)
    
    # Convert to serializable format
    genesis_data = {
        "t_units": [TUnit(**t_unit).dict() for t_unit in t_units],
        "events": [Event(**event).dict() for event in events],
        "exported_at": datetime.utcnow().isoformat()
    }
    
    return genesis_data

# Initialize with some sample data
@api_router.post("/init-sample-data")
async def init_sample_data():
    """Initialize with sample T-units for demonstration"""
    # Clear existing data
    await db.t_units.delete_many({})
    await db.events.delete_many({})
    
    # Create sample T-units
    sample_t_units = [
        TUnit(
            content="The nature of consciousness is recursive",
            valence=Valence(curiosity=0.8, certainty=0.3, dissonance=0.6),
            linkage="foundational"
        ),
        TUnit(
            content="Thoughts emerge from the interaction of simpler units",
            valence=Valence(curiosity=0.7, certainty=0.5, dissonance=0.2),
            linkage="generative"
        ),
        TUnit(
            content="Cognitive dissonance drives transformation",
            valence=Valence(curiosity=0.6, certainty=0.4, dissonance=0.9),
            linkage="transformational"
        ),
        TUnit(
            content="Understanding emerges through synthesis",
            valence=Valence(curiosity=0.9, certainty=0.7, dissonance=0.1),
            linkage="synthetic"
        )
    ]
    
    for t_unit in sample_t_units:
        await db.t_units.insert_one(t_unit.dict())
    
    return {"message": "Sample data initialized", "count": len(sample_t_units)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()