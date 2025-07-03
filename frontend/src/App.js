import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom T-unit Node Component
const TUnitNode = ({ data }) => {
  const getNodeColor = (valence) => {
    // Determine dominant valence for coloring
    const { curiosity, certainty, dissonance } = valence;
    
    if (dissonance > 0.6) return '#ff8b94'; // High dissonance - red
    if (curiosity > 0.6) return '#a8e6cf'; // High curiosity - green
    if (certainty > 0.6) return '#dcedc1'; // High certainty - light green
    return '#ffd3a5'; // Default - orange
  };

  const getValenceIntensity = (valence) => {
    const max = Math.max(valence.curiosity, valence.certainty, valence.dissonance);
    return max;
  };

  return (
    <div 
      className="px-4 py-2 shadow-lg rounded-lg border-2 border-gray-400 bg-white max-w-xs"
      style={{ 
        backgroundColor: getNodeColor(data.valence),
        opacity: 0.7 + (getValenceIntensity(data.valence) * 0.3)
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="font-bold text-sm mb-1">{data.phase || 'T-Unit'}</div>
      <div className="text-xs text-gray-800 mb-2 max-h-12 overflow-hidden">
        {data.content.substring(0, 50)}...
      </div>
      <div className="text-xs grid grid-cols-3 gap-1">
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
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom edge styles
const edgeOptions = {
  animated: true,
  style: {
    stroke: '#1f2937',
    strokeWidth: 2,
  },
};

const nodeTypes = {
  tunit: TUnitNode,
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tUnits, setTUnits] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [showTransformation, setShowTransformation] = useState(false);
  const [anomalyText, setAnomalyText] = useState('');
  const [events, setEvents] = useState([]);

  // Fetch T-units from backend
  const fetchTUnits = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/t-units`);
      setTUnits(response.data);
    } catch (error) {
      console.error('Error fetching T-units:', error);
    }
  }, []);

  // Fetch events from backend
  const fetchEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  // Convert T-units to graph nodes and edges
  const convertTUnitsToGraph = useCallback((tUnits) => {
    // Create nodes
    const graphNodes = tUnits.map((tUnit, index) => ({
      id: tUnit.id,
      type: 'tunit',
      position: { 
        x: (index % 4) * 300 + Math.random() * 50, 
        y: Math.floor(index / 4) * 200 + Math.random() * 50 
      },
      data: {
        content: tUnit.content,
        valence: tUnit.valence,
        phase: tUnit.phase,
        linkage: tUnit.linkage,
        timestamp: tUnit.timestamp
      },
      selected: selectedNodes.includes(tUnit.id)
    }));

    // Create edges from parent-child relationships
    const graphEdges = [];
    tUnits.forEach(tUnit => {
      tUnit.children.forEach(childId => {
        if (tUnits.find(t => t.id === childId)) {
          graphEdges.push({
            id: `${tUnit.id}-${childId}`,
            source: tUnit.id,
            target: childId,
            label: tUnit.linkage,
            ...edgeOptions
          });
        }
      });
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [selectedNodes, setNodes, setEdges]);

  // Initialize sample data
  const initSampleData = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API}/init-sample-data`);
      await fetchTUnits();
      await fetchEvents();
    } catch (error) {
      console.error('Error initializing sample data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle node selection
  const onNodeClick = (event, node) => {
    setSelectedNodes(prev => {
      if (prev.includes(node.id)) {
        return prev.filter(id => id !== node.id);
      } else {
        return [...prev, node.id];
      }
    });
  };

  // Handle synthesis
  const handleSynthesis = async () => {
    if (selectedNodes.length < 3) {
      alert('Please select at least 3 T-units for synthesis');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API}/synthesize`, {
        t_unit_ids: selectedNodes
      });
      await fetchTUnits();
      await fetchEvents();
      setSelectedNodes([]);
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
      await axios.post(`${API}/transform`, {
        t_unit_id: selectedNodes[0],
        anomaly: anomalyText
      });
      await fetchTUnits();
      await fetchEvents();
      setSelectedNodes([]);
      setShowTransformation(false);
      setAnomalyText('');
    } catch (error) {
      console.error('Error during transformation:', error);
      alert('Error during transformation');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on component mount
  useEffect(() => {
    fetchTUnits();
    fetchEvents();
  }, [fetchTUnits, fetchEvents]);

  // Update graph when T-units change
  useEffect(() => {
    convertTUnitsToGraph(tUnits);
  }, [tUnits, convertTUnitsToGraph]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Cognitive Emergence Protocol</h1>
          <div className="flex gap-2">
            <button
              onClick={initSampleData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Initialize Sample Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Control Panel */}
        <div className="w-80 bg-white shadow-lg p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Control Panel</h2>
            
            {/* Selection Info */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">Selected T-units: {selectedNodes.length}</h3>
              {selectedNodes.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedNodes.map(id => {
                    const tUnit = tUnits.find(t => t.id === id);
                    return tUnit ? (
                      <div key={id} className="mb-1">
                        {tUnit.content.substring(0, 30)}...
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Synthesis */}
            <div className="mb-4">
              <button
                onClick={() => setShowSynthesis(!showSynthesis)}
                disabled={selectedNodes.length < 3}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Synthesis (3+ T-units)
              </button>
              {showSynthesis && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <p className="text-sm mb-2">Combine selected T-units into a new emergent T-unit</p>
                  <button
                    onClick={handleSynthesis}
                    disabled={isLoading}
                    className="w-full px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Execute Synthesis
                  </button>
                </div>
              )}
            </div>

            {/* Transformation */}
            <div className="mb-4">
              <button
                onClick={() => setShowTransformation(!showTransformation)}
                disabled={selectedNodes.length !== 1}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                Transformation (1 T-unit)
              </button>
              {showTransformation && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <p className="text-sm mb-2">Transform through 5 phases</p>
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
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Valence Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-300 rounded mr-2"></div>
                <span>High Dissonance</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-300 rounded mr-2"></div>
                <span>High Curiosity</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-lime-200 rounded mr-2"></div>
                <span>High Certainty</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                C = Curiosity, Ct = Certainty, D = Dissonance
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <h3 className="font-medium mb-2">Recent Events</h3>
            <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {events.slice(0, 10).map((event, index) => (
                <div key={event.id} className="p-2 bg-gray-50 rounded">
                  <div className="font-medium">{event.type}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graph Visualization */}
        <div className="flex-1 relative">
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
        </div>
      </div>
    </div>
  );
}

export default App;