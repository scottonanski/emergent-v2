# 🧠 CEP-Web: Advanced Cognitive Emergence Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.1-green.svg)](https://fastapi.tiangolo.com/)

**A sophisticated AI-powered cognitive modeling platform that visualizes thought emergence, synthesis, and transformation through interactive graph networks.**

CEP-Web transforms abstract cognitive processes into living, visual representations where thoughts (T-units) evolve, combine, and transform through valence-driven interactions enhanced by GPT-4 intelligence.

![CEP-Web Demo](https://via.placeholder.com/800x400/51cf66/FFFFFF?text=Interactive+Cognitive+Graph+Visualization)

## ✨ Features

### 🤖 AI-Powered Cognitive Operations
- **GPT-4 Enhanced Synthesis**: Intelligent combination of multiple T-units into coherent emergent thoughts
- **AI-Driven Transformation**: Context-aware evolution through 5 cognitive phases (Shattering, Remembering, Re-feeling, Re-centering, Becoming)
- **Smart Valence Analysis**: AI-generated valence states reflecting curiosity, certainty, and dissonance
- **Cognitive Anomaly Processing**: Dynamic response to cognitive conflicts and inconsistencies

### 🎨 Advanced Visualizations
- **Interactive Graph Network**: React Flow-powered visualization with valence-based node coloring
- **Valence Radar Charts**: D3.js radar charts showing cognitive state distributions
- **Cognitive Timeline**: Track synthesis and transformation events over time
- **Multi-dimensional Analytics**: Statistics on AI generation, agent activities, and cognitive patterns

### 🌐 Multi-Agent Cognitive Networks
- **Agent-Based Modeling**: Multiple cognitive agents with distinct thinking patterns
- **Cross-Agent Communication**: T-unit exchange and anomaly sharing between agents
- **Agent Attribution**: Visual badges showing which agent created each thought
- **Cognitive Specialization**: Agents focused on different cognitive processes (recursion, synthesis, etc.)

### 📊 State Management & Persistence
- **Genesis Log Export/Import**: Save and restore complete cognitive sessions
- **Real-time State Synchronization**: Live updates across all visualizations
- **Version Control**: Track cognitive evolution with timestamped events
- **Cross-Session Continuity**: Resume cognitive modeling from previous states

### 🎯 Interactive Experience
- **Node Selection & Manipulation**: Click to select T-units for operations
- **Smooth Animations**: Framer Motion-powered transitions and interactions
- **Responsive Design**: Optimized for desktop and tablet experiences
- **Contextual Tooltips**: Detailed T-unit information on hover

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, React Flow, D3.js, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, Python 3.11+, OpenAI GPT-4 API
- **Database**: MongoDB with Motor async driver
- **Visualization**: React Flow (graphs), D3.js (charts), Recharts (analytics)
- **AI Integration**: OpenAI GPT-4 for content generation and analysis

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │   MongoDB Store │
│                 │    │                 │    │                 │
│ • Graph Vis     │◄──►│ • T-unit CRUD   │◄──►│ • T-units       │
│ • Analytics     │    │ • AI Operations │    │ • Events        │
│ • Timeline      │    │ • Multi-Agent   │    │ • Agents        │
│ • Controls      │    │ • Analytics     │    │ • Genesis Logs  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   OpenAI GPT-4  │
                    │                 │
                    │ • Synthesis     │
                    │ • Transformation│
                    │ • Content Gen   │
                    └─────────────────┘
```

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
echo "MONGO_URL=mongodb://localhost:27017" >> .env
echo "DB_NAME=cep_database" >> .env
echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env
```

3. **Frontend Setup**
```bash
cd ../frontend
yarn install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" >> .env
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

6. **Initialize Sample Data**
Navigate to `http://localhost:3000` and click "Initialize Sample Data" to populate the system with example T-units and agents.

## 📖 Usage Guide

### Basic Operations

#### Creating T-units
T-units are the fundamental cognitive building blocks. Each T-unit contains:
- **Content**: The thought or idea text
- **Valence**: Curiosity (exploration drive), Certainty (confidence), Dissonance (cognitive tension)
- **Linkage**: Relationship type (generative, transformational, synthetic, etc.)
- **Agent Attribution**: Which cognitive agent created it

#### Synthesis Operations
1. Select 2+ T-units by clicking on graph nodes
2. Toggle AI enhancement on/off
3. Click "Synthesis" to combine selected thoughts
4. Watch as GPT-4 creates coherent emergent content

**Example AI Synthesis:**
```
Input T-units:
- "The nature of consciousness is recursive"
- "Thoughts emerge from simpler units"
- "Cognitive dissonance drives transformation"

AI Output:
"Consciousness, a recursive phenomenon, is shaped by the emergence 
of complex thoughts from simpler units, driven and transformed by 
the cognitive dissonance inherent in this process."
```

#### Transformation Loops
1. Select exactly 1 T-unit
2. Enter an anomaly description (cognitive conflict)
3. Execute transformation to create 5 new T-units representing:
   - **Shattering**: Breaking down assumptions
   - **Remembering**: Recalling related experiences
   - **Re-feeling**: Emotional processing
   - **Re-centering**: Finding new stability
   - **Becoming**: Integration and emergence

### Multi-Agent Modeling
- **Agent Alpha**: Focuses on recursive thinking patterns
- **Agent Beta**: Specializes in synthesis and emergence
- Create additional agents via the API
- Watch agents exchange T-units and anomalies

### Analytics & Visualization
- **Graph Tab**: Interactive node-edge visualization
- **Analytics Tab**: Valence distributions and statistics
- **Timeline Tab**: Cognitive evolution over time

### Import/Export
- **Export**: Download complete cognitive state as JSON
- **Import**: Upload previous sessions to resume cognitive modeling

## 🔌 API Reference

### Core Endpoints

#### T-units
```http
GET    /api/t-units              # Get all T-units
POST   /api/t-units              # Create new T-unit
GET    /api/t-units/{id}         # Get specific T-unit
```

#### Cognitive Operations
```http
POST   /api/synthesize           # Combine T-units with AI
POST   /api/transform            # Transform T-unit through phases
```

#### Analytics
```http
GET    /api/analytics/valence-distribution  # Valence statistics
GET    /api/analytics/cognitive-timeline    # Event timeline
```

#### Multi-Agent
```http
GET    /api/agents               # Get all agents
POST   /api/agents               # Create new agent
POST   /api/multi-agent/exchange # Exchange T-units between agents
```

#### State Management
```http
GET    /api/genesis/export       # Export complete state
POST   /api/genesis/import       # Import state from file
```

### Request Examples

**AI-Powered Synthesis:**
```json
POST /api/synthesize
{
  "t_unit_ids": ["id1", "id2", "id3"],
  "use_ai": true
}
```

**Cognitive Transformation:**
```json
POST /api/transform
{
  "t_unit_id": "target_id",
  "anomaly": "What if consciousness is an illusion?",
  "use_ai": true
}
```

## 🧪 Cognitive Modeling Concepts

### T-units (Thought Units)
The fundamental building blocks representing discrete cognitive states with:
- **Content**: Textual representation of the thought
- **Valence**: Emotional/cognitive coloring
  - *Curiosity* (0-1): Drive to explore and understand
  - *Certainty* (0-1): Confidence in the thought's validity
  - *Dissonance* (0-1): Cognitive tension or conflict
- **Relationships**: Parent-child connections showing cognitive lineage

### Cognitive Operations

#### Synthesis
Combines multiple T-units into emergent thoughts representing higher-order cognition. AI synthesis uses GPT-4 to create coherent, meaningful combinations rather than simple concatenation.

#### Transformation
Processes cognitive anomalies through structured phases:
1. **Shattering**: Breaks down existing assumptions (↑ dissonance)
2. **Remembering**: Recalls related experiences (↑ curiosity)
3. **Re-feeling**: Processes emotional aspects (↓ dissonance)
4. **Re-centering**: Establishes new stability (↑ certainty)
5. **Becoming**: Achieves cognitive integration (balanced valence)

#### Valence Dynamics
Valence values drive the visual representation and cognitive behavior:
- **High Dissonance** (red): Cognitive conflict requiring resolution
- **High Curiosity** (green): Active exploration and learning
- **High Certainty** (light green): Stable, confident beliefs

### Multi-Agent Cognition
Different agents represent distinct cognitive patterns and can exchange T-units, creating complex inter-agent cognitive dynamics and emergent collective intelligence.

## 🛠️ Development

### Project Structure
```
cep-web/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
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

### Adding New Features

#### Custom Cognitive Operations
Extend the cognitive modeling by adding new transformation phases or synthesis algorithms:

```python
# In server.py
async def custom_cognitive_operation(t_units, parameters):
    # Implement custom logic
    # Use OpenAI for AI enhancement
    return new_t_units
```

#### New Visualizations
Add visualization components using D3.js or Recharts:

```javascript
// In App.js
const CustomVisualization = ({ data }) => {
    // Implement D3.js or Recharts visualization
    return <div>Custom Chart</div>;
};
```

### Testing
```bash
# Backend testing
cd backend
python -m pytest tests/

# Frontend testing
cd frontend
yarn test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing cognitive feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint configuration for JavaScript/React
- Add tests for new cognitive operations
- Update documentation for API changes
- Ensure AI integrations handle errors gracefully

## 📚 Research Applications

CEP-Web is designed for researchers studying:
- **Cognitive Science**: Model thought processes and emergence
- **AI-Human Interaction**: Study AI-enhanced cognition
- **Complex Systems**: Analyze emergent behavior in cognitive networks
- **Psychology**: Visualize cognitive bias and decision-making
- **Philosophy of Mind**: Explore consciousness and recursive thinking

## 🔬 Example Research Questions
- How does AI enhancement affect cognitive synthesis patterns?
- What valence configurations lead to stable vs. transformative cognition?
- How do multi-agent cognitive networks develop emergent properties?
- Can cognitive transformation phases model real therapeutic processes?

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 API enabling intelligent cognitive modeling
- **React Flow** team for excellent graph visualization capabilities
- **D3.js** community for powerful data visualization tools
- **FastAPI** for elegant Python API development
- **MongoDB** for flexible cognitive data storage

## 📞 Support

For questions, issues, or research collaborations:
- Open an issue on GitHub
- Email: [your-email@domain.com]
- Documentation: [Wiki Link]

---

**CEP-Web: Where Artificial Intelligence Meets Cognitive Science** 🧠✨

*Transforming the invisible processes of thought into interactive, visual experiences that reveal the deep structures of consciousness and cognition.*