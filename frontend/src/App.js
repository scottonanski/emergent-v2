import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Enhanced T-unit Node Component
const TUnitNode = ({ data }) => {
  const getNodeColor = (valence) => {
    const { curiosity, certainty, dissonance } = valence;
    
    if (dissonance > 0.6) return '#ff6b6b'; // High dissonance - red
    if (curiosity > 0.6) return '#51cf66'; // High curiosity - green
    if (certainty > 0.6) return '#94d82d'; // High certainty - light green
    return '#ffd43b'; // Default - yellow
  };

  const getNodeBorderColor = (data) => {
    if (data.ai_generated) return '#845ef7'; // Purple border for AI-generated
    if (data.phase) return '#339af0'; // Blue border for transformation phases
    return '#868e96'; // Default gray
  };

  const getValenceIntensity = (valence) => {
    return Math.max(valence.curiosity, valence.certainty, valence.dissonance);
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="shadow-lg rounded-lg border-2 bg-white max-w-xs overflow-hidden"
      style={{ 
        borderColor: getNodeBorderColor(data),
        opacity: 0.85 + (getValenceIntensity(data.valence) * 0.15)
      }}
    >
      <Handle type="target" position={Position.Top} />
      
      {/* Tab Row */}
      <div className="flex bg-gray-100 border-b">
        {/* Agent Tab */}
        {data.agent_id && data.agent_id !== 'default' && (
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-t-md mr-1">
            {data.agent_id.split('_')[1]?.toUpperCase() || 'A'}
          </div>
        )}
        
        {/* AI Generated Tab */}
        {data.ai_generated && (
          <div className="bg-purple-500 text-white text-xs px-2 py-1 rounded-t-md">
            AI
          </div>
        )}
        
        {/* Phase Tab */}
        {data.phase && (
          <div className="bg-blue-400 text-white text-xs px-2 py-1 rounded-t-md ml-auto">
            {data.phase}
          </div>
        )}
        
        {/* Received Exchange Tab */}
        {data.content && data.content.startsWith('[RECEIVED]') && (
          <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-t-md ml-auto">
            RECEIVED
          </div>
        )}
        
        {/* Recalled Tab */}
        {data.is_recalled && (
          <div className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-t-md ml-auto">
            RECALLED
          </div>
        )}
        
        {/* Fill remaining space if no tabs */}
        {!data.agent_id && !data.ai_generated && !data.phase && !data.content?.startsWith('[RECEIVED]') && !data.is_recalled && (
          <div className="flex-1 bg-gray-100 text-xs px-2 py-1">
            T-Unit
          </div>
        )}
      </div>
      
      {/* Main Content Area */}
      <div 
        className="px-4 py-3"
        style={{ backgroundColor: getNodeColor(data.valence) }}
      >
        <div className="font-bold text-sm mb-2 text-gray-800">
          {data.phase || 'T-Unit'}
        </div>
        
        <div className="text-xs text-gray-700 mb-3 max-h-16 overflow-hidden leading-tight">
          {data.content.substring(0, 80)}...
        </div>
        
        <div className="text-xs grid grid-cols-3 gap-1 text-gray-800">
          <div className="text-center">
            <div className="font-semibold">C</div>
            <div>{data.valence.curiosity.toFixed(1)}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">Ct</div>
            <div>{data.valence.certainty.toFixed(1)}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">D</div>
            <div>{data.valence.dissonance.toFixed(1)}</div>
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </motion.div>
  );
};

// Valence Radar Chart Component
const ValenceRadarChart = ({ valenceData }) => {
  const svgRef = useRef();
  
  useEffect(() => {
    if (!valenceData || valenceData.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;
    
    const g = svg.append("g").attr("transform", `translate(${width/2}, ${height/2})`);
    
    // Calculate average valence
    const avgValence = {
      curiosity: d3.mean(valenceData, d => d.curiosity),
      certainty: d3.mean(valenceData, d => d.certainty),
      dissonance: d3.mean(valenceData, d => d.dissonance)
    };
    
    const data = [
      { axis: "Curiosity", value: avgValence.curiosity, color: "#51cf66" },
      { axis: "Certainty", value: avgValence.certainty, color: "#94d82d" },
      { axis: "Dissonance", value: avgValence.dissonance, color: "#ff6b6b" }
    ];
    
    const angleSlice = Math.PI * 2 / data.length;
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);
    
    // Draw grid circles
    for (let i = 1; i <= 5; i++) {
      g.append("circle")
        .attr("r", (radius / 5) * i)
        .attr("fill", "none")
        .attr("stroke", "#e9ecef")
        .attr("stroke-width", 1);
    }
    
    // Draw axis lines
    data.forEach((d, i) => {
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", radius * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", radius * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("stroke", "#adb5bd")
        .attr("stroke-width", 1);
      
      // Add labels
      g.append("text")
        .attr("x", (radius + 10) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (radius + 10) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("fill", d.color)
        .text(d.axis);
    });
    
    // Draw valence polygon
    const line = d3.line()
      .x((d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .y((d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .curve(d3.curveLinearClosed);
    
    g.append("path")
      .datum(data)
      .attr("d", line)
      .attr("fill", "rgba(81, 207, 102, 0.3)")
      .attr("stroke", "#51cf66")
      .attr("stroke-width", 2);
    
    // Add dots
    data.forEach((d, i) => {
      g.append("circle")
        .attr("cx", rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("cy", rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("r", 4)
        .attr("fill", d.color);
    });
    
  }, [valenceData]);
  
  return <svg ref={svgRef} width={200} height={200}></svg>;
};

// Timeline Component
const CognitiveTimeline = ({ events }) => {
  const timelineData = events.slice(-20).map(event => ({
    timestamp: new Date(event.timestamp).toLocaleTimeString(),
    type: event.type,
    agent: event.agent_id || 'default',
    count: 1
  }));
  
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main App Component
function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tUnits, setTUnits] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [showMultiAgent, setShowMultiAgent] = useState(false);
  const [showTransformation, setShowTransformation] = useState(false);
  const [anomalyText, setAnomalyText] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [events, setEvents] = useState([]);
  const [valenceData, setValenceData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [activeTab, setActiveTab] = useState('graph');
  const [useAI, setUseAI] = useState(true);
  const [showImportExport, setShowImportExport] = useState(false);
  const [agents, setAgents] = useState([]);
  const [showAgentCreation, setShowAgentCreation] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('');
  const [memorySuggestions, setMemorySuggestions] = useState([]);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [includeCrossAgent, setIncludeCrossAgent] = useState(false);
  const [recalledNodes, setRecalledNodes] = useState([]);

  // Custom edge styles
  const edgeOptions = {
    animated: true,
    style: { stroke: '#1f2937', strokeWidth: 2 },
  };

  const nodeTypes = { tunit: TUnitNode };

  // Fetch data functions
  const fetchTUnits = useCallback(async () => {
    try {
      const url = selectedAgentFilter 
        ? `${API}/t-units?agent_id=${selectedAgentFilter}` 
        : `${API}/t-units`;
      const response = await axios.get(url);
      setTUnits(response.data);
    } catch (error) {
      console.error('Error fetching T-units:', error);
    }
  }, [selectedAgentFilter]);

  const fetchEvents = useCallback(async () => {
    try {
      const url = selectedAgentFilter 
        ? `${API}/events?agent_id=${selectedAgentFilter}` 
        : `${API}/events`;
      const response = await axios.get(url);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [selectedAgentFilter]);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  // Fetch memory suggestions
  const fetchMemorySuggestions = useCallback(async (tUnitId, agentId) => {
    setIsLoadingMemory(true);
    try {
      const response = await axios.post(`${API}/memory/suggest`, {
        agent_id: agentId,
        t_unit_id: tUnitId,
        limit: 8,
        include_cross_agent: includeCrossAgent,
        valence_weight: 0.25
      });
      setMemorySuggestions(response.data);
      setShowMemoryPanel(true);
    } catch (error) {
      console.error('Error fetching memory suggestions:', error);
      setMemorySuggestions([]);
    } finally {
      setIsLoadingMemory(false);
    }
  }, [includeCrossAgent]);

  // Handle memory recall
  const handleRecallMemory = (memorySuggestion) => {
    // Add the recalled T-unit to selection
    setSelectedNodes(prev => {
      if (!prev.includes(memorySuggestion.id)) {
        return [...prev, memorySuggestion.id];
      }
      return prev;
    });
    
    // Track as recalled
    setRecalledNodes(prev => {
      if (!prev.includes(memorySuggestion.id)) {
        return [...prev, memorySuggestion.id];
      }
      return prev;
    });
  };
  const fetchAnalytics = useCallback(async () => {
    try {
      const [valenceResponse, timelineResponse] = await Promise.all([
        axios.get(`${API}/analytics/valence-distribution`),
        axios.get(`${API}/analytics/cognitive-timeline`)
      ]);
      setValenceData(valenceResponse.data);
      setTimelineData(timelineResponse.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, []);

  // Convert T-units to graph with tree layout
  const convertTUnitsToGraph = useCallback((tUnits) => {
    // Build tree structure
    const nodeMap = new Map();
    const rootNodes = [];
    
    // Create node map
    tUnits.forEach(tUnit => {
      nodeMap.set(tUnit.id, {
        ...tUnit,
        children: [],
        level: 0,
        position: { x: 0, y: 0 }
      });
    });
    
    // Build parent-child relationships and find roots
    tUnits.forEach(tUnit => {
      const node = nodeMap.get(tUnit.id);
      
      if (tUnit.parents.length === 0) {
        rootNodes.push(node);
      } else {
        // Add to parent's children
        tUnit.parents.forEach(parentId => {
          const parent = nodeMap.get(parentId);
          if (parent) {
            parent.children.push(node);
          }
        });
      }
    });
    
    // Calculate levels (depth from root)
    const calculateLevels = (node, level = 0) => {
      node.level = level;
      node.children.forEach(child => {
        calculateLevels(child, level + 1);
      });
    };
    
    rootNodes.forEach(root => calculateLevels(root));
    
    // Group nodes by level
    const levels = new Map();
    Array.from(nodeMap.values()).forEach(node => {
      if (!levels.has(node.level)) {
        levels.set(node.level, []);
      }
      levels.get(node.level).push(node);
    });
    
    // Calculate positions for tree layout
    const levelHeight = 200;  // Vertical spacing between levels
    const nodeWidth = 300;    // Horizontal spacing between nodes
    const startY = 50;        // Top margin
    
    // Position nodes level by level
    levels.forEach((nodesInLevel, level) => {
      const y = startY + (level * levelHeight);
      const totalWidth = nodesInLevel.length * nodeWidth;
      const startX = -totalWidth / 2;  // Center the level
      
      nodesInLevel.forEach((node, index) => {
        node.position = {
          x: startX + (index * nodeWidth) + (nodeWidth / 2),
          y: y
        };
      });
    });
    
    // Create React Flow nodes
    const graphNodes = Array.from(nodeMap.values()).map(node => ({
      id: node.id,
      type: 'tunit',
      position: node.position,
      data: {
        content: node.content,
        valence: node.valence,
        phase: node.phase,
        linkage: node.linkage,
        timestamp: node.timestamp,
        agent_id: node.agent_id,
        ai_generated: node.ai_generated,
        is_recalled: recalledNodes.includes(node.id)
      },
      selected: selectedNodes.includes(node.id)
    }));

    // Create edges with better routing for tree layout
    const graphEdges = [];
    tUnits.forEach(tUnit => {
      tUnit.children.forEach(childId => {
        if (tUnits.find(t => t.id === childId)) {
          graphEdges.push({
            id: `${tUnit.id}-${childId}`,
            source: tUnit.id,
            target: childId,
            label: tUnit.linkage,
            type: 'smoothstep',  // Better edge routing for trees
            style: {
              stroke: '#6b7280',
              strokeWidth: 2,
            },
            animated: true
          });
        }
      });
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [selectedNodes, recalledNodes, setNodes, setEdges]);

  // Initialize sample data
  const initSampleData = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API}/init-sample-data`);
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAgents(), fetchAnalytics()]);
    } catch (error) {
      console.error('Error initializing sample data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle node selection
  const onNodeClick = (event, node) => {
    const newSelection = selectedNodes.includes(node.id) 
      ? selectedNodes.filter(id => id !== node.id)
      : [...selectedNodes, node.id];
    
    setSelectedNodes(newSelection);
    
    // Trigger memory suggestions if exactly one node is selected
    if (newSelection.length === 1) {
      const selectedTUnit = tUnits.find(t => t.id === newSelection[0]);
      if (selectedTUnit) {
        fetchMemorySuggestions(selectedTUnit.id, selectedTUnit.agent_id);
      }
    } else {
      setShowMemoryPanel(false);
      setMemorySuggestions([]);
    }
  };

  // Handle synthesis
  const handleSynthesis = async () => {
    if (selectedNodes.length < 2) {
      alert('Please select at least 2 T-units for synthesis');
      return;
    }

    setIsLoading(true);
    try {
      // Separate recalled nodes from regular selection
      const recalledInSelection = selectedNodes.filter(id => recalledNodes.includes(id));
      const regularSelection = selectedNodes.filter(id => !recalledNodes.includes(id));
      
      await axios.post(`${API}/synthesize`, {
        t_unit_ids: regularSelection.length >= 2 ? regularSelection : selectedNodes,
        recalled_ids: recalledInSelection,
        use_ai: useAI
      });
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAnalytics()]);
      setSelectedNodes([]);
      setRecalledNodes([]);
      setShowSynthesis(false);
    } catch (error) {
      console.error('Error during synthesis:', error);
      alert('Error during synthesis');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transformation
  const handleTransformation = async () => {
    if (selectedNodes.length !== 1) {
      alert('Please select exactly 1 T-unit for transformation');
      return;
    }

    if (!anomalyText.trim()) {
      alert('Please enter an anomaly description');
      return;
    }

    setIsLoading(true);
    try {
      // Get recalled nodes (excluding the target transformation node)
      const targetNode = selectedNodes[0];
      const recalledForTransformation = recalledNodes.filter(id => id !== targetNode);
      
      await axios.post(`${API}/transform`, {
        t_unit_id: targetNode,
        anomaly: anomalyText,
        recalled_ids: recalledForTransformation,
        use_ai: useAI
      });
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAnalytics()]);
      setSelectedNodes([]);
      setRecalledNodes([]);
      setShowTransformation(false);
      setAnomalyText('');
    } catch (error) {
      console.error('Error during transformation:', error);
      alert('Error during transformation');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle multi-agent exchange
  // Handle agent creation
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    
    setIsLoading(true);
    try {
      await axios.post(`${API}/agents`, {
        name: newAgentName,
        description: newAgentDescription
      });
      await fetchAgents();
      setShowAgentCreation(false);
      setNewAgentName('');
      setNewAgentDescription('');
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Error creating agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultiAgentExchange = async () => {
    if (selectedNodes.length !== 1) {
      alert('Please select exactly 1 T-unit for exchange');
      return;
    }

    if (!selectedAgent) {
      alert('Please select a target agent');
      return;
    }

    setIsLoading(true);
    try {
      const selectedTUnit = tUnits.find(t => t.id === selectedNodes[0]);
      await axios.post(`${API}/multi-agent/exchange`, {
        source_agent_id: selectedTUnit.agent_id,
        target_agent_id: selectedAgent,
        t_unit_id: selectedNodes[0],
        exchange_type: "user_initiated"
      });
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAnalytics()]);
      setSelectedNodes([]);
      setShowMultiAgent(false);
      setSelectedAgent('');
      alert('Thought successfully sent to agent!');
    } catch (error) {
      console.error('Error during multi-agent exchange:', error);
      alert('Error during multi-agent exchange');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file export
  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/genesis/export`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genesis_log_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
  };

  // Handle file import
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/genesis/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAgents(), fetchAnalytics()]);
      alert('Genesis log imported successfully!');
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing data');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  // Initialize on component mount
  useEffect(() => {
    Promise.all([fetchTUnits(), fetchEvents(), fetchAgents(), fetchAnalytics()]);
  }, [fetchTUnits, fetchEvents, fetchAgents, fetchAnalytics]);

  // Update graph when T-units change
  useEffect(() => {
    convertTUnitsToGraph(tUnits);
  }, [tUnits, convertTUnitsToGraph]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🧠 Advanced Cognitive Emergence Protocol</h1>
          <div className="flex gap-2">
            <button
              onClick={initSampleData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Initialize Sample Data'}
            </button>
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Import/Export
            </button>
          </div>
        </div>
        
        {/* Import/Export Panel */}
        {showImportExport && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-gray-50 rounded-lg border"
          >
            <div className="flex gap-4 items-center">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="text-sm"
              />
              <button
                onClick={handleExport}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Export Genesis Log
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="flex space-x-1 p-2">
          {['graph', 'analytics', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Control Panel */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* AI Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm font-medium">Use AI Enhancement</label>
            </div>

            {/* Selection Info */}
            <div>
              <h3 className="font-medium mb-2">Selected T-units: {selectedNodes.length}</h3>
              {selectedNodes.length > 0 && (
                <div className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                  {selectedNodes.map(id => {
                    const tUnit = tUnits.find(t => t.id === id);
                    return tUnit ? (
                      <div key={id} className="mb-1 p-1 bg-gray-50 rounded">
                        {tUnit.content.substring(0, 30)}...
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Synthesis */}
            <div>
              <button
                onClick={() => setShowSynthesis(!showSynthesis)}
                disabled={selectedNodes.length < 2}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                🔄 Synthesis ({selectedNodes.length}/2+ T-units)
              </button>
              <AnimatePresence>
                {showSynthesis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 bg-gray-50 rounded"
                  >
                    <p className="text-sm mb-2">
                      {useAI ? 'AI-powered synthesis' : 'Basic synthesis'} of selected T-units
                      {recalledNodes.filter(id => selectedNodes.includes(id)).length > 0 && (
                        <span className="block text-cyan-600 text-xs mt-1">
                          💭 {recalledNodes.filter(id => selectedNodes.includes(id)).length} memory{recalledNodes.filter(id => selectedNodes.includes(id)).length > 1 ? 'ies' : 'y'} will influence this synthesis
                        </span>
                      )}
                    </p>
                    <button
                      onClick={handleSynthesis}
                      disabled={isLoading}
                      className="w-full px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Execute Synthesis
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transformation */}
            <div>
              <button
                onClick={() => setShowTransformation(!showTransformation)}
                disabled={selectedNodes.length !== 1}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                🔄 Transformation (1 T-unit)
              </button>
              <AnimatePresence>
                {showTransformation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 bg-gray-50 rounded"
                  >
                    <p className="text-sm mb-2">
                      {useAI ? 'AI-powered transformation' : 'Basic transformation'} through 5 phases
                      {recalledNodes.length > 0 && (
                        <span className="block text-cyan-600 text-xs mt-1">
                          💭 {recalledNodes.length} memory{recalledNodes.length > 1 ? 'ies' : 'y'} will influence this transformation
                        </span>
                      )}
                    </p>
                    <input
                      type="text"
                      placeholder="Enter anomaly description..."
                      value={anomalyText}
                      onChange={(e) => setAnomalyText(e.target.value)}
                      className="w-full px-2 py-1 border rounded mb-2"
                    />
                    <button
                      onClick={handleTransformation}
                      disabled={isLoading || !anomalyText.trim()}
                      className="w-full px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Execute Transformation
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Multi-Agent Exchange */}
            <div>
              <button
                onClick={() => setShowMultiAgent(!showMultiAgent)}
                disabled={selectedNodes.length !== 1}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                🤝 Send to Agent (1 T-unit)
              </button>
              <AnimatePresence>
                {showMultiAgent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 bg-gray-50 rounded"
                  >
                    <p className="text-sm mb-2">Exchange thought with another agent</p>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full px-2 py-1 border rounded mb-2"
                    >
                      <option value="">Select target agent...</option>
                      {agents
                        .filter(agent => {
                          const selectedTUnit = tUnits.find(t => t.id === selectedNodes[0]);
                          return selectedTUnit && agent.id !== selectedTUnit.agent_id;
                        })
                        .map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.id})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleMultiAgentExchange}
                      disabled={isLoading || !selectedAgent}
                      className="w-full px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Send Thought to Agent
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Legend */}
            <div>
              <h3 className="font-medium mb-2">Legend</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-400 rounded mr-2"></div>
                  <span>High Dissonance</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
                  <span>High Curiosity</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-lime-300 rounded mr-2"></div>
                  <span>High Certainty</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                  <span>AI Generated</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-cyan-500 rounded mr-2"></div>
                  <span>Recalled Memory</span>
                </div>
              </div>
            </div>

            {/* Agents */}
            {agents.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Agents ({agents.length})</h3>
                  <button
                    onClick={() => setShowAgentCreation(!showAgentCreation)}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + New
                  </button>
                </div>
                
                {/* Agent Creation Form */}
                <AnimatePresence>
                  {showAgentCreation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 p-3 bg-blue-50 rounded border"
                    >
                      <input
                        type="text"
                        placeholder="Agent name..."
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        className="w-full px-2 py-1 border rounded mb-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Agent description..."
                        value={newAgentDescription}
                        onChange={(e) => setNewAgentDescription(e.target.value)}
                        className="w-full px-2 py-1 border rounded mb-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateAgent}
                          disabled={isLoading || !newAgentName.trim()}
                          className="flex-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setShowAgentCreation(false);
                            setNewAgentName('');
                            setNewAgentDescription('');
                          }}
                          className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Agent List */}
                <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                  {agents.map(agent => {
                    const agentThoughts = tUnits.filter(t => t.agent_id === agent.id);
                    const agentEvents = events.filter(e => e.agent_id === agent.id);
                    const isActiveAgent = selectedAgentFilter === agent.id;
                    
                    return (
                      <div key={agent.id} className={`p-2 rounded border ${isActiveAgent ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-xs">{agent.name}</div>
                            <div className="text-xs text-gray-600 mb-1">{agent.description}</div>
                            <div className="flex gap-3 text-xs text-gray-500">
                              <span>💭 {agentThoughts.length}</span>
                              <span>⚡ {agentEvents.length}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedAgentFilter(isActiveAgent ? '' : agent.id)}
                            className={`text-xs px-2 py-1 rounded ${
                              isActiveAgent 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                          >
                            {isActiveAgent ? 'All' : 'Filter'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Events */}
            <div>
              <h3 className="font-medium mb-2">Recent Events</h3>
              <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                {events.slice(0, 10).map((event, index) => (
                  <div key={event.id} className="p-2 bg-gray-50 rounded">
                    <div className="font-medium text-xs">
                      {event.type} 
                      {event.metadata?.ai_generated && ' (AI)'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Suggestions Panel */}
            <AnimatePresence>
              {showMemoryPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-purple-800">💭 Memory Suggestions</h3>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={includeCrossAgent}
                          onChange={(e) => setIncludeCrossAgent(e.target.checked)}
                          className="mr-1"
                        />
                        Cross-Agent
                      </label>
                      <button
                        onClick={() => setShowMemoryPanel(false)}
                        className="text-purple-600 hover:text-purple-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  {isLoadingMemory ? (
                    <div className="text-center py-4 text-purple-600">
                      <div className="animate-spin inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full mr-2"></div>
                      Searching memories...
                    </div>
                  ) : memorySuggestions.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {memorySuggestions.map((suggestion, index) => (
                        <div key={suggestion.id} className="p-3 bg-white rounded border border-purple-100 hover:border-purple-300 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-xs text-purple-600 font-medium">
                              {suggestion.agent_id !== agents.find(a => a.id === suggestion.agent_id)?.id 
                                ? suggestion.agent_id 
                                : agents.find(a => a.id === suggestion.agent_id)?.name || suggestion.agent_id}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500">
                                {(suggestion.final_score * 100).toFixed(0)}% match
                              </div>
                              <button
                                onClick={() => handleRecallMemory(suggestion)}
                                disabled={selectedNodes.includes(suggestion.id)}
                                className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {selectedNodes.includes(suggestion.id) ? 'Recalled' : 'Recall'}
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-2 leading-tight">
                            {suggestion.content.length > 120 
                              ? `${suggestion.content.substring(0, 120)}...` 
                              : suggestion.content}
                          </div>
                          
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>🧠 Semantic: {(suggestion.similarity * 100).toFixed(0)}%</span>
                            <span>💙 Valence: {(suggestion.valence_score * 100).toFixed(0)}%</span>
                            <span>⏰ {new Date(suggestion.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No matching memories found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative">
          {activeTab === 'graph' && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold">Cognitive Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-medium mb-4">Average Valence Distribution</h3>
                  <div className="flex justify-center">
                    <ValenceRadarChart 
                      valenceData={tUnits.map(t => t.valence)} 
                    />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-medium mb-4">T-unit Statistics</h3>
                  <div className="space-y-2">
                    <div>Total T-units: {tUnits.length}</div>
                    <div>AI Generated: {tUnits.filter(t => t.ai_generated).length}</div>
                    <div>Synthesis Events: {events.filter(e => e.type === 'synthesis').length}</div>
                    <div>Transformation Events: {events.filter(e => e.type === 'transformation').length}</div>
                    <div>Active Agents: {agents.length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold">Cognitive Evolution Timeline</h2>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium mb-4">Recent Activity</h3>
                <CognitiveTimeline events={events} />
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium mb-4">Event History</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.map(event => (
                    <div key={event.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{event.type}</div>
                          <div className="text-sm text-gray-600">
                            Agent: {event.agent_id || 'default'}
                          </div>
                          {event.metadata?.phase && (
                            <div className="text-sm text-blue-600">
                              Phase: {event.metadata.phase}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;