# 🧠 CEP-Web: Advanced Cognitive Emergence Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.1-green.svg)](https://fastapi.tiangolo.com/)

**A sophisticated AI-powered platform for visualizing cognitive emergence, thought evolution, and consciousness modeling through interactive graph networks with semantic memory and multi-agent intelligence.**

CEP-Web transforms abstract cognitive processes into living, interactive visualizations where thoughts (T-units) evolve, synthesize, and transform through AI-enhanced operations with intelligent memory recall and multi-agent collaboration.

## ✨ Core Features

### 🎯 **Intuitive User Experience**
- **🔘 Auto-Generation Toggle**: Control automatic sample data loading - no more overwhelming data on startup
- **🌍 Reset World**: Instantly clear all data with beautiful confirmation dialogs for fresh starts
- **✨ Create Thought**: Manual thought input with advanced valence sliders for precise emotional fingerprinting
- **🧠 Tree Layout**: Clean hierarchical visualization showing cognitive lineage and evolution
- **💭 Floating Memory Panel**: Elegant overlay showing semantic memory suggestions above the canvas

### 🤖 AI-Powered Cognitive Operations
- **GPT-4 Enhanced Synthesis**: Intelligent combination of multiple T-units into coherent emergent thoughts
- **AI-Driven Transformation**: Context-aware evolution through 5 cognitive phases (Shattering, Remembering, Re-feeling, Re-centering, Becoming)
- **Memory-Influenced Processing**: Past insights actively shape new cognitive operations through semantic recall
- **Smart Valence Analysis**: AI-generated emotional/cognitive states with dynamic adaptation

### 🧠 Semantic Memory System
- **OpenAI Embeddings**: Automatic semantic similarity detection using text-embedding-ada-002
- **Interactive Memory Suggestions**: Beautiful floating panel with real-time recall suggestions and similarity scores
- **One-Click Memory Recall**: Seamlessly integrate past thoughts into current cognitive operations
- **Cross-Agent Memory**: Optional memory sharing between different cognitive agents
- **Valence-Driven Memory**: Emotional resonance influences memory retrieval and integration

### 🌐 Multi-Agent Cognitive Networks
- **Dynamic Agent Creation**: Create specialized cognitive agents with custom names and descriptions
- **Agent Attribution**: Visual tracking of which agent created each thought with color-coded badges
- **Cross-Agent Exchange**: Share thoughts between different cognitive agents
- **Cognitive Specialization**: Agents develop unique thinking patterns and expertise over time
- **Agent Filtering**: View cognitive networks by specific agent or all agents

### 🎨 Advanced Visualizations
- **Interactive Tree Layout**: Hierarchical graph showing parent-child cognitive relationships
- **Manual Node Positioning**: Drag nodes to custom positions - they stay put when clicking others
- **Valence-Based Coloring**: Nodes colored by dominant emotional/cognitive state
- **Tab-Style Node Badges**: Clean visual indicators for AI generation, agent attribution, phases, and recall status
- **Real-time Memory Panel**: Floating overlay with staggered animations and gradient styling
- **Cognitive Timeline**: Track synthesis and transformation events over time

### 📊 State Management & Persistence
- **Genesis Log Export/Import**: Save and restore complete cognitive sessions as JSON
- **Real-time State Synchronization**: Live updates across all visualizations  
- **Memory Event Tracking**: Complete audit trail of memory-influenced operations
- **Cross-Session Continuity**: Resume cognitive modeling from previous states
- **Reset World**: Complete data reset with confirmation for fresh starts
- **Auto-Save Preferences**: Remember user settings like auto-generation toggle

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, React Flow, D3.js, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, Python 3.11+, OpenAI GPT-4 API  
- **Database**: MongoDB with Motor async driver
- **Visualization**: React Flow (interactive graphs), D3.js (charts), Recharts (analytics)
- **AI Integration**: OpenAI GPT-4 for content generation and text-embedding-ada-002 for semantic similarity
- **UI/UX**: Custom modals for sandboxed environments, advanced valence sliders, floating panels

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │   MongoDB Store │
│                 │    │                 │    │                 │
│ • Tree Layout   │◄──►│ • T-unit CRUD   │◄──►│ • T-units       │
│ • Memory Panel  │    │ • AI Operations │    │ • Events        │
│ • Custom Modals │    │ • Memory System │    │ • Agents        │
│ • Valence UI    │    │ • Multi-Agent   │    │ • Embeddings    │
│ • Manual Input  │    │ • Reset World   │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   OpenAI APIs   │
                    │                 │
                    │ • GPT-4         │
                    │ • Embeddings    │
                    │ • Memory        │
                    └─────────────────┘
```

### Key Design Principles
- **Sandboxed Environment Support**: Custom React modals instead of browser alerts/confirms
- **Position Preservation**: Manual node positioning persists across interactions
- **Memory-First Design**: Semantic memory is central to all cognitive operations
- **Intuitive UX**: Clean, discoverable interface with helpful defaults
- **Tree Structure**: Hierarchical layout reveals cognitive lineage clearly

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 4.4+
- OpenAI API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/cep-web.git
cd cep-web
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=cep_database
OPENAI_API_KEY=your_openai_api_key_here
EOF
```

3. **Frontend Setup**
```bash
cd ../frontend
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

4. **Start MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use local MongoDB installation
mongod
```

5. **Run the Application**
```bash
# Terminal 1: Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2: Frontend
cd frontend
yarn start
```

6. **First-Time Setup**
Navigate to `http://localhost:3000` and:
- **Optional**: Enable "Auto-generate on load" checkbox for sample data
- **Or**: Click "Initialize Sample Data" manually to populate with examples  
- **Or**: Click "✨ Create Thought" to start with your own thoughts

## 📖 Usage Guide

### Getting Started

#### First Steps
1. **🌍 Fresh Start**: The app starts clean by default - no overwhelming data explosion
2. **✨ Create Your First Thought**: Click "Create Thought" and enter your own ideas with custom valence settings
3. **🔄 Sample Data**: Click "Initialize Sample Data" if you want to explore with examples
4. **💭 Explore Memory**: Select any single thought to see related memory suggestions in the floating panel

#### Core Interface
- **Auto-Generation Toggle**: Check this if you want sample data on every reload (default: off)
- **Reset World**: Red button to completely clear everything and start fresh  
- **Create Thought**: Green button to manually add thoughts with precise emotional settings
- **Tree Layout**: Thoughts appear in a clean hierarchy showing cognitive evolution
- **Memory Panel**: Floats in top-right when you select a single thought node

### Core Concepts

#### T-units (Thought Units)
The fundamental cognitive building blocks. Each T-unit contains:
- **Content**: The thought or idea text
- **Valence**: Emotional/cognitive fingerprinting
  - *Curiosity* (0-1): Drive to explore and understand (Green)
  - *Certainty* (0-1): Confidence in the thought's validity (Blue)  
  - *Dissonance* (0-1): Cognitive tension or conflict (Red)
- **Relationships**: Parent-child connections showing cognitive lineage
- **Agent Attribution**: Which cognitive agent created it
- **Memory Embedding**: Semantic vector for similarity detection

#### Visual Elements
- **Node Colors**: Based on dominant valence (red=dissonance, green=curiosity, light green=certainty)
- **Tab Badges**: Clean indicators for AI generation, agent ID, transformation phases, memory recall
- **Tree Structure**: Hierarchical layout showing thought evolution from parents to children
- **Drag & Drop**: Move nodes manually - they stay where you put them
- **Memory Panel**: Beautiful floating overlay with gradient styling and animations

#### Cognitive Operations

##### Synthesis
Combines multiple T-units into emergent thoughts:
1. **Select 2+ thoughts** by clicking graph nodes
2. **Review memory suggestions** that appear in floating panel  
3. **Recall memories** by clicking "Recall" buttons (optional)
4. **Choose AI enhancement** toggle
5. **Click "Synthesis"** to combine selected thoughts + memories
6. **Watch new thought appear** connected to its parents in the tree

**Example AI Synthesis with Memory:**
```
Selected T-units:
- "The nature of consciousness is recursive"
- "Thoughts emerge from simpler units" 

Recalled Memory:
- "Intelligence is the pattern that connects"

AI Output:
"Consciousness emerges as a recursive pattern-recognition system, 
where intelligence connects disparate cognitive units into coherent 
thought structures that continuously reference and build upon themselves."
```

##### Transformation
Processes single thoughts through 5 cognitive phases:
1. **Select exactly 1 T-unit**
2. **Enter anomaly description** (cognitive conflict or question)
3. **Optionally recall memories** for context
4. **Execute transformation** to create 5 connected phase nodes:
   - **Shattering**: Breaking down assumptions (↑ dissonance, red nodes)
   - **Remembering**: Recalling related experiences (↑ curiosity, green nodes)  
   - **Re-feeling**: Emotional processing (↓ dissonance)
   - **Re-centering**: Finding new stability (↑ certainty, blue nodes)
   - **Becoming**: Integration and emergence (balanced valence)

##### Memory System
- **Automatic Suggestions**: Selecting 1 node triggers beautiful floating memory panel
- **Semantic Similarity**: Uses OpenAI embeddings for intelligent matching
- **Similarity Scores**: Shows percentage match for semantic and valence similarity
- **One-Click Recall**: Click "Recall" to add memories to current selection
- **Memory Influence**: Recalled thoughts actively shape AI synthesis and transformation
- **Cross-Agent Memory**: Toggle to include memories from other agents

### Manual Thought Creation

The "✨ Create Thought" feature provides advanced control:

#### Content & Agent
- **Thought Content**: Large textarea for your ideas
- **Agent Selection**: Choose which cognitive agent creates this thought

#### Valence Sliders (Emotional Fingerprinting)
- **🧠 Curiosity (Green)**: How much this thought drives exploration (default: 0.6)
- **🎯 Certainty (Blue)**: How confident/stable this thought feels (default: 0.4)  
- **⚡ Dissonance (Red)**: How much cognitive tension/conflict (default: 0.2)

**Valence Tips:**
- High curiosity → Green nodes, drives further exploration
- High certainty → Light green nodes, stable foundations  
- High dissonance → Red nodes, needs transformation/resolution
- Balanced valence → Yellow nodes, neutral cognitive state

### Multi-Agent Modeling
- **Agent Alpha**: Default agent focused on recursive thinking patterns
- **Agent Beta**: Specialized in synthesis and emergence
- **Create New Agents**: Add agents with custom names and descriptions
- **Agent Exchange**: Share thoughts between agents via "Send to Agent" feature
- **Agent Filtering**: View cognitive networks by specific agent

### Analytics & Visualization
- **Graph Tab**: Interactive tree layout showing cognitive hierarchy
- **Analytics Tab**: Valence distributions and comprehensive statistics
- **Timeline Tab**: Cognitive evolution and event history over time
- **Memory Panel**: Context-aware memory suggestions with similarity scores

## 🔌 API Reference

#### Core Endpoints

#### T-units
```http
GET    /api/t-units              # Get all T-units (with optional agent filter)
POST   /api/t-units              # Create new T-unit with valence
GET    /api/t-units/{id}         # Get specific T-unit
```

#### Cognitive Operations
```http
POST   /api/synthesize           # Combine T-units with AI and memory influence
POST   /api/transform            # Transform T-unit through phases with memory
```

#### Memory System
```http
POST   /api/memory/suggest       # Get semantic memory suggestions with similarity scores
```

#### Multi-Agent
```http
GET    /api/agents               # Get all agents
POST   /api/agents               # Create new agent with custom name/description
POST   /api/multi-agent/exchange # Exchange T-units between agents
```

#### State Management
```http
GET    /api/genesis/export       # Export complete state as JSON
POST   /api/genesis/import       # Import state from file
DELETE /api/reset-world          # Clear all data (with confirmation)
```

#### Analytics
```http
GET    /api/analytics/valence-distribution  # Valence statistics
GET    /api/analytics/cognitive-timeline    # Event timeline
```

### Request Examples

**Manual Thought Creation:**
```json
POST /api/t-units
{
  "content": "Consciousness might be a recursive pattern-recognition system",
  "valence": {
    "curiosity": 0.8,
    "certainty": 0.3,
    "dissonance": 0.6
  },
  "agent_id": "agent_alpha",
  "linkage": "manual"
}
```

**Memory-Influenced AI Synthesis:**
```json
POST /api/synthesize
{
  "t_unit_ids": ["id1", "id2", "id3"],
  "recalled_ids": ["recalled_memory_id"], 
  "use_ai": true
}
```

**Semantic Memory Suggestions:**
```json
POST /api/memory/suggest
{
  "agent_id": "agent_alpha",
  "t_unit_id": "current_thought_id",
  "limit": 8,
  "include_cross_agent": false,
  "valence_weight": 0.25
}
```

## 🧪 Cognitive Modeling Concepts

### Valence Dynamics
Valence values drive the visual representation and cognitive behavior:
- **High Dissonance** (red): Cognitive conflict requiring resolution
- **High Curiosity** (green): Active exploration and learning  
- **High Certainty** (light green): Stable, confident beliefs
- **Mixed States**: Complex cognitive states with multiple dominant valences

### Memory Architecture
The semantic memory system enables:
- **Temporal Continuity**: Past insights resurface intelligently
- **Pattern Recognition**: Related thoughts cluster naturally
- **Recursive Deepening**: Explored concepts develop over time
- **Cross-Agent Learning**: Memories can influence different cognitive perspectives

### Multi-Agent Cognition
Different agents represent distinct cognitive patterns:
- **Specialized Thinking**: Each agent develops unique cognitive signatures
- **Collaborative Intelligence**: Cross-agent thought exchange creates collective insights
- **Emergent Behavior**: Complex cognition arises from agent interactions
- **Cognitive Diversity**: Multiple perspectives enhance problem-solving

## 🛠️ Development

### Project Structure
```
cep-web/
├── backend/
│   ├── server.py              # FastAPI application with AI integration
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component with memory system
│   │   ├── App.css           # Styles and animations
│   │   └── index.js          # React entry point
│   ├── package.json          # Node dependencies
│   └── .env                  # Frontend environment
└── README.md                 # This file
```

### Environment Variables

**Backend (.env):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=cep_database  
OPENAI_API_KEY=your_openai_api_key_here
```

**Frontend (.env):**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Key Dependencies

**Backend:**
- `fastapi` - Modern Python web framework
- `motor` - Async MongoDB driver
- `openai` - OpenAI API client for GPT-4 and embeddings
- `numpy` - Vector operations for similarity calculations
- `pydantic` - Data validation and settings management

**Frontend:**
- `@xyflow/react` - Interactive graph visualization
- `d3` - Data visualization and charts
- `framer-motion` - Smooth animations and transitions
- `axios` - HTTP client for API communication
- `recharts` - Analytics dashboard components

## 📚 Research Applications

CEP-Web is designed for researchers studying:
- **Cognitive Science**: Model thought processes and cognitive emergence patterns
- **AI-Human Interaction**: Study how AI enhancement affects cognition and creativity
- **Complex Systems**: Analyze emergent behavior in cognitive networks
- **Memory Research**: Explore semantic memory, recall patterns, and temporal cognition
- **Multi-Agent Systems**: Investigate collaborative intelligence and distributed cognition
- **Philosophy of Mind**: Explore consciousness, recursive thinking, and cognitive recursion

## 🔬 Example Research Questions
- How does AI enhancement affect cognitive synthesis patterns and creative emergence?
- What valence configurations lead to stable vs. transformative cognitive states?
- How do multi-agent cognitive networks develop emergent collective intelligence?
- Can semantic memory influence model real therapeutic cognitive processes?
- What patterns emerge in cross-agent thought exchange and collaboration?
- How does memory recall timing affect cognitive transformation outcomes?

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-cognitive-feature`)
3. Commit your changes (`git commit -m 'Add revolutionary cognitive modeling capability'`)
4. Push to the branch (`git push origin feature/amazing-cognitive-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint configuration for JavaScript/React
- Add tests for new cognitive operations
- Update documentation for API changes
- Ensure AI integrations handle errors gracefully
- Test memory system performance with large datasets

## 🎯 Deployment

### Docker Support (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Set up MongoDB instance
2. Configure environment variables for production
3. Build frontend: `yarn build`
4. Deploy FastAPI backend with gunicorn
5. Serve frontend with nginx or similar

### Environment Configuration
- Update `REACT_APP_BACKEND_URL` for production backend
- Secure OpenAI API key storage
- Configure MongoDB connection for production
- Set up proper CORS policies

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 API and embeddings enabling intelligent cognitive modeling
- **React Flow** team for excellent graph visualization capabilities
- **D3.js** community for powerful data visualization tools
- **FastAPI** for elegant Python API development
- **MongoDB** for flexible cognitive data storage
- **Cognitive Science Community** for inspiration and theoretical foundations

## 📞 Support

For questions, issues, or research collaborations:
- Open an issue on GitHub
- Documentation: Check the Wiki for detailed guides
- Community: Join discussions in the Discussions tab

---

**CEP-Web: Where Artificial Intelligence Meets Cognitive Science** 🧠✨

*Transforming the invisible processes of thought into interactive, visual experiences that reveal the deep structures of consciousness, memory, and recursive cognition through AI-enhanced collaborative intelligence.*

## 🌟 Recent Updates (Version 2.1)

### 🎯 **Phase 1: Core UX Improvements (Latest)**
- **🔘 Auto-Generation Toggle**: No more data explosion on load - clean start by default
- **🌍 Reset World Button**: Complete data reset with beautiful confirmation modals  
- **✨ Advanced Thought Creation**: Manual input with precise valence sliders and agent selection
- **🖱️ Manual Node Positioning**: Drag nodes to custom positions - they stay put across interactions
- **💭 Floating Memory Panel**: Beautiful top-right overlay with gradient styling and animations
- **🔧 Sandboxed Environment Support**: Custom React modals replace browser alerts/confirms

### 🧠 **Memory & AI Enhancements**
- **Semantic Memory System**: Complete integration with OpenAI embeddings for intelligent recall
- **Memory-Influenced Operations**: Past thoughts actively shape new cognitive processes  
- **Tree Layout Visualization**: Clean hierarchical structure showing cognitive lineage
- **Multi-Agent Networks**: Full agent creation, exchange, and filtering capabilities

### 🎨 **Visual & UX Polish**
- **Tab-Style Node Badges**: Clean indicators for AI, agent, phase, and recall status
- **Custom Valence Sliders**: Color-coded sliders with real-time feedback and beautiful styling
- **Staggered Animations**: Memory suggestions appear with elegant timing and motion
- **Position Preservation**: Manual node positioning persists across all interactions

**Version**: 2.1 - Advanced Cognitive Emergence with Intuitive UX