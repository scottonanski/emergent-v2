from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
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
import asyncio
import numpy as np
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client
openai_client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

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
    agent_id: str = Field(default="default", description="Agent that created this T-unit")
    ai_generated: bool = Field(default=False, description="Whether content was AI-generated")
    embedding: Optional[List[float]] = Field(default=None, description="OpenAI embedding vector for semantic similarity")
    embedding_model: Optional[str] = Field(default=None, description="Model used for embedding generation")

class TUnitCreate(BaseModel):
    content: str
    valence: Valence
    linkage: str = "generative"
    phase: Optional[str] = None
    agent_id: str = "default"

class SynthesisRequest(BaseModel):
    t_unit_ids: List[str] = Field(min_length=2, description="At least 2 T-unit IDs for synthesis")
    use_ai: bool = Field(default=True, description="Use AI for intelligent synthesis")
    recalled_ids: List[str] = Field(default=[], description="IDs of T-units that were recalled from memory")

class TransformationRequest(BaseModel):
    t_unit_id: str = Field(description="T-unit ID to transform")
    anomaly: str = Field(description="Anomaly string to trigger transformation")
    use_ai: bool = Field(default=True, description="Use AI for intelligent transformation")
    recalled_ids: List[str] = Field(default=[], description="IDs of T-units that were recalled from memory")

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = Field(description="Event type (synthesis, transformation, etc.)")
    t_unit_id: str = Field(description="Related T-unit ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default={}, description="Additional event data")
    agent_id: str = Field(default="default", description="Agent that created this event")

class AgentInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(description="Agent name")
    description: str = Field(description="Agent description")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = Field(default=True)
    avatar: str = Field(default="🤖", description="Agent avatar emoji")
    color: str = Field(default="#6366f1", description="Agent theme color")
    
    # Auto-assign avatar and color if not provided
    def __init__(self, **data):
        super().__init__(**data)
        if 'avatar' not in data:
            avatars = ["🤖", "🧠", "👤", "🌀", "⚡", "🔮", "🎭", "🦋"]
            import random
            self.avatar = random.choice(avatars)
        if 'color' not in data:
            colors = ["#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#84cc16"]
            import random
            self.color = random.choice(colors)

class MultiAgentExchange(BaseModel):
    source_agent_id: str
    target_agent_id: str
    t_unit_id: str
    exchange_type: str = Field(default="anomaly_sharing")

class MemorySuggestion(BaseModel):
    id: str
    content: str
    similarity: float
    valence_score: float
    final_score: float
    agent_id: str
    timestamp: datetime
    valence: Valence

class MemorySuggestRequest(BaseModel):
    agent_id: str
    t_unit_id: str
    limit: int = Field(default=10, ge=1, le=50)
    include_cross_agent: bool = Field(default=False, description="Include memories from other agents")
    valence_weight: float = Field(default=0.25, ge=0.0, le=1.0, description="Weight for valence similarity in scoring")

# ============== EMBEDDING & MEMORY FUNCTIONS ==============

async def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate OpenAI embedding for text"""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=text.strip()
        )
        return response.data[0].embedding
    except Exception as e:
        logging.error(f"Failed to generate embedding: {e}")
        return None

async def get_or_create_embedding(t_unit: TUnit) -> Optional[List[float]]:
    """Get existing embedding or generate new one for T-unit"""
    if t_unit.embedding:
        return t_unit.embedding
    
    # Generate new embedding
    embedding = await generate_embedding(t_unit.content)
    if embedding:
        # Update T-unit with embedding
        await db.t_units.update_one(
            {"id": t_unit.id},
            {"$set": {
                "embedding": embedding,
                "embedding_model": "text-embedding-ada-002"
            }}
        )
    return embedding

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    if not a or not b or len(a) != len(b):
        return 0.0
    
    try:
        a_np = np.array(a)
        b_np = np.array(b)
        
        dot_product = np.dot(a_np, b_np)
        norm_a = np.linalg.norm(a_np)
        norm_b = np.linalg.norm(b_np)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        return float(dot_product / (norm_a * norm_b))
    except Exception as e:
        logging.error(f"Error calculating cosine similarity: {e}")
        return 0.0

def valence_similarity(v1: Valence, v2: Valence) -> float:
    """Calculate valence similarity (1 - L1 distance, normalized)"""
    try:
        distance = (
            abs(v1.curiosity - v2.curiosity) +
            abs(v1.certainty - v2.certainty) +
            abs(v1.dissonance - v2.dissonance)
        )
        # L1 distance max is 3.0 (when all values differ by 1.0)
        # Convert to similarity score (higher = more similar)
        return max(0.0, 1.0 - (distance / 3.0))
    except Exception as e:
        logging.error(f"Error calculating valence similarity: {e}")
        return 0.0

async def find_memory_suggestions(
    target_t_unit: TUnit, 
    agent_id: str, 
    limit: int = 10,
    include_cross_agent: bool = False,
    valence_weight: float = 0.25
) -> List[MemorySuggestion]:
    """Find semantically similar T-units from memory"""
    
    # Get or generate embedding for target T-unit
    target_embedding = await get_or_create_embedding(target_t_unit)
    if not target_embedding:
        logging.warning(f"Could not generate embedding for T-unit {target_t_unit.id}")
        return []
    
    # Build query filter
    query = {"id": {"$ne": target_t_unit.id}}  # Exclude the target T-unit itself
    if not include_cross_agent:
        query["agent_id"] = agent_id
    
    # Fetch candidate T-units (limit to reasonable number for performance)
    candidates = await db.t_units.find(query).limit(1000).to_list(1000)
    
    suggestions = []
    for candidate_doc in candidates:
        try:
            candidate = TUnit(**candidate_doc)
            
            # Get or generate embedding for candidate
            candidate_embedding = await get_or_create_embedding(candidate)
            if not candidate_embedding:
                continue
            
            # Calculate semantic similarity
            semantic_sim = cosine_similarity(target_embedding, candidate_embedding)
            
            # Calculate valence similarity
            valence_sim = valence_similarity(target_t_unit.valence, candidate.valence)
            
            # Combine scores
            final_score = (semantic_sim * (1 - valence_weight)) + (valence_sim * valence_weight)
            
            suggestions.append(MemorySuggestion(
                id=candidate.id,
                content=candidate.content,
                similarity=semantic_sim,
                valence_score=valence_sim,
                final_score=final_score,
                agent_id=candidate.agent_id,
                timestamp=candidate.timestamp,
                valence=candidate.valence
            ))
            
        except Exception as e:
            logging.error(f"Error processing candidate T-unit: {e}")
            continue
    
    # Sort by final score and return top results
    suggestions.sort(key=lambda x: x.final_score, reverse=True)
    return suggestions[:limit]

# ============== AI INTEGRATION ==============

async def ai_synthesize_content(contents: List[str], valences: List[Valence], recalled_contents: List[str] = None, recalled_valences: List[Valence] = None) -> tuple[str, Valence]:
    """Use AI to intelligently synthesize content from multiple T-units with memory context"""
    try:
        # Prepare context for AI
        context = ""
        for i, (content, valence) in enumerate(zip(contents, valences)):
            context += f"T-unit {i+1}: {content}\n"
            context += f"Valence - Curiosity: {valence.curiosity:.2f}, Certainty: {valence.certainty:.2f}, Dissonance: {valence.dissonance:.2f}\n\n"
        
        # Add recalled memory context if present
        memory_context = ""
        memory_influence_style = ""
        if recalled_contents and recalled_valences:
            memory_context = "\n[RECALLED MEMORIES] The following thoughts have been recalled from memory and should influence this synthesis:\n"
            for i, (content, valence) in enumerate(zip(recalled_contents, recalled_valences)):
                memory_context += f"Memory {i+1}: {content}\n"
                memory_context += f"Memory Valence - Curiosity: {valence.curiosity:.2f}, Certainty: {valence.certainty:.2f}, Dissonance: {valence.dissonance:.2f}\n\n"
            
            # Analyze recalled valence to determine synthesis style
            avg_recalled_curiosity = sum(v.curiosity for v in recalled_valences) / len(recalled_valences)
            avg_recalled_dissonance = sum(v.dissonance for v in recalled_valences) / len(recalled_valences)
            
            if avg_recalled_curiosity > 0.7:
                memory_influence_style = "\nThe recalled memories show high curiosity - be more exploratory and speculative in your synthesis."
            elif avg_recalled_dissonance > 0.6:
                memory_influence_style = "\nThe recalled memories show high dissonance - focus on resolving tensions and finding harmony in your synthesis."
            else:
                memory_influence_style = "\nThe recalled memories provide stable context - integrate their insights naturally into your synthesis."

        prompt = f"""You are synthesizing cognitive T-units in a Cognitive Emergence Protocol. 
        
Given these current T-units:
{context}
{memory_context}

Create a new emergent T-unit that:
1. Synthesizes the core insights from all current T-units
2. {f"Integrates and builds upon the recalled memories naturally" if recalled_contents else "Represents a higher-order cognitive emergence"}
3. Maintains conceptual coherence while introducing novel perspectives
{memory_influence_style}

Respond in this exact JSON format:
{{
    "content": "Your synthesized content here",
    "valence": {{
        "curiosity": 0.X,
        "certainty": 0.X,
        "dissonance": 0.X
    }}
}}

The valence should reflect the emergent cognitive state, considering both current thoughts and recalled memories."""

        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        
        result = json.loads(response.choices[0].message.content)
        synthesized_content = result["content"]
        ai_valence = Valence(**result["valence"])
        
        return synthesized_content, ai_valence
    except Exception as e:
        logging.error(f"AI synthesis failed: {e}")
        # Fallback to simple synthesis
        return synthesize_content(contents), average_valence(valences)

async def ai_transform_content(original_content: str, original_valence: Valence, phase: str, anomaly: str, recalled_contents: List[str] = None, recalled_valences: List[Valence] = None) -> tuple[str, Valence]:
    """Use AI to intelligently transform content through cognitive phases with memory context"""
    try:
        # Build memory context if present
        memory_context = ""
        memory_influence_style = ""
        if recalled_contents and recalled_valences:
            memory_context = "\n[RECALLED MEMORIES] These memories are present in current awareness:\n"
            for i, (content, valence) in enumerate(zip(recalled_contents, recalled_valences)):
                memory_context += f"Memory {i+1}: {content}\n"
            
            # Analyze recalled valence for phase-specific influence
            avg_recalled_dissonance = sum(v.dissonance for v in recalled_valences) / len(recalled_valences)
            avg_recalled_curiosity = sum(v.curiosity for v in recalled_valences) / len(recalled_valences)
            
            if phase == "Shattering" and avg_recalled_dissonance > 0.6:
                memory_influence_style = "\nThe recalled memories show high dissonance - use them to intensify the questioning and breakdown of assumptions."
            elif phase == "Remembering" and avg_recalled_curiosity > 0.7:
                memory_influence_style = "\nThe recalled memories show high curiosity - let them guide deeper exploration of related experiences."
            elif phase == "Re-centering":
                memory_influence_style = "\nUse the recalled memories as stable reference points to help establish new cognitive grounding."
            else:
                memory_influence_style = "\nLet the recalled memories naturally inform and enrich this transformation phase."

        prompt = f"""You are processing a cognitive transformation in the Cognitive Emergence Protocol.

Original T-unit: {original_content}
Original Valence - Curiosity: {original_valence.curiosity:.2f}, Certainty: {original_valence.certainty:.2f}, Dissonance: {original_valence.dissonance:.2f}
Transformation Phase: {phase}
Anomaly: {anomaly}
{memory_context}

Transform this T-unit through the "{phase}" phase. Each phase has specific cognitive characteristics:

- Shattering: Breaking down assumptions, increasing dissonance and uncertainty
- Remembering: Recalling related experiences, increasing curiosity
- Re-feeling: Emotional processing, reducing dissonance
- Re-centering: Finding new stability, increasing certainty
- Becoming: Integration and emergence, high certainty with balanced other valences

{f"The transformation should incorporate insights from the recalled memories." if recalled_contents else ""}
{memory_influence_style}

Respond in this exact JSON format:
{{
    "content": "Your transformed content here",
    "valence": {{
        "curiosity": 0.X,
        "certainty": 0.X,
        "dissonance": 0.X
    }}
}}

The content should reflect the cognitive transformation, and valence should show how this phase affects the cognitive state."""

        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=400
        )
        
        result = json.loads(response.choices[0].message.content)
        transformed_content = result["content"]
        ai_valence = Valence(**result["valence"])
        
        return transformed_content, ai_valence
    except Exception as e:
        logging.error(f"AI transformation failed: {e}")
        # Fallback to simple transformation
        simple_content = generate_transformation_content(original_content, phase, anomaly)
        simple_valence = apply_transformation_phase(original_valence, phase)
        return simple_content, simple_valence

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
    """Synthesize content from multiple T-units (fallback)"""
    return f"SYNTHESIS: {' ⋈ '.join(contents)}"

def apply_transformation_phase(valence: Valence, phase: str) -> Valence:
    """Apply transformation phase modifications to valence (fallback)"""
    new_valence = Valence(
        curiosity=valence.curiosity,
        certainty=valence.certainty,
        dissonance=valence.dissonance
    )
    
    if phase == "Shattering":
        new_valence.dissonance = min(1.0, new_valence.dissonance + 0.2)
        new_valence.certainty = max(0.0, new_valence.certainty - 0.1)
    elif phase == "Remembering":
        new_valence.curiosity = min(1.0, new_valence.curiosity + 0.2)
    elif phase == "Re-feeling":
        new_valence.dissonance = max(0.0, new_valence.dissonance - 0.2)
    elif phase == "Re-centering":
        new_valence.certainty = min(1.0, new_valence.certainty + 0.2)
    elif phase == "Becoming":
        new_valence.certainty = min(1.0, new_valence.certainty + 0.2)
        new_valence.dissonance = max(0.0, new_valence.dissonance - 0.1)
    
    return new_valence

def generate_transformation_content(original_content: str, phase: str, anomaly: str) -> str:
    """Generate content for transformation phase (fallback)"""
    return f"{phase.upper()}: {original_content} [ANOMALY: {anomaly}]"

# ============== ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "CEP-Web API - Advanced Cognitive Emergence Protocol"}

@api_router.post("/t-units", response_model=TUnit)
async def create_t_unit(t_unit: TUnitCreate):
    """Create a new T-unit"""
    new_t_unit = TUnit(**t_unit.dict())
    
    # Generate embedding for the new T-unit
    embedding = await generate_embedding(new_t_unit.content)
    if embedding:
        new_t_unit.embedding = embedding
        new_t_unit.embedding_model = "text-embedding-ada-002"
    
    await db.t_units.insert_one(new_t_unit.dict())
    return new_t_unit

@api_router.get("/t-units", response_model=List[TUnit])
async def get_t_units(agent_id: Optional[str] = None):
    """Get all T-units, optionally filtered by agent"""
    query = {"agent_id": agent_id} if agent_id else {}
    t_units = await db.t_units.find(query).to_list(1000)
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
    """Synthesize T-units into a new T-unit with AI enhancement and memory awareness"""
    # Get the T-units to synthesize
    t_units = []
    for t_unit_id in request.t_unit_ids:
        t_unit_doc = await db.t_units.find_one({"id": t_unit_id})
        if t_unit_doc:
            t_units.append(TUnit(**t_unit_doc))
    
    if len(t_units) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 T-units for synthesis")
    
    # Get recalled T-units if any
    recalled_t_units = []
    for recalled_id in request.recalled_ids:
        recalled_doc = await db.t_units.find_one({"id": recalled_id})
        if recalled_doc:
            recalled_t_units.append(TUnit(**recalled_doc))
    
    # Prepare data for synthesis
    contents = [t.content for t in t_units]
    valences = [t.valence for t in t_units]
    recalled_contents = [t.content for t in recalled_t_units] if recalled_t_units else None
    recalled_valences = [t.valence for t in recalled_t_units] if recalled_t_units else None
    
    if request.use_ai:
        synthesized_content, synthesized_valence = await ai_synthesize_content(
            contents, valences, recalled_contents, recalled_valences
        )
        ai_generated = True
    else:
        synthesized_content = synthesize_content(contents)
        synthesized_valence = average_valence(valences)
        ai_generated = False
    
    new_t_unit = TUnit(
        content=synthesized_content,
        valence=synthesized_valence,
        parents=request.t_unit_ids,
        linkage="generative",
        agent_id=t_units[0].agent_id,
        ai_generated=ai_generated
    )
    
    # Generate embedding for the new T-unit
    embedding = await generate_embedding(new_t_unit.content)
    if embedding:
        new_t_unit.embedding = embedding
        new_t_unit.embedding_model = "text-embedding-ada-002"
    
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
        metadata={
            "parent_ids": request.t_unit_ids,
            "ai_generated": ai_generated,
            "memory_influenced": len(request.recalled_ids) > 0,
            "recalled_count": len(request.recalled_ids),
            "recalled_ids": request.recalled_ids
        },
        agent_id=t_units[0].agent_id
    )
    await db.events.insert_one(event.dict())
    
    return new_t_unit

@api_router.post("/transform", response_model=List[TUnit])
async def transform_t_unit(request: TransformationRequest):
    """Transform a T-unit through the 5-phase transformation loop with AI enhancement and memory awareness"""
    # Get the original T-unit
    t_unit_doc = await db.t_units.find_one({"id": request.t_unit_id})
    if not t_unit_doc:
        raise HTTPException(status_code=404, detail="T-unit not found")
    
    original_t_unit = TUnit(**t_unit_doc)
    
    # Get recalled T-units if any
    recalled_t_units = []
    for recalled_id in request.recalled_ids:
        recalled_doc = await db.t_units.find_one({"id": recalled_id})
        if recalled_doc:
            recalled_t_units.append(TUnit(**recalled_doc))
    
    recalled_contents = [t.content for t in recalled_t_units] if recalled_t_units else None
    recalled_valences = [t.valence for t in recalled_t_units] if recalled_t_units else None
    
    # 5 phases of transformation
    phases = ["Shattering", "Remembering", "Re-feeling", "Re-centering", "Becoming"]
    new_t_units = []
    
    for phase in phases:
        if request.use_ai:
            phase_content, phase_valence = await ai_transform_content(
                original_t_unit.content, 
                original_t_unit.valence, 
                phase, 
                request.anomaly,
                recalled_contents,
                recalled_valences
            )
            ai_generated = True
        else:
            phase_content = generate_transformation_content(original_t_unit.content, phase, request.anomaly)
            phase_valence = apply_transformation_phase(original_t_unit.valence, phase)
            ai_generated = False
        
        # Create new T-unit for this phase
        phase_t_unit = TUnit(
            content=phase_content,
            valence=phase_valence,
            parents=[request.t_unit_id],
            linkage="transformational",
            phase=phase,
            agent_id=original_t_unit.agent_id,
            ai_generated=ai_generated
        )
        
        # Generate embedding for the phase T-unit
        embedding = await generate_embedding(phase_t_unit.content)
        if embedding:
            phase_t_unit.embedding = embedding
            phase_t_unit.embedding_model = "text-embedding-ada-002"
        
        new_t_units.append(phase_t_unit)
        
        # Save to database
        await db.t_units.insert_one(phase_t_unit.dict())
        
        # Log transformation event
        event = Event(
            type="transformation",
            t_unit_id=phase_t_unit.id,
            metadata={
                "phase": phase, 
                "parent_id": request.t_unit_id, 
                "anomaly": request.anomaly, 
                "ai_generated": ai_generated,
                "memory_influenced": len(request.recalled_ids) > 0,
                "recalled_count": len(request.recalled_ids),
                "recalled_ids": request.recalled_ids
            },
            agent_id=original_t_unit.agent_id
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
async def get_events(agent_id: Optional[str] = None):
    """Get all events, optionally filtered by agent"""
    query = {"agent_id": agent_id} if agent_id else {}
    events = await db.events.find(query).sort("timestamp", -1).to_list(1000)
    return [Event(**event) for event in events]

@api_router.get("/agents", response_model=List[AgentInfo])
async def get_agents():
    """Get all agents"""
    agents = await db.agents.find().to_list(1000)
    return [AgentInfo(**agent) for agent in agents]

@api_router.get("/agents/stats")
async def get_agents_with_stats():
    """Get all agents with statistics"""
    agents = await db.agents.find().to_list(1000)
    
    # Get stats for each agent
    agents_with_stats = []
    for agent_doc in agents:
        agent = AgentInfo(**agent_doc)
        
        # Count thoughts created by this agent
        thought_count = await db.t_units.count_documents({"agent_id": agent.id})
        
        # Get last activity (most recent T-unit)
        last_t_unit = await db.t_units.find({"agent_id": agent.id}).sort("timestamp", -1).limit(1).to_list(1)
        last_activity = last_t_unit[0]["timestamp"] if last_t_unit else agent.created_at
        
        agent_stats = {
            **agent.dict(),
            "thought_count": thought_count,
            "last_activity": last_activity
        }
        agents_with_stats.append(agent_stats)
    
    return agents_with_stats

@api_router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, agent_update: dict):
    """Update an agent (for rename, avatar, color changes)"""
    result = await db.agents.update_one(
        {"id": agent_id},
        {"$set": agent_update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    updated_agent = await db.agents.find_one({"id": agent_id})
    return AgentInfo(**updated_agent)

@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    # Check if agent has any T-units
    t_unit_count = await db.t_units.count_documents({"agent_id": agent_id})
    if t_unit_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete agent: has {t_unit_count} associated thoughts. Delete thoughts first or reassign them."
        )
    
    result = await db.agents.delete_one({"id": agent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {"message": "Agent deleted successfully"}

@api_router.post("/agents", response_model=AgentInfo)
async def create_agent(agent: AgentInfo):
    """Create a new agent"""
    await db.agents.insert_one(agent.dict())
    return agent

@api_router.post("/memory/suggest", response_model=List[MemorySuggestion])
async def suggest_memories(request: MemorySuggestRequest):
    """Find semantically similar T-units from memory"""
    # Get the target T-unit
    t_unit_doc = await db.t_units.find_one({"id": request.t_unit_id})
    if not t_unit_doc:
        raise HTTPException(status_code=404, detail="T-unit not found")
    
    target_t_unit = TUnit(**t_unit_doc)
    
    # Find memory suggestions
    suggestions = await find_memory_suggestions(
        target_t_unit=target_t_unit,
        agent_id=request.agent_id,
        limit=request.limit,
        include_cross_agent=request.include_cross_agent,
        valence_weight=request.valence_weight
    )
    
    # Log memory suggestion event
    event = Event(
        type="memory_suggestion",
        t_unit_id=request.t_unit_id,
        metadata={
            "suggestions_count": len(suggestions),
            "include_cross_agent": request.include_cross_agent,
            "valence_weight": request.valence_weight
        },
        agent_id=request.agent_id
    )
    await db.events.insert_one(event.dict())
    
    return suggestions

@api_router.post("/multi-agent/exchange")
async def multi_agent_exchange(exchange: MultiAgentExchange):
    """Exchange T-units between agents"""
    # Get the T-unit to exchange
    t_unit_doc = await db.t_units.find_one({"id": exchange.t_unit_id})
    if not t_unit_doc:
        raise HTTPException(status_code=404, detail="T-unit not found")
    
    original_t_unit = TUnit(**t_unit_doc)
    
    # Create a copy for the target agent
    exchanged_t_unit = TUnit(
        content=f"[RECEIVED] {original_t_unit.content}",
        valence=original_t_unit.valence,
        parents=[original_t_unit.id],
        linkage="exchanged",
        agent_id=exchange.target_agent_id
    )
    
    await db.t_units.insert_one(exchanged_t_unit.dict())
    
    # Log exchange event
    event = Event(
        type="multi_agent_exchange",
        t_unit_id=exchanged_t_unit.id,
        metadata={
            "source_agent": exchange.source_agent_id,
            "target_agent": exchange.target_agent_id,
            "original_t_unit": exchange.t_unit_id,
            "exchange_type": exchange.exchange_type
        },
        agent_id=exchange.target_agent_id
    )
    await db.events.insert_one(event.dict())
    
    return {"message": "T-unit exchanged successfully", "new_t_unit_id": exchanged_t_unit.id}

@api_router.post("/genesis/import")
async def import_genesis_log(file: UploadFile = File(...)):
    """Import genesis log data from file"""
    try:
        contents = await file.read()
        genesis_data = json.loads(contents)
        
        # Clear existing data
        await db.t_units.delete_many({})
        await db.events.delete_many({})
        await db.agents.delete_many({})
        
        # Import agents
        if "agents" in genesis_data:
            for agent_data in genesis_data["agents"]:
                agent = AgentInfo(**agent_data)
                await db.agents.insert_one(agent.dict())
        
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import genesis log: {str(e)}")

@api_router.get("/genesis/export")
async def export_genesis_log():
    """Export current state as genesis log"""
    t_units = await db.t_units.find().to_list(1000)
    events = await db.events.find().to_list(1000)
    agents = await db.agents.find().to_list(1000)
    
    # Convert to serializable format
    genesis_data = {
        "t_units": [TUnit(**t_unit).dict() for t_unit in t_units],
        "events": [Event(**event).dict() for event in events],
        "agents": [AgentInfo(**agent).dict() for agent in agents],
        "exported_at": datetime.utcnow().isoformat(),
        "version": "2.0"
    }
    
    return JSONResponse(
        content=genesis_data,
        headers={"Content-Disposition": "attachment; filename=genesis_log.json"}
    )

@api_router.get("/analytics/valence-distribution")
async def get_valence_distribution():
    """Get valence distribution for visualization"""
    t_units = await db.t_units.find().to_list(1000)
    
    if not t_units:
        return {"curiosity": [], "certainty": [], "dissonance": []}
    
    valence_data = {
        "curiosity": [t["valence"]["curiosity"] for t in t_units],
        "certainty": [t["valence"]["certainty"] for t in t_units],
        "dissonance": [t["valence"]["dissonance"] for t in t_units]
    }
    
    return valence_data

@api_router.get("/analytics/cognitive-timeline")
async def get_cognitive_timeline():
    """Get cognitive evolution timeline"""
    events = await db.events.find().sort("timestamp", 1).to_list(1000)
    
    timeline_data = []
    for event in events:
        timeline_data.append({
            "timestamp": event["timestamp"],
            "type": event["type"],
            "t_unit_id": event["t_unit_id"],
            "metadata": event.get("metadata", {}),
            "agent_id": event.get("agent_id", "default")
        })
    
    return timeline_data

# Initialize with enhanced sample data
@api_router.post("/init-sample-data")
async def init_sample_data():
    """Initialize with enhanced sample T-units and agents"""
    # Clear existing data
    await db.t_units.delete_many({})
    await db.events.delete_many({})
    await db.agents.delete_many({})
    
    # Create sample agents
    sample_agents = [
        AgentInfo(
            id="agent_alpha",
            name="Agent Alpha",
            description="Primary cognitive agent focused on recursive thinking"
        ),
        AgentInfo(
            id="agent_beta",
            name="Agent Beta", 
            description="Secondary cognitive agent focused on synthesis and emergence"
        )
    ]
    
    for agent in sample_agents:
        await db.agents.insert_one(agent.dict())
    
    # Create sample T-units
    sample_t_units = [
        TUnit(
            content="The nature of consciousness is recursive",
            valence=Valence(curiosity=0.8, certainty=0.3, dissonance=0.6),
            linkage="foundational",
            agent_id="agent_alpha"
        ),
        TUnit(
            content="Thoughts emerge from the interaction of simpler units",
            valence=Valence(curiosity=0.7, certainty=0.5, dissonance=0.2),
            linkage="generative",
            agent_id="agent_alpha"
        ),
        TUnit(
            content="Cognitive dissonance drives transformation",
            valence=Valence(curiosity=0.6, certainty=0.4, dissonance=0.9),
            linkage="transformational",
            agent_id="agent_beta"
        ),
        TUnit(
            content="Understanding emerges through synthesis",
            valence=Valence(curiosity=0.9, certainty=0.7, dissonance=0.1),
            linkage="synthetic",
            agent_id="agent_beta"
        ),
        TUnit(
            content="Intelligence is the pattern that connects",
            valence=Valence(curiosity=0.85, certainty=0.6, dissonance=0.3),
            linkage="integrative",
            agent_id="agent_alpha"
        )
    ]
    
    for t_unit in sample_t_units:
        await db.t_units.insert_one(t_unit.dict())
    
    return {"message": "Enhanced sample data initialized", "t_units": len(sample_t_units), "agents": len(sample_agents)}

@api_router.delete("/reset-world")
async def reset_world():
    """Reset the entire world by clearing all data"""
    try:
        # Clear all collections
        await db.t_units.delete_many({})
        await db.events.delete_many({})
        await db.agents.delete_many({})
        
        return {"message": "World reset successfully", "cleared": ["t_units", "events", "agents"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset world: {str(e)}")

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