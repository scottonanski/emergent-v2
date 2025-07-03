import requests
import unittest
import json
import time
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from frontend/.env
load_dotenv('/app/frontend/.env')

class CEPWebAPITester:
    def __init__(self):
        # Get backend URL from environment variable
        self.base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://f0bb2cfb-1431-4ea0-9dc3-90ec72a48ea9.preview.emergentagent.com')
        self.api_url = f"{self.base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.t_unit_ids = []
        self.agent_ids = []
        print(f"Using backend API URL: {self.api_url}")

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_init_sample_data(self):
        """Test initializing sample data"""
        print("\n=== Testing Sample Data Initialization ===")
        success, response = self.run_test(
            "Initialize Sample Data",
            "POST",
            "init-sample-data",
            200,
            data={}
        )
        return success

    def test_get_t_units(self):
        """Test getting all T-units"""
        print("\n=== Testing T-Units Retrieval ===")
        success, response = self.run_test(
            "Get T-Units",
            "GET",
            "t-units",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} T-units")
            # Store T-unit IDs for later tests
            self.t_unit_ids = [t_unit["id"] for t_unit in response]
            
            # Validate T-unit structure
            if len(response) > 0:
                t_unit = response[0]
                required_fields = ["id", "content", "valence", "parents", "children", "linkage", "timestamp"]
                missing_fields = [field for field in required_fields if field not in t_unit]
                
                if missing_fields:
                    print(f"❌ T-unit missing required fields: {missing_fields}")
                    return False
                
                # Validate valence structure
                valence = t_unit["valence"]
                required_valence_fields = ["curiosity", "certainty", "dissonance"]
                missing_valence_fields = [field for field in required_valence_fields if field not in valence]
                
                if missing_valence_fields:
                    print(f"❌ Valence missing required fields: {missing_valence_fields}")
                    return False
                
                print("✅ T-unit structure validation passed")
            return True
        return False
        
    def test_get_t_units_by_agent(self):
        """Test getting T-units filtered by agent"""
        print("\n=== Testing T-Units Retrieval by Agent ===")
        
        if not self.agent_ids:
            print("❌ No agents available for T-unit filtering test")
            return False
        
        # Use the first agent for the filtering test
        agent_id = self.agent_ids[0]
        
        success, response = self.run_test(
            f"Get T-Units by Agent ({agent_id})",
            "GET",
            f"t-units?agent_id={agent_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} T-units for agent {agent_id}")
            
            # Validate that all T-units belong to the specified agent
            if len(response) > 0:
                for t_unit in response:
                    if "agent_id" not in t_unit or t_unit["agent_id"] != agent_id:
                        print(f"❌ T-unit {t_unit.get('id')} doesn't belong to agent {agent_id}")
                        return False
                
                print("✅ T-unit filtering by agent validation passed")
            return True
        return False

    def test_synthesize(self):
        """Test synthesizing T-units"""
        print("\n=== Testing Synthesis Operation ===")
        if len(self.t_unit_ids) < 3:
            print("❌ Not enough T-units for synthesis test")
            return False
        
        # Test with AI synthesis
        t_unit_ids_for_synthesis = self.t_unit_ids[:3]
        
        success, response = self.run_test(
            "Synthesize T-Units with AI",
            "POST",
            "synthesize",
            200,
            data={"t_unit_ids": t_unit_ids_for_synthesis, "use_ai": True}
        )
        
        if success:
            # Validate synthesis result
            if "id" not in response:
                print("❌ Synthesis response missing ID")
                return False
            
            if "content" not in response:
                print("❌ Synthesis content missing")
                return False
            
            if "parents" not in response or set(response["parents"]) != set(t_unit_ids_for_synthesis):
                print("❌ Synthesis parents don't match input T-units")
                return False
            
            # Check AI generation flag
            if "ai_generated" not in response or not response["ai_generated"]:
                print("❌ AI-generated flag not set correctly")
                return False
            
            print("✅ AI Synthesis validation passed")
            # Add the new T-unit ID to our list
            self.t_unit_ids.append(response["id"])
            
            # Now test without AI
            success, response = self.run_test(
                "Synthesize T-Units without AI",
                "POST",
                "synthesize",
                200,
                data={"t_unit_ids": t_unit_ids_for_synthesis, "use_ai": False}
            )
            
            if success:
                # Check that content starts with SYNTHESIS for non-AI synthesis
                if "content" not in response or not response["content"].startswith("SYNTHESIS:"):
                    print("❌ Non-AI synthesis content not properly formatted")
                    return False
                
                # Check AI generation flag is false
                if "ai_generated" not in response or response["ai_generated"]:
                    print("❌ AI-generated flag should be false for non-AI synthesis")
                    return False
                
                print("✅ Non-AI Synthesis validation passed")
                return True
        return False

    def test_transformation(self):
        """Test transforming a T-unit"""
        print("\n=== Testing Transformation Operation ===")
        if not self.t_unit_ids:
            print("❌ No T-units available for transformation test")
            return False
        
        # Select the first T-unit for transformation
        t_unit_id = self.t_unit_ids[0]
        
        # Test with AI transformation
        success, response = self.run_test(
            "Transform T-Unit with AI",
            "POST",
            "transform",
            200,
            data={"t_unit_id": t_unit_id, "anomaly": "Test anomaly for transformation", "use_ai": True}
        )
        
        if success:
            # Validate transformation result
            if not isinstance(response, list) or len(response) != 5:
                print(f"❌ Expected 5 transformation phases, got {len(response) if isinstance(response, list) else 'not a list'}")
                return False
            
            # Check if all phases are present
            phases = ["Shattering", "Remembering", "Re-feeling", "Re-centering", "Becoming"]
            phase_found = {phase: False for phase in phases}
            
            for t_unit in response:
                if "phase" in t_unit and t_unit["phase"] in phase_found:
                    phase_found[t_unit["phase"]] = True
                
                # Check AI generation flag
                if "ai_generated" not in t_unit or not t_unit["ai_generated"]:
                    print(f"❌ AI-generated flag not set correctly for phase {t_unit.get('phase')}")
                    return False
            
            missing_phases = [phase for phase, found in phase_found.items() if not found]
            if missing_phases:
                print(f"❌ Missing transformation phases: {missing_phases}")
                return False
            
            print("✅ AI Transformation validation passed")
            
            # Now test without AI
            success, response = self.run_test(
                "Transform T-Unit without AI",
                "POST",
                "transform",
                200,
                data={"t_unit_id": t_unit_id, "anomaly": "Test anomaly for basic transformation", "use_ai": False}
            )
            
            if success:
                # Check that content format for non-AI transformation
                for t_unit in response:
                    if "content" not in t_unit or not t_unit["content"].startswith(t_unit.get("phase", "").upper()):
                        print(f"❌ Non-AI transformation content not properly formatted for phase {t_unit.get('phase')}")
                        return False
                    
                    # Check AI generation flag is false
                    if "ai_generated" not in t_unit or t_unit["ai_generated"]:
                        print(f"❌ AI-generated flag should be false for non-AI transformation in phase {t_unit.get('phase')}")
                        return False
                
                print("✅ Non-AI Transformation validation passed")
                return True
        return False

    def test_create_t_unit(self):
        """Test creating a new T-unit"""
        print("\n=== Testing T-Unit Creation ===")
        
        # Create a test T-unit
        test_t_unit = {
            "content": "Test T-unit for tree structure validation",
            "valence": {
                "curiosity": 0.7,
                "certainty": 0.5,
                "dissonance": 0.3
            },
            "linkage": "test",
            "agent_id": "test_agent"
        }
        
        success, response = self.run_test(
            "Create T-Unit",
            "POST",
            "t-units",
            200,
            data=test_t_unit
        )
        
        if success:
            # Validate T-unit creation
            if "id" not in response:
                print("❌ Created T-unit missing ID")
                return False
            
            if "content" not in response or response["content"] != test_t_unit["content"]:
                print("❌ Created T-unit content doesn't match input")
                return False
            
            # Store the new T-unit ID for later tests
            self.t_unit_ids.append(response["id"])
            
            print("✅ T-unit creation validation passed")
            return True
        return False
    
    def test_get_t_unit_by_id(self):
        """Test getting a specific T-unit by ID"""
        print("\n=== Testing T-Unit Retrieval by ID ===")
        
        if not self.t_unit_ids:
            print("❌ No T-units available for ID retrieval test")
            return False
        
        # Get the first T-unit by ID
        t_unit_id = self.t_unit_ids[0]
        
        success, response = self.run_test(
            f"Get T-Unit by ID ({t_unit_id})",
            "GET",
            f"t-units/{t_unit_id}",
            200
        )
        
        if success:
            # Validate T-unit retrieval
            if "id" not in response or response["id"] != t_unit_id:
                print("❌ Retrieved T-unit ID doesn't match requested ID")
                return False
            
            # Validate T-unit structure
            required_fields = ["id", "content", "valence", "parents", "children", "linkage", "timestamp"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"❌ Retrieved T-unit missing required fields: {missing_fields}")
                return False
            
            print("✅ T-unit retrieval by ID validation passed")
            return True
        return False
    
    def test_create_agent(self):
        """Test creating a new agent"""
        print("\n=== Testing Agent Creation ===")
        
        # Create a test agent
        test_agent = {
            "name": "Test Agent",
            "description": "Agent created for testing purposes"
        }
        
        success, response = self.run_test(
            "Create Agent",
            "POST",
            "agents",
            200,
            data=test_agent
        )
        
        if success:
            # Validate agent creation
            if "id" not in response:
                print("❌ Created agent missing ID")
                return False
            
            if "name" not in response or response["name"] != test_agent["name"]:
                print("❌ Created agent name doesn't match input")
                return False
            
            # Store the new agent ID for later tests
            self.agent_ids.append(response["id"])
            
            print("✅ Agent creation validation passed")
            return True
        return False
    
    def test_update_agent(self):
        """Test updating an agent"""
        print("\n=== Testing Agent Update ===")
        
        if not self.agent_ids:
            print("❌ No agents available for update test")
            return False
        
        # Use the first agent for the update test
        agent_id = self.agent_ids[0]
        
        # Update the agent name
        update_data = {
            "name": "Updated Agent Name"
        }
        
        success, response = self.run_test(
            f"Update Agent ({agent_id})",
            "PUT",
            f"agents/{agent_id}",
            200,
            data=update_data
        )
        
        if success:
            # Validate agent update
            if "id" not in response or response["id"] != agent_id:
                print("❌ Updated agent ID doesn't match requested ID")
                return False
            
            if "name" not in response or response["name"] != update_data["name"]:
                print("❌ Agent name wasn't updated correctly")
                return False
            
            print("✅ Agent update validation passed")
            return True
        return False
    
    def test_delete_agent(self):
        """Test deleting an agent"""
        print("\n=== Testing Agent Deletion ===")
        
        # Create a new agent specifically for deletion
        test_agent = {
            "name": "Agent To Delete",
            "description": "This agent will be deleted in the test"
        }
        
        success, response = self.run_test(
            "Create Agent for Deletion",
            "POST",
            "agents",
            200,
            data=test_agent
        )
        
        if not success or "id" not in response:
            print("❌ Failed to create agent for deletion test")
            return False
        
        agent_id = response["id"]
        
        # Delete the agent
        success, response = self.run_test(
            f"Delete Agent ({agent_id})",
            "DELETE",
            f"agents/{agent_id}",
            200
        )
        
        if success:
            # Validate deletion response
            if "message" not in response or "deleted successfully" not in response["message"]:
                print("❌ Deletion response doesn't confirm successful deletion")
                return False
            
            # Verify the agent is actually gone by getting all agents and checking
            verify_success, agents_response = self.run_test(
                "Get All Agents After Deletion",
                "GET",
                "agents",
                200
            )
            
            if verify_success and isinstance(agents_response, list):
                # Check if the deleted agent ID is in the list
                deleted_agent_exists = any(agent["id"] == agent_id for agent in agents_response)
                
                if not deleted_agent_exists:
                    print("✅ Agent deletion validation passed")
                    return True
                else:
                    print("❌ Agent still exists after deletion")
                    return False
            return False
        return False
    
    def test_memory_suggestions(self):
        """Test memory suggestions"""
        print("\n=== Testing Memory Suggestions ===")
        
        if not self.t_unit_ids or not self.agent_ids:
            print("❌ No T-units or agents available for memory suggestions test")
            return False
        
        # Use the first T-unit and agent for the test
        t_unit_id = self.t_unit_ids[0]
        agent_id = self.agent_ids[0] if self.agent_ids else "agent_alpha"  # Fallback to sample agent
        
        memory_request = {
            "agent_id": agent_id,
            "t_unit_id": t_unit_id,
            "limit": 5,
            "include_cross_agent": True,
            "valence_weight": 0.3
        }
        
        success, response = self.run_test(
            "Get Memory Suggestions",
            "POST",
            "memory/suggest",
            200,
            data=memory_request
        )
        
        if success:
            # Validate memory suggestions
            if not isinstance(response, list):
                print("❌ Memory suggestions should be a list")
                return False
            
            print(f"Retrieved {len(response)} memory suggestions")
            
            # If we have suggestions, validate their structure
            if len(response) > 0:
                suggestion = response[0]
                required_fields = ["id", "content", "similarity", "valence_score", "final_score", "agent_id", "valence"]
                missing_fields = [field for field in required_fields if field not in suggestion]
                
                if missing_fields:
                    print(f"❌ Memory suggestion missing required fields: {missing_fields}")
                    return False
                
                print("✅ Memory suggestions validation passed")
            return True
        return False
    
    def test_multi_agent_exchange(self):
        """Test multi-agent exchange"""
        print("\n=== Testing Multi-Agent Exchange ===")
        
        if not self.t_unit_ids:
            print("❌ No T-units available for multi-agent exchange test")
            return False
        
        # Use sample agents if we don't have any from tests
        source_agent_id = self.agent_ids[0] if self.agent_ids else "agent_alpha"
        target_agent_id = self.agent_ids[1] if len(self.agent_ids) > 1 else "agent_beta"
        
        # Use the first T-unit for the exchange
        t_unit_id = self.t_unit_ids[0]
        
        exchange_request = {
            "source_agent_id": source_agent_id,
            "target_agent_id": target_agent_id,
            "t_unit_id": t_unit_id,
            "exchange_type": "test_exchange"
        }
        
        success, response = self.run_test(
            "Multi-Agent Exchange",
            "POST",
            "multi-agent/exchange",
            200,
            data=exchange_request
        )
        
        if success:
            # Validate exchange response
            if "message" not in response or "new_t_unit_id" not in response:
                print("❌ Exchange response missing required fields")
                return False
            
            # Store the new T-unit ID
            if "new_t_unit_id" in response:
                self.t_unit_ids.append(response["new_t_unit_id"])
            
            print("✅ Multi-agent exchange validation passed")
            return True
        return False
    
    def test_tree_structure(self):
        """Test tree structure relationships"""
        print("\n=== Testing Tree Structure Relationships ===")
        
        if len(self.t_unit_ids) < 3:
            print("❌ Not enough T-units for tree structure test")
            return False
        
        # First, create a synthesis to establish parent-child relationships
        t_unit_ids_for_synthesis = self.t_unit_ids[:2]
        
        success, synthesis_response = self.run_test(
            "Create Synthesis for Tree Structure",
            "POST",
            "synthesize",
            200,
            data={"t_unit_ids": t_unit_ids_for_synthesis, "use_ai": True}
        )
        
        if not success:
            return False
        
        # Get the synthesized T-unit
        synthesized_id = synthesis_response["id"]
        
        # Now check if parent T-units have the synthesized T-unit as a child
        parent_checks_passed = True
        for parent_id in t_unit_ids_for_synthesis:
            success, parent_response = self.run_test(
                f"Get Parent T-Unit ({parent_id})",
                "GET",
                f"t-units/{parent_id}",
                200
            )
            
            if not success:
                parent_checks_passed = False
                continue
            
            # Check if the synthesized T-unit is in the parent's children
            if "children" not in parent_response or synthesized_id not in parent_response["children"]:
                print(f"❌ Parent T-unit {parent_id} does not have synthesized T-unit {synthesized_id} as a child")
                parent_checks_passed = False
            
        # Check if the synthesized T-unit has the correct parents
        success, synthesized_response = self.run_test(
            f"Get Synthesized T-Unit ({synthesized_id})",
            "GET",
            f"t-units/{synthesized_id}",
            200
        )
        
        if not success:
            return False
        
        # Check if the synthesized T-unit has the correct parents
        if "parents" not in synthesized_response or set(synthesized_response["parents"]) != set(t_unit_ids_for_synthesis):
            print(f"❌ Synthesized T-unit does not have correct parents")
            return False
        
        if parent_checks_passed:
            print("✅ Tree structure parent-child relationships validation passed")
            return True
        return False
        
    def test_get_agents(self):
        """Test getting agents"""
        print("\n=== Testing Agents Retrieval ===")
        success, response = self.run_test(
            "Get Agents",
            "GET",
            "agents",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} agents")
            
            # Validate agent structure
            if len(response) > 0:
                agent = response[0]
                required_fields = ["id", "name", "description", "created_at", "avatar", "color"]
                missing_fields = [field for field in required_fields if field not in agent]
                
                if missing_fields:
                    print(f"❌ Agent missing required fields: {missing_fields}")
                    return False
                
                # Store agent IDs for later tests
                self.agent_ids = [agent["id"] for agent in response]
                
                print("✅ Agent structure validation passed")
            return True
        return False
        
    def test_get_agents_with_stats(self):
        """Test getting agents with statistics"""
        print("\n=== Testing Agents with Statistics ===")
        success, response = self.run_test(
            "Get Agents with Stats",
            "GET",
            "agents/stats",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} agents with stats")
            
            # Validate agent stats structure
            if len(response) > 0:
                agent_stats = response[0]
                required_fields = ["id", "name", "description", "created_at", "avatar", "color", "thought_count", "last_activity"]
                missing_fields = [field for field in required_fields if field not in agent_stats]
                
                if missing_fields:
                    print(f"❌ Agent stats missing required fields: {missing_fields}")
                    return False
                
                print("✅ Agent stats structure validation passed")
            return True
        return False
        
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n=== Testing Analytics Endpoints ===")
        
        # Test valence distribution
        success, response = self.run_test(
            "Get Valence Distribution",
            "GET",
            "analytics/valence-distribution",
            200
        )
        
        if not success:
            return False
            
        # Validate valence distribution structure
        required_fields = ["curiosity", "certainty", "dissonance"]
        missing_fields = [field for field in required_fields if field not in response]
        
        if missing_fields:
            print(f"❌ Valence distribution missing required fields: {missing_fields}")
            return False
            
        # Test cognitive timeline
        success, response = self.run_test(
            "Get Cognitive Timeline",
            "GET",
            "analytics/cognitive-timeline",
            200
        )
        
        if not success:
            return False
            
        # Validate timeline structure
        if not isinstance(response, list):
            print("❌ Cognitive timeline should be a list")
            return False
            
        if len(response) > 0:
            event = response[0]
            required_fields = ["timestamp", "type", "t_unit_id"]
            missing_fields = [field for field in required_fields if field not in event]
            
            if missing_fields:
                print(f"❌ Timeline event missing required fields: {missing_fields}")
                return False
        
        print("✅ Analytics endpoints validation passed")
        return True
        
    def test_genesis_export(self):
        """Test genesis log export"""
        print("\n=== Testing Genesis Log Export ===")
        success, response = self.run_test(
            "Export Genesis Log",
            "GET",
            "genesis/export",
            200
        )
        
        if success:
            # Validate genesis log structure
            required_fields = ["t_units", "events", "agents", "exported_at", "version"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"❌ Genesis log missing required fields: {missing_fields}")
                return False
                
            print("✅ Genesis log export validation passed")
            return True
        return False

    def test_get_events(self):
        """Test getting events"""
        print("\n=== Testing Events Retrieval ===")
        success, response = self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} events")
            
            # Validate event structure
            if len(response) > 0:
                event = response[0]
                required_fields = ["id", "type", "t_unit_id", "timestamp", "metadata"]
                missing_fields = [field for field in required_fields if field not in event]
                
                if missing_fields:
                    print(f"❌ Event missing required fields: {missing_fields}")
                    return False
                
                print("✅ Event structure validation passed")
            return True
        return False
        
    def run_all_tests(self):
        """Run all API tests"""
        print("\n======= CEP-Web API Test Suite =======")
        
        # Initialize sample data
        if not self.test_init_sample_data():
            print("❌ Sample data initialization failed, stopping tests")
            return False
        
        # Get T-units
        if not self.test_get_t_units():
            print("❌ T-unit retrieval failed, stopping tests")
            return False
        
        # Create a new T-unit
        create_t_unit_result = self.test_create_t_unit()
        
        # Get a specific T-unit by ID
        get_t_unit_by_id_result = self.test_get_t_unit_by_id()
        
        # Get agents
        get_agents_result = self.test_get_agents()
        
        # Get agents with stats
        get_agents_with_stats_result = self.test_get_agents_with_stats()
        
        # Create a new agent
        create_agent_result = self.test_create_agent()
        
        # Update an agent
        update_agent_result = self.test_update_agent()
        
        # Delete an agent
        delete_agent_result = self.test_delete_agent()
        
        # Get T-units filtered by agent
        get_t_units_by_agent_result = self.test_get_t_units_by_agent()
        
        # Test synthesis
        synthesis_result = self.test_synthesize()
        
        # Test transformation
        transformation_result = self.test_transformation()
        
        # Test memory suggestions
        memory_suggestions_result = self.test_memory_suggestions()
        
        # Test multi-agent exchange
        multi_agent_exchange_result = self.test_multi_agent_exchange()
        
        # Test tree structure relationships
        tree_structure_result = self.test_tree_structure()
        
        # Get events
        events_result = self.test_get_events()
        
        # Test analytics endpoints
        analytics_result = self.test_analytics_endpoints()
        
        # Test genesis export
        genesis_export_result = self.test_genesis_export()
        
        # Print results
        print("\n======= Test Results =======")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Sample data initialization: {'✅' if self.test_init_sample_data else '❌'}")
        print(f"T-unit retrieval: {'✅' if self.test_get_t_units else '❌'}")
        print(f"T-unit creation: {'✅' if create_t_unit_result else '❌'}")
        print(f"T-unit retrieval by ID: {'✅' if get_t_unit_by_id_result else '❌'}")
        print(f"T-unit filtering by agent: {'✅' if get_t_units_by_agent_result else '❌'}")
        print(f"Agent retrieval: {'✅' if get_agents_result else '❌'}")
        print(f"Agent stats retrieval: {'✅' if get_agents_with_stats_result else '❌'}")
        print(f"Agent creation: {'✅' if create_agent_result else '❌'}")
        print(f"Agent update: {'✅' if update_agent_result else '❌'}")
        print(f"Agent deletion: {'✅' if delete_agent_result else '❌'}")
        print(f"Synthesis operation: {'✅' if synthesis_result else '❌'}")
        print(f"Transformation operation: {'✅' if transformation_result else '❌'}")
        print(f"Memory suggestions: {'✅' if memory_suggestions_result else '❌'}")
        print(f"Multi-agent exchange: {'✅' if multi_agent_exchange_result else '❌'}")
        print(f"Tree structure relationships: {'✅' if tree_structure_result else '❌'}")
        print(f"Events retrieval: {'✅' if events_result else '❌'}")
        print(f"Analytics endpoints: {'✅' if analytics_result else '❌'}")
        print(f"Genesis export: {'✅' if genesis_export_result else '❌'}")
        
        return self.tests_passed == self.tests_run

def test_enhanced_agent_panel():
    """Run tests specifically for the Enhanced Agent Panel functionality"""
    tester = CEPWebAPITester()
    print("\n======= Enhanced Agent Panel Test Suite =======")
    
    # Initialize sample data
    if not tester.test_init_sample_data():
        print("❌ Sample data initialization failed, stopping tests")
        return False
    
    # Get agents to have a baseline
    if not tester.test_get_agents():
        print("❌ Agent retrieval failed, stopping tests")
        return False
    
    # Test 1: Agent Stats Endpoint
    print("\n=== Testing Agent Stats Endpoint ===")
    success, response = tester.run_test(
        "Get Agents with Stats",
        "GET",
        "agents/stats",
        200
    )
    
    if success and isinstance(response, list):
        print(f"Retrieved {len(response)} agents with stats")
        
        # Validate agent stats structure
        if len(response) > 0:
            agent_stats = response[0]
            required_fields = ["id", "name", "description", "created_at", "avatar", "color", "thought_count", "last_activity"]
            missing_fields = [field for field in required_fields if field not in agent_stats]
            
            if missing_fields:
                print(f"❌ Agent stats missing required fields: {missing_fields}")
                agent_stats_test = False
            else:
                print("✅ Agent stats structure validation passed")
                agent_stats_test = True
        else:
            agent_stats_test = True
    else:
        agent_stats_test = False
    
    # Test 2: Create Agent with Auto-assigned Avatar and Color
    print("\n=== Testing Agent Creation with Auto-assigned Avatar and Color ===")
    
    # Create a test agent without specifying avatar and color
    test_agent = {
        "name": "Auto Avatar Agent",
        "description": "Agent created to test auto-assigned avatar and color"
    }
    
    success, response = tester.run_test(
        "Create Agent with Auto-assigned Avatar and Color",
        "POST",
        "agents",
        200,
        data=test_agent
    )
    
    if success:
        # Validate agent creation with auto-assigned avatar and color
        if "id" not in response:
            print("❌ Created agent missing ID")
            auto_avatar_test = False
        elif "avatar" not in response:
            print("❌ Created agent missing avatar")
            auto_avatar_test = False
        elif "color" not in response:
            print("❌ Created agent missing color")
            auto_avatar_test = False
        else:
            # Check if avatar is from the expected pool
            avatars = ["🤖", "🧠", "👤", "🌀", "⚡", "🔮", "🎭", "🦋"]
            colors = ["#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#84cc16"]
            
            if response["avatar"] not in avatars:
                print(f"❌ Avatar {response['avatar']} not from expected pool {avatars}")
                auto_avatar_test = False
            elif response["color"] not in colors:
                print(f"❌ Color {response['color']} not from expected palette {colors}")
                auto_avatar_test = False
            else:
                print(f"✅ Agent created with auto-assigned avatar {response['avatar']} and color {response['color']}")
                auto_avatar_test = True
                # Store the agent ID for later tests
                auto_agent_id = response["id"]
                tester.agent_ids.append(auto_agent_id)
    else:
        auto_avatar_test = False
    
    # Test 3: Create Agent with Specific Avatar and Color
    print("\n=== Testing Agent Creation with Specific Avatar and Color ===")
    
    # Create a test agent with specific avatar and color
    test_agent_specific = {
        "name": "Specific Avatar Agent",
        "description": "Agent created with specific avatar and color",
        "avatar": "🔮",
        "color": "#10b981"
    }
    
    success, response = tester.run_test(
        "Create Agent with Specific Avatar and Color",
        "POST",
        "agents",
        200,
        data=test_agent_specific
    )
    
    if success:
        # Validate agent creation with specific avatar and color
        if "id" not in response:
            print("❌ Created agent missing ID")
            specific_avatar_test = False
        elif "avatar" not in response or response["avatar"] != test_agent_specific["avatar"]:
            print(f"❌ Avatar not set correctly. Expected {test_agent_specific['avatar']}, got {response.get('avatar')}")
            specific_avatar_test = False
        elif "color" not in response or response["color"] != test_agent_specific["color"]:
            print(f"❌ Color not set correctly. Expected {test_agent_specific['color']}, got {response.get('color')}")
            specific_avatar_test = False
        else:
            print(f"✅ Agent created with specific avatar {response['avatar']} and color {response['color']}")
            specific_avatar_test = True
            # Store the agent ID for later tests
            specific_agent_id = response["id"]
            tester.agent_ids.append(specific_agent_id)
    else:
        specific_avatar_test = False
    
    # Test 4: Update Agent Name (Rename functionality)
    print("\n=== Testing Agent Rename Functionality ===")
    
    if not hasattr(tester, 'agent_ids') or not tester.agent_ids:
        print("❌ No agents available for rename test")
        rename_test = False
    else:
        # Use the auto-assigned agent for the rename test
        agent_id = tester.agent_ids[0]
        
        # Update the agent name
        update_data = {
            "name": "Renamed Agent"
        }
        
        success, response = tester.run_test(
            f"Rename Agent ({agent_id})",
            "PUT",
            f"agents/{agent_id}",
            200,
            data=update_data
        )
        
        if success:
            # Validate agent rename
            if "id" not in response or response["id"] != agent_id:
                print("❌ Updated agent ID doesn't match requested ID")
                rename_test = False
            elif "name" not in response or response["name"] != update_data["name"]:
                print("❌ Agent name wasn't updated correctly")
                rename_test = False
            else:
                print("✅ Agent rename validation passed")
                rename_test = True
        else:
            rename_test = False
    
    # Test 5: Create T-unit for Agent and Verify Stats Update
    print("\n=== Testing Agent Stats Update with New T-unit ===")
    
    if not hasattr(tester, 'agent_ids') or not tester.agent_ids:
        print("❌ No agents available for stats update test")
        stats_update_test = False
    else:
        # Use the auto-assigned agent for the stats update test
        agent_id = tester.agent_ids[0]
        
        # Get initial stats
        success, initial_stats_response = tester.run_test(
            f"Get Initial Agent Stats ({agent_id})",
            "GET",
            "agents/stats",
            200
        )
        
        if not success:
            print("❌ Failed to get initial agent stats")
            stats_update_test = False
        else:
            # Find our agent in the stats
            initial_agent_stats = None
            for agent in initial_stats_response:
                if agent["id"] == agent_id:
                    initial_agent_stats = agent
                    break
            
            if not initial_agent_stats:
                print(f"❌ Agent {agent_id} not found in stats response")
                stats_update_test = False
            else:
                initial_thought_count = initial_agent_stats.get("thought_count", 0)
                
                # Create a new T-unit for this agent
                test_t_unit = {
                    "content": "Test T-unit for agent stats update",
                    "valence": {
                        "curiosity": 0.7,
                        "certainty": 0.5,
                        "dissonance": 0.3
                    },
                    "linkage": "test",
                    "agent_id": agent_id
                }
                
                success, t_unit_response = tester.run_test(
                    f"Create T-Unit for Agent {agent_id}",
                    "POST",
                    "t-units",
                    200,
                    data=test_t_unit
                )
                
                if not success:
                    print("❌ Failed to create T-unit for agent")
                    stats_update_test = False
                else:
                    # Get updated stats
                    success, updated_stats_response = tester.run_test(
                        f"Get Updated Agent Stats ({agent_id})",
                        "GET",
                        "agents/stats",
                        200
                    )
                    
                    if not success:
                        print("❌ Failed to get updated agent stats")
                        stats_update_test = False
                    else:
                        # Find our agent in the updated stats
                        updated_agent_stats = None
                        for agent in updated_stats_response:
                            if agent["id"] == agent_id:
                                updated_agent_stats = agent
                                break
                        
                        if not updated_agent_stats:
                            print(f"❌ Agent {agent_id} not found in updated stats response")
                            stats_update_test = False
                        else:
                            updated_thought_count = updated_agent_stats.get("thought_count", 0)
                            
                            # Check if thought count increased
                            if updated_thought_count <= initial_thought_count:
                                print(f"❌ Thought count didn't increase. Initial: {initial_thought_count}, Updated: {updated_thought_count}")
                                stats_update_test = False
                            else:
                                print(f"✅ Thought count increased from {initial_thought_count} to {updated_thought_count}")
                                
                                # Check if last_activity was updated
                                if "last_activity" not in updated_agent_stats:
                                    print("❌ last_activity field missing in updated stats")
                                    stats_update_test = False
                                else:
                                    print("✅ last_activity field present in updated stats")
                                    stats_update_test = True
    
    # Test 6: Agent Filtering (T-units by agent)
    print("\n=== Testing Agent Filtering ===")
    
    if not hasattr(tester, 'agent_ids') or not tester.agent_ids:
        print("❌ No agents available for filtering test")
        filtering_test = False
    else:
        # Use the auto-assigned agent for the filtering test
        agent_id = tester.agent_ids[0]
        
        success, response = tester.run_test(
            f"Get T-Units by Agent ({agent_id})",
            "GET",
            f"t-units?agent_id={agent_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} T-units for agent {agent_id}")
            
            # Validate that all T-units belong to the specified agent
            if len(response) > 0:
                all_match = True
                for t_unit in response:
                    if "agent_id" not in t_unit or t_unit["agent_id"] != agent_id:
                        print(f"❌ T-unit {t_unit.get('id')} doesn't belong to agent {agent_id}")
                        all_match = False
                
                if all_match:
                    print("✅ T-unit filtering by agent validation passed")
                    filtering_test = True
                else:
                    filtering_test = False
            else:
                print("⚠️ No T-units found for agent, but endpoint returned successfully")
                filtering_test = True
        else:
            filtering_test = False
    
    # Test 7: Delete Agent
    print("\n=== Testing Agent Deletion ===")
    
    # Create a new agent specifically for deletion
    test_agent = {
        "name": "Agent To Delete",
        "description": "This agent will be deleted in the test"
    }
    
    success, response = tester.run_test(
        "Create Agent for Deletion",
        "POST",
        "agents",
        200,
        data=test_agent
    )
    
    if not success or "id" not in response:
        print("❌ Failed to create agent for deletion test")
        deletion_test = False
    else:
        agent_id = response["id"]
        
        # Delete the agent
        success, response = tester.run_test(
            f"Delete Agent ({agent_id})",
            "DELETE",
            f"agents/{agent_id}",
            200
        )
        
        if success:
            # Validate deletion response
            if "message" not in response or "deleted successfully" not in response["message"]:
                print("❌ Deletion response doesn't confirm successful deletion")
                deletion_test = False
            else:
                # Verify the agent is actually gone by getting all agents and checking
                verify_success, agents_response = tester.run_test(
                    "Get All Agents After Deletion",
                    "GET",
                    "agents",
                    200
                )
                
                if verify_success and isinstance(agents_response, list):
                    # Check if the deleted agent ID is in the list
                    deleted_agent_exists = any(agent["id"] == agent_id for agent in agents_response)
                    
                    if not deleted_agent_exists:
                        print("✅ Agent deletion validation passed")
                        deletion_test = True
                    else:
                        print("❌ Agent still exists after deletion")
                        deletion_test = False
                else:
                    deletion_test = False
        else:
            deletion_test = False
    
    # Print results
    print("\n======= Enhanced Agent Panel Test Results =======")
    print(f"Agent Stats Endpoint: {'✅' if agent_stats_test else '❌'}")
    print(f"Auto-assigned Avatar and Color: {'✅' if auto_avatar_test else '❌'}")
    print(f"Specific Avatar and Color: {'✅' if specific_avatar_test else '❌'}")
    print(f"Agent Rename Functionality: {'✅' if rename_test else '❌'}")
    print(f"Agent Stats Update: {'✅' if stats_update_test else '❌'}")
    print(f"Agent Filtering: {'✅' if filtering_test else '❌'}")
    print(f"Agent Deletion: {'✅' if deletion_test else '❌'}")
    
    overall_success = (
        agent_stats_test and 
        auto_avatar_test and 
        specific_avatar_test and 
        rename_test and 
        stats_update_test and 
        filtering_test and 
        deletion_test
    )
    
    print(f"\nOverall Enhanced Agent Panel Test Result: {'✅ PASSED' if overall_success else '❌ FAILED'}")
    return overall_success

if __name__ == "__main__":
    # Run the enhanced agent panel tests
    test_enhanced_agent_panel()
    
    # Alternatively, run all tests
    # tester = CEPWebAPITester()
    # tester.run_all_tests()