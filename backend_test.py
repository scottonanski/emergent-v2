import requests
import unittest
import json
import time
from typing import List, Dict, Any

class CEPWebAPITester:
    def __init__(self, base_url="https://a1c6a2e9-f7ee-4d24-8e40-7c1d4b81f454.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.t_unit_ids = []
        self.agent_ids = []

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
                required_fields = ["id", "name", "description", "created_at"]
                missing_fields = [field for field in required_fields if field not in agent]
                
                if missing_fields:
                    print(f"❌ Agent missing required fields: {missing_fields}")
                    return False
                
                # Store agent IDs for later tests
                self.agent_ids = [agent["id"] for agent in response]
                
                print("✅ Agent structure validation passed")
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
        
        # Test synthesis
        synthesis_result = self.test_synthesize()
        
        # Test transformation
        transformation_result = self.test_transformation()
        
        # Get events
        events_result = self.test_get_events()
        
        # Print results
        print("\n======= Test Results =======")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Sample data initialization: {'✅' if self.test_init_sample_data else '❌'}")
        print(f"T-unit retrieval: {'✅' if self.test_get_t_units else '❌'}")
        print(f"Synthesis operation: {'✅' if synthesis_result else '❌'}")
        print(f"Transformation operation: {'✅' if transformation_result else '❌'}")
        print(f"Events retrieval: {'✅' if events_result else '❌'}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = CEPWebAPITester()
    tester.run_all_tests()