import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls, MiniMap, Handle, Position, useReactFlow } from '@xyflow/react';
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

  // Phase 1: Core UX Features State
  const [autoGenerateOnLoad, setAutoGenerateOnLoad] = useState(false);
  const [showCreateThought, setShowCreateThought] = useState(false);
  const [newThoughtContent, setNewThoughtContent] = useState('');
  const [newThoughtAgent, setNewThoughtAgent] = useState('');
  const [newThoughtValence, setNewThoughtValence] = useState({
    curiosity: 0.6,
    certainty: 0.4,
    dissonance: 0.2
  });
  
  // Custom modals for sandboxed environment
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Phase 2: Onboarding & Polish State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');

  // Phase 3: Enhanced Agent Panel State
  const [showAgentsPanel, setShowAgentsPanel] = useState(true);
  const [agentsWithStats, setAgentsWithStats] = useState([]);
  const [agentFilters, setAgentFilters] = useState(['all']);
  const [editingAgent, setEditingAgent] = useState(null);
  const [editingAgentName, setEditingAgentName] = useState('');

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      // setShowTutorial(true); // Temporarily disabled for testing
    }
  }, []);

  // Mark tutorial as completed
  const completeTutorial = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowTutorial(false);
    setTutorialStep(1);
  };

  // React Flow instance ref for camera control
  const reactFlowInstance = useRef(null);

  // Smart camera focus on new nodes  
  const focusOnNode = useCallback((nodeId) => {
    if (!nodeId) return;
    
    // Use setTimeout to ensure node has been added to DOM
    setTimeout(() => {
      const node = nodes.find(n => n.id === nodeId);
      if (node && reactFlowInstance.current) {
        // Center camera on the new node with smooth animation
        reactFlowInstance.current.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
      }
    }, 100);
  }, [nodes]);

  // AI Thinking animation helpers
  const startThinking = (message = 'AI is thinking...') => {
    setIsThinking(true);
    setThinkingMessage(message);
  };

  const stopThinking = () => {
    setIsThinking(false);
    setThinkingMessage('');
  };

  // Reset tree layout (remove manual positioning)
  const resetTreeLayout = useCallback(() => {
    convertTUnitsToGraph(tUnits, false);
  }, [tUnits]);

  // Custom nodes change handler to track manual positioning
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    
    // Mark nodes as manually positioned when they're dragged
    changes.forEach(change => {
      if (change.type === 'position' && change.dragging === false) {
        // Node was just released after dragging
        setNodes(nds => nds.map(node => 
          node.id === change.id 
            ? { 
                ...node, 
                data: { ...node.data, hasManualPosition: true } 
              }
            : node
        ));
      }
    });
  }, [onNodesChange, setNodes]);

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

  // Fetch agents with statistics
  const fetchAgentsWithStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/agents/stats`);
      setAgentsWithStats(response.data);
    } catch (error) {
      console.error('Error fetching agents with stats:', error);
    }
  }, []);

  // Enhanced Agent Management Functions
  const handleToggleAgentFilter = (agentId) => {
    if (agentId === 'all') {
      setAgentFilters(['all']);
      setSelectedAgentFilter('');
    } else {
      setAgentFilters(prev => {
        const newFilters = prev.includes(agentId) 
          ? prev.filter(id => id !== agentId)
          : [...prev.filter(id => id !== 'all'), agentId];
        
        // Update global agent filter for backward compatibility
        setSelectedAgentFilter(newFilters.length === 1 ? newFilters[0] : '');
        
        return newFilters.length === 0 ? ['all'] : newFilters;
      });
    }
  };

  const handleEditAgent = (agent) => {
    setEditingAgent(agent.id);
    setEditingAgentName(agent.name);
  };

  const handleSaveAgentEdit = async (agentId) => {
    if (!editingAgentName.trim()) return;
    
    try {
      await axios.put(`${API}/agents/${agentId}`, {
        name: editingAgentName.trim()
      });
      await fetchAgentsWithStats();
      setEditingAgent(null);
      setEditingAgentName('');
      setSuccessMessage('Agent renamed successfully!');
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error renaming agent:', error);
      setErrorMessage('Error renaming agent');
      setShowErrorMessage(true);
    }
  };

  const handleCancelAgentEdit = () => {
    setEditingAgent(null);
    setEditingAgentName('');
  };

  const handleDeleteAgent = (agentId, agentName) => {
    // Use custom modal for confirmation
    setErrorMessage(`Are you sure you want to delete agent "${agentName}"?\n\nThis will remove the agent but keep all their thoughts in the system.`);
    setShowErrorMessage(true);
    
    // Store delete info for confirmation
    window.pendingAgentDelete = { agentId, agentName };
  };

  const handleConfirmDeleteAgent = async () => {
    if (!window.pendingAgentDelete) return;
    
    const { agentId, agentName } = window.pendingAgentDelete;
    
    try {
      await axios.delete(`${API}/agents/${agentId}`);
      await fetchAgentsWithStats();
      
      // Remove from filters if present
      setAgentFilters(prev => prev.filter(id => id !== agentId));
      if (selectedAgentFilter === agentId) {
        setSelectedAgentFilter('');
      }
      
      setSuccessMessage(`Agent "${agentName}" deleted successfully!`);
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error deleting agent:', error);
      setErrorMessage('Error deleting agent');
      setShowErrorMessage(true);
    } finally {
      delete window.pendingAgentDelete;
    }
  };

  const handleFocusAgent = (agentId) => {
    // Single agent filter and update UI
    setSelectedAgentFilter(agentId);
    setAgentFilters([agentId]);
  };

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
  const convertTUnitsToGraph = useCallback((tUnits, preservePositions = false, currentNodes = []) => {
    // Filter T-units based on agent filters
    let filteredTUnits = tUnits;
    if (!agentFilters.includes('all') && agentFilters.length > 0) {
      filteredTUnits = tUnits.filter(tUnit => agentFilters.includes(tUnit.agent_id));
    }

    // Build tree structure
    const nodeMap = new Map();
    const rootNodes = [];
    
    // Create node map, preserving existing positions if requested
    filteredTUnits.forEach(tUnit => {
      const existingNode = preservePositions ? currentNodes.find(n => n.id === tUnit.id) : null;
      nodeMap.set(tUnit.id, {
        ...tUnit,
        children: [],
        level: 0,
        position: existingNode ? existingNode.position : { x: 0, y: 0 },
        hasManualPosition: existingNode ? existingNode.data?.hasManualPosition : false
      });
    });
    
    // Build parent-child relationships and find roots
    filteredTUnits.forEach(tUnit => {
      const node = nodeMap.get(tUnit.id);
      
      if (tUnit.parents.length === 0) {
        rootNodes.push(node);
      } else {
        // Add to parent's children (only if parent is in filtered set)
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
    
    // Calculate positions for tree layout (only for nodes without manual positions)
    const levelHeight = 200;  // Vertical spacing between levels
    const nodeWidth = 300;    // Horizontal spacing between nodes
    const startY = 50;        // Top margin
    
    // Position nodes level by level
    levels.forEach((nodesInLevel, level) => {
      const y = startY + (level * levelHeight);
      const totalWidth = nodesInLevel.length * nodeWidth;
      const startX = -totalWidth / 2;  // Center the level
      
      nodesInLevel.forEach((node, index) => {
        // Only update position if node doesn't have a manual position
        if (!node.hasManualPosition) {
          node.position = {
            x: startX + (index * nodeWidth) + (nodeWidth / 2),
            y: y
          };
        }
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
        is_recalled: recalledNodes.includes(node.id),
        hasManualPosition: node.hasManualPosition
      },
      selected: selectedNodes.includes(node.id)
    }));

    // Create edges with better routing for tree layout
    const graphEdges = [];
    Array.from(nodeMap.values()).forEach(node => {
      node.children.forEach(child => {
        graphEdges.push({
          id: `${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          label: node.linkage,
          type: 'smoothstep',  // Better edge routing for trees
          style: {
            stroke: '#6b7280',
            strokeWidth: 2,
          },
          animated: true
        });
      });
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [selectedNodes, recalledNodes, agentFilters, setNodes, setEdges]);

  // Reset World functionality - using custom modals for sandboxed environment
  const resetWorld = async () => {
    console.log('Reset World button clicked!'); // Debug log
    
    // Show custom confirmation modal instead of window.confirm
    setShowResetConfirm(true);
  };

  // Handle confirmed reset
  const handleConfirmedReset = async () => {
    setShowResetConfirm(false);
    console.log('Starting reset...'); // Debug log
    setIsLoading(true);
    
    try {
      // Clear database
      console.log('Calling backend reset endpoint...'); // Debug log
      const response = await axios.delete(`${API}/reset-world`);
      console.log('Backend response:', response.data); // Debug log
      
      // Reset local state
      setTUnits([]);
      setEvents([]);
      setAgents([]);
      setSelectedNodes([]);
      setRecalledNodes([]);
      setNodes([]);
      setEdges([]);
      setMemorySuggestions([]);
      setShowMemoryPanel(false);
      
      // Clear analytics
      setValenceData([]);
      setTimelineData([]);
      
      console.log('Local state reset complete'); // Debug log
      
      // Show custom success message instead of alert
      setSuccessMessage(`World reset successfully!\n\nCleared: ${response.data.cleared.join(', ')}\nThe canvas is now empty and ready for new thoughts.`);
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error resetting world:', error);
      setErrorMessage(`Error resetting world: ${error.response?.data?.detail || error.message}\n\nCheck the browser console for more details.`);
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
      console.log('Reset operation complete'); // Debug log
    }
  };

  // Create manual thought
  const createManualThought = async () => {
    if (!newThoughtContent.trim()) {
      setErrorMessage('Please enter thought content');
      setShowErrorMessage(true);
      return;
    }

    if (!newThoughtAgent) {
      setErrorMessage('Please select an agent or create a new one');
      setShowErrorMessage(true);
      return;
    }

    setIsLoading(true);
    try {
      let agentId = newThoughtAgent;
      
      // Create new agent if needed
      if (newThoughtAgent === 'CREATE_NEW') {
        const agentName = newAgentName.trim() || 'Thinker';
        const agentResponse = await axios.post(`${API}/agents`, {
          name: agentName,
          description: `Created by user for manual thought creation`
        });
        agentId = agentResponse.data.id;
        
        // Refresh agents list
        await fetchAgents();
      }
      
      await axios.post(`${API}/t-units`, {
        content: newThoughtContent,
        valence: newThoughtValence,
        agent_id: agentId,
        linkage: 'manual'
      });
      
      // Refresh data
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAnalytics()]);
      
      // Reset form
      setNewThoughtContent('');
      setNewThoughtAgent('');
      setNewAgentName('');
      setNewThoughtValence({
        curiosity: 0.6,
        certainty: 0.4,
        dissonance: 0.2
      });
      setShowCreateThought(false);
      
      setSuccessMessage('Thought created successfully!');
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error creating thought:', error);
      setErrorMessage('Error creating thought');
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

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
      setErrorMessage('Please select at least 2 T-units for synthesis');
      setShowErrorMessage(true);
      return;
    }

    setIsLoading(true);
    startThinking('AI is synthesizing thoughts...');
    
    try {
      // Separate recalled nodes from regular selection
      const recalledInSelection = selectedNodes.filter(id => recalledNodes.includes(id));
      const regularSelection = selectedNodes.filter(id => !recalledNodes.includes(id));
      
      const response = await axios.post(`${API}/synthesize`, {
        t_unit_ids: regularSelection.length >= 2 ? regularSelection : selectedNodes,
        recalled_ids: recalledInSelection,
        use_ai: useAI
      });
      
      const newNodeId = response.data.id;
      
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAnalytics()]);
      
      // Focus camera on new node after a brief delay
      if (newNodeId) {
        setTimeout(() => focusOnNode(newNodeId), 200);
      }
      
      setSelectedNodes([]);
      setRecalledNodes([]);
      setShowSynthesis(false);
    } catch (error) {
      console.error('Error during synthesis:', error);
      setErrorMessage('Error during synthesis. Please try again.');
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
      stopThinking();
    }
  };

  // Handle transformation
  const handleTransformation = async () => {
    if (selectedNodes.length !== 1) {
      setErrorMessage('Please select exactly 1 T-unit for transformation');
      setShowErrorMessage(true);
      return;
    }

    if (!anomalyText.trim()) {
      setErrorMessage('Please enter an anomaly description');
      setShowErrorMessage(true);
      return;
    }

    setIsLoading(true);
    startThinking('AI is transforming through cognitive phases...');
    
    try {
      // Get recalled nodes (excluding the target transformation node)
      const targetNode = selectedNodes[0];
      const recalledForTransformation = recalledNodes.filter(id => id !== targetNode);
      
      const response = await axios.post(`${API}/transform`, {
        t_unit_id: targetNode,
        anomaly: anomalyText,
        recalled_ids: recalledForTransformation,
        use_ai: useAI
      });
      
      // Focus on the first transformation node (Shattering phase)
      const newNodes = response.data;
      if (newNodes && newNodes.length > 0) {
        setTimeout(() => focusOnNode(newNodes[0].id), 200);
      }
      
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAnalytics()]);
      setSelectedNodes([]);
      setRecalledNodes([]);
      setShowTransformation(false);
      setAnomalyText('');
    } catch (error) {
      console.error('Error during transformation:', error);
      setErrorMessage('Error during transformation. Please try again.');
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
      stopThinking();
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
      await Promise.all([fetchAgents(), fetchAgentsWithStats()]);
      setShowAgentCreation(false);
      setNewAgentName('');
      setNewAgentDescription('');
      setSuccessMessage('Agent created successfully!');
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error creating agent:', error);
      setErrorMessage('Error creating agent');
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultiAgentExchange = async () => {
    if (selectedNodes.length !== 1) {
      setErrorMessage('Please select exactly 1 T-unit for exchange');
      setShowErrorMessage(true);
      return;
    }

    if (!selectedAgent) {
      setErrorMessage('Please select a target agent');
      setShowErrorMessage(true);
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
      setSuccessMessage('Thought successfully sent to agent!');
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error during multi-agent exchange:', error);
      setErrorMessage('Error during multi-agent exchange');
      setShowErrorMessage(true);
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
      setErrorMessage('Error exporting data');
      setShowErrorMessage(true);
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
      setSuccessMessage('Genesis log imported successfully!');
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error importing data:', error);
      setErrorMessage('Error importing data');
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  // Initialize on component mount
  useEffect(() => {
    const initializeApp = async () => {
      // Always fetch existing data
      await Promise.all([fetchTUnits(), fetchEvents(), fetchAgents(), fetchAgentsWithStats(), fetchAnalytics()]);
      
      // Auto-generate sample data only if enabled and no data exists
      if (autoGenerateOnLoad) {
        // Check if we have any T-units
        try {
          const response = await axios.get(`${API}/t-units`);
          if (response.data.length === 0) {
            // No data exists, initialize sample data
            await initSampleData();
          }
        } catch (error) {
          console.error('Error checking existing data:', error);
        }
      }
    };
    
    initializeApp();
  }, [fetchTUnits, fetchEvents, fetchAgents, fetchAgentsWithStats, fetchAnalytics, autoGenerateOnLoad]);

  // Update graph when T-units change
  useEffect(() => {
    convertTUnitsToGraph(tUnits, false); // false = don't preserve positions, recalculate tree
  }, [tUnits]);

  // Update node selection and recalled status without recalculating layout
  useEffect(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          is_recalled: recalledNodes.includes(node.id)
        },
        selected: selectedNodes.includes(node.id)
      }))
    );
  }, [selectedNodes, recalledNodes, setNodes]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🧠 Advanced Cognitive Emergence Protocol</h1>
          <div className="flex gap-2 items-center">
            {/* Auto-Generation Toggle */}
            <div className="flex items-center gap-2 mr-4">
              <input
                type="checkbox"
                id="autoGenerate"
                checked={autoGenerateOnLoad}
                onChange={(e) => setAutoGenerateOnLoad(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoGenerate" className="text-sm text-gray-700">
                Auto-generate on load
              </label>
            </div>
            
            {/* Create Thought Button */}
            <button
              onClick={() => setShowCreateThought(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              ✨ Create Thought
            </button>
            
            {/* Initialize Sample Data Button */}
            <button
              onClick={initSampleData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Initialize Sample Data'}
            </button>
            
            {/* Reset World Button */}
            <button
              onClick={resetWorld}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Resetting...' : '🌍 Reset World'}
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

        {/* Create Thought Modal */}
        <AnimatePresence>
          {showCreateThought && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowCreateThought(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg shadow-2xl p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-green-800">✨ Create New Thought</h2>
                  <button
                    onClick={() => setShowCreateThought(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Thought Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thought Content
                    </label>
                    <textarea
                      value={newThoughtContent}
                      onChange={(e) => setNewThoughtContent(e.target.value)}
                      placeholder="Enter your thought here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={4}
                    />
                  </div>

                  {/* Agent Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agent
                    </label>
                    <select
                      value={newThoughtAgent}
                      onChange={(e) => setNewThoughtAgent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select an agent...</option>
                      {agents.length === 0 && (
                        <option value="CREATE_NEW">+ Create new agent "Thinker"</option>
                      )}
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.id})
                        </option>
                      ))}
                      {agents.length > 0 && (
                        <option value="CREATE_NEW">+ Create new agent</option>
                      )}
                    </select>
                    
                    {newThoughtAgent === 'CREATE_NEW' && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Enter agent name (e.g., Thinker, Explorer, Analyst)"
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Valence Sliders */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Valence (Emotional Fingerprint)
                    </label>
                    
                    {/* Curiosity Slider */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-green-600 font-medium">🧠 Curiosity</span>
                        <span className="text-sm text-gray-500">{newThoughtValence.curiosity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={newThoughtValence.curiosity}
                        onChange={(e) => setNewThoughtValence(prev => ({
                          ...prev,
                          curiosity: parseFloat(e.target.value)
                        }))}
                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-green"
                      />
                    </div>

                    {/* Certainty Slider */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-blue-600 font-medium">🎯 Certainty</span>
                        <span className="text-sm text-gray-500">{newThoughtValence.certainty.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={newThoughtValence.certainty}
                        onChange={(e) => setNewThoughtValence(prev => ({
                          ...prev,
                          certainty: parseFloat(e.target.value)
                        }))}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-blue"
                      />
                    </div>

                    {/* Dissonance Slider */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-red-600 font-medium">⚡ Dissonance</span>
                        <span className="text-sm text-gray-500">{newThoughtValence.dissonance.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={newThoughtValence.dissonance}
                        onChange={(e) => setNewThoughtValence(prev => ({
                          ...prev,
                          dissonance: parseFloat(e.target.value)
                        }))}
                        className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer slider-red"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={createManualThought}
                      disabled={isLoading || !newThoughtContent.trim() || !newThoughtAgent}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creating...' : 'Create Thought'}
                    </button>
                    <button
                      onClick={() => setShowCreateThought(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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

      <div className="flex-1 flex min-h-0">
        {/* Dedicated Agents Panel */}
        <AnimatePresence>
          {showAgentsPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">🤖 Cognitive Agents</h2>
                <button
                  onClick={() => setShowAgentsPanel(false)}
                  className="text-white hover:text-gray-200 text-sm"
                >
                  ←
                </button>
              </div>

              {/* Agent Filter Chips */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleAgentFilter('all')}
                    className={`px-3 py-1 text-sm rounded-full transition-all ${
                      agentFilters.includes('all')
                        ? 'bg-white text-indigo-600 shadow-md'
                        : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                    }`}
                  >
                    🌐 All
                  </button>
                  {agentsWithStats.slice(0, 3).map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => handleToggleAgentFilter(agent.id)}
                      className={`px-3 py-1 text-sm rounded-full transition-all flex items-center gap-2 ${
                        agentFilters.includes(agent.id)
                          ? 'bg-white text-indigo-600 shadow-md'
                          : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                      }`}
                    >
                      <span>{agent.avatar}</span>
                      <span className="max-w-20 truncate">{agent.name}</span>
                      <span className="bg-white bg-opacity-30 rounded-full px-2 text-xs">
                        {agent.thought_count}
                      </span>
                    </button>
                  ))}
                  {agentsWithStats.length > 3 && (
                    <span className="text-sm text-white text-opacity-70 px-2 py-1">
                      +{agentsWithStats.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Agent List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {agentsWithStats.map(agent => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white bg-opacity-10 rounded-lg p-3 hover:bg-opacity-20 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingAgent === agent.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingAgentName}
                                onChange={(e) => setEditingAgentName(e.target.value)}
                                className="text-sm font-medium bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 w-32"
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveAgentEdit(agent.id)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveAgentEdit(agent.id)}
                                className="text-green-300 hover:text-green-100 text-sm"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelAgentEdit}
                                className="text-red-300 hover:text-red-100 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-white truncate">{agent.name}</div>
                              <div className="text-xs text-white text-opacity-70 truncate">{agent.description}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editingAgent !== agent.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleFocusAgent(agent.id)}
                            className="text-white hover:text-yellow-200 text-sm p-1 rounded hover:bg-white hover:bg-opacity-10"
                            title="Focus"
                          >
                            🎯
                          </button>
                          <button
                            onClick={() => handleEditAgent(agent)}
                            className="text-white hover:text-blue-200 text-sm p-1 rounded hover:bg-white hover:bg-opacity-10"
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-white hover:text-red-200 text-sm p-1 rounded hover:bg-white hover:bg-opacity-10"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-white">{agent.thought_count}</div>
                        <div className="text-white text-opacity-70">Thoughts</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-white">
                          {new Date(agent.created_at).toLocaleDateString('en', {month: 'short', day: 'numeric'})}
                        </div>
                        <div className="text-white text-opacity-70">Created</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-white">
                          {agent.last_activity ? new Date(agent.last_activity).toLocaleDateString('en', {month: 'short', day: 'numeric'}) : 'Never'}
                        </div>
                        <div className="text-white text-opacity-70">Active</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Create Agent Button */}
              <div className="mt-4">
                <button
                  onClick={() => setShowAgentCreation(!showAgentCreation)}
                  className="w-full px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
                >
                  ✨ Create New Agent
                </button>
                
                {/* Agent Creation Form */}
                <AnimatePresence>
                  {showAgentCreation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3 bg-white bg-opacity-10 rounded-lg"
                    >
                      <input
                        type="text"
                        placeholder="Agent name..."
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded mb-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Agent description..."
                        value={newAgentDescription}
                        onChange={(e) => setNewAgentDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded mb-3 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateAgent}
                          disabled={isLoading || !newAgentName.trim()}
                          className="flex-1 px-3 py-2 bg-white text-indigo-600 rounded hover:bg-opacity-90 text-sm font-medium"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setShowAgentCreation(false);
                            setNewAgentName('');
                            setNewAgentDescription('');
                          }}
                          className="px-3 py-2 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button when collapsed */}
        {!showAgentsPanel && (
          <button
            onClick={() => setShowAgentsPanel(true)}
            className="w-12 bg-gradient-to-b from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:from-indigo-700 hover:to-purple-700 transition-all"
            title="Show Agents Panel"
          >
            🤖
          </button>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Main Canvas */}
          <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
            {activeTab === 'graph' && (
              <>
                <ReactFlow
                  ref={reactFlowInstance}
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-left"
                  style={{ width: '100%', height: '100%', minHeight: '100%' }}
                  className="w-full h-full"
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>

                {/* Floating Memory Suggestions Panel */}
                <AnimatePresence>
                  {showMemoryPanel && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: 50 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 50 }}
                      className="absolute top-4 right-4 w-96 max-h-[70vh] bg-white rounded-lg shadow-2xl border border-purple-200 z-50 overflow-hidden"
                      style={{ backdropFilter: 'blur(10px)' }}
                    >
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">💭 Memory Suggestions</h3>
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
                              className="text-white hover:text-purple-100 text-sm font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        {isLoadingMemory ? (
                          <div className="text-center py-8 text-purple-600">
                            <div className="animate-spin inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mr-2"></div>
                            Searching memories...
                          </div>
                        ) : memorySuggestions.length > 0 ? (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {memorySuggestions.map((suggestion, index) => (
                              <motion.div 
                                key={suggestion.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100 hover:border-purple-300 transition-all hover:shadow-md"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-xs text-purple-600 font-medium">
                                    {suggestion.agent_id !== agents.find(a => a.id === suggestion.agent_id)?.id 
                                      ? suggestion.agent_id 
                                      : agents.find(a => a.id === suggestion.agent_id)?.name || suggestion.agent_id}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                      {(suggestion.final_score * 100).toFixed(0)}% match
                                    </div>
                                    <button
                                      onClick={() => handleRecallMemory(suggestion)}
                                      disabled={selectedNodes.includes(suggestion.id)}
                                      className="px-3 py-1 bg-purple-500 text-white text-xs rounded-full hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {selectedNodes.includes(suggestion.id) ? '✓ Recalled' : 'Recall'}
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                                  {suggestion.content.length > 150 
                                    ? `${suggestion.content.substring(0, 150)}...` 
                                    : suggestion.content}
                                </div>
                                
                                <div className="flex gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    🧠 <strong>{(suggestion.similarity * 100).toFixed(0)}%</strong>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    💙 <strong>{(suggestion.valence_score * 100).toFixed(0)}%</strong>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    ⏰ {new Date(suggestion.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            <div className="text-4xl mb-2">🔍</div>
                            No matching memories found
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Thinking Animation */}
                <AnimatePresence>
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full shadow-2xl z-50"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5"
                        >
                          💭
                        </motion.div>
                        <span className="font-medium">{thinkingMessage}</span>
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ...
                        </motion.span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
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

            {/* Reset Layout Button */}
            <div>
              <button
                onClick={resetTreeLayout}
                className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                🔄 Reset Tree Layout
              </button>
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
                🔄 Transform (Process Conflicts & Questions)
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
                      Process cognitive conflicts through 5 AI-powered phases: 
                      <br />
                      <span className="text-xs text-gray-600">
                        🔥 Shattering → 🧠 Remembering → 💙 Re-feeling → 🎯 Re-centering → ✨ Becoming
                      </span>
                      {recalledNodes.length > 0 && (
                        <span className="block text-cyan-600 text-xs mt-1">
                          💭 {recalledNodes.length} memory{recalledNodes.length > 1 ? 'ies' : 'y'} will influence this transformation
                        </span>
                      )}
                    </p>
                    <input
                      type="text"
                      placeholder="What creates tension or questions about this thought?"
                      value={anomalyText}
                      onChange={(e) => setAnomalyText(e.target.value)}
                      className="w-full px-2 py-1 border rounded mb-2 text-sm"
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
          </div>
        </div>


      {/* Custom Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl p-6 w-96 max-w-[90vw]"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-red-800 mb-4">Reset World</h2>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to reset the entire world? 
                  This will delete all thoughts, agents, and events.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmedReset}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Yes, Reset World
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Success Message Modal */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl p-6 w-96 max-w-[90vw]"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-green-800 mb-4">Success!</h2>
                <p className="text-gray-700 mb-6 whitespace-pre-line">
                  {successMessage}
                </p>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Error Message Modal */}
      <AnimatePresence>
        {showErrorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl p-6 w-96 max-w-[90vw]"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">
                  {window.pendingAgentDelete ? '⚠️' : '❌'}
                </div>
                <h2 className="text-xl font-bold text-red-800 mb-4">
                  {window.pendingAgentDelete ? 'Confirm Delete' : 'Error'}
                </h2>
                <p className="text-gray-700 mb-6 whitespace-pre-line">
                  {errorMessage}
                </p>
                <div className="flex gap-3">
                  {window.pendingAgentDelete ? (
                    <>
                      <button
                        onClick={() => {
                          handleConfirmDeleteAgent();
                          setShowErrorMessage(false);
                        }}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => {
                          delete window.pendingAgentDelete;
                          setShowErrorMessage(false);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowErrorMessage(false)}
                      className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      OK
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Help Button */}
      <button
        onClick={() => setShowTutorial(true)}
        className="fixed bottom-6 left-6 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-[9999]"
        title="Show Tutorial"
      >
        <span className="text-xl">❓</span>
      </button>

      {/* Tutorial/Onboarding Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-[600px] max-w-[90vw] max-h-[80vh] overflow-y-auto"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to CEP-Web</h2>
                <p className="text-gray-600 mb-6">Advanced Cognitive Emergence Protocol</p>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    🚀 Get Started in 3 Simple Steps
                  </h3>
                  
                  <div className="space-y-4 text-left">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Select 1-3 Thoughts (T-units)</h4>
                        <p className="text-sm text-gray-600">Click on thought nodes in the graph to select them. They'll highlight in blue.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Click "Synthesis" or "Transform"</h4>
                        <p className="text-sm text-gray-600">
                          • <strong>Synthesis:</strong> Combine multiple thoughts into new insights<br/>
                          • <strong>Transform:</strong> Process conflicts/questions through 5 cognitive phases
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Watch New Thoughts Emerge!</h4>
                        <p className="text-sm text-gray-600">AI will generate new thoughts that appear connected to their parents. The camera will automatically focus on new creations.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">💡</span>
                    <h4 className="font-medium text-yellow-800">Pro Tips</h4>
                  </div>
                  <ul className="text-sm text-yellow-700 text-left space-y-1">
                    <li>• Use "✨ Create Thought" to add your own ideas with custom valence</li>
                    <li>• Select 1 thought to see memory suggestions in the floating panel</li>
                    <li>• Use "🌍 Reset World" for a fresh start anytime</li>
                    <li>• Drag nodes to reposition them - they'll stay where you put them!</li>
                  </ul>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={completeTutorial}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 font-medium"
                  >
                    Got it! Let's start exploring 🚀
                  </button>
                  <button
                    onClick={() => setShowTutorial(false)}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Skip
                  </button>
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  You can always access this tutorial again by clicking the ❓ button
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;