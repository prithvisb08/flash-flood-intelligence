import heapq
import math
from typing import List, Dict, Tuple, Optional, Any

# Synthetic Graph Networks for specific locations (Nodes: (Lat, Lng), Edges connecting them)
# Node names: "Start", "SafeZone", or intersection names
GRAPHS = {
    "WG-001": { # Wayanad
        "nodes": {
            "N1_Chooralmala_Center": (11.554, 76.132), # High Risk Zone (Sensor Location)
            "N2_Tea_Estate_Road": (11.560, 76.135),
            "N3_Mundakkai_Junction": (11.558, 76.140),
            "N4_River_Bridge": (11.552, 76.138),
            "N5_Hill_Ascent": (11.565, 76.145),
            "N6_SafeZone_Meppadi": (11.570, 76.150) # Safe Zone
        },
        "edges": {
            # (Node A, Node B): Base Distance/Cost
            ("N1_Chooralmala_Center", "N2_Tea_Estate_Road"): 1.2,
            ("N1_Chooralmala_Center", "N4_River_Bridge"): 0.8,
            ("N2_Tea_Estate_Road", "N3_Mundakkai_Junction"): 1.5,
            ("N4_River_Bridge", "N3_Mundakkai_Junction"): 2.0,
            ("N3_Mundakkai_Junction", "N5_Hill_Ascent"): 2.5,
            ("N2_Tea_Estate_Road", "N5_Hill_Ascent"): 3.0,
            ("N5_Hill_Ascent", "N6_SafeZone_Meppadi"): 1.5
        }
    },
    "UK-001": { # Devprayag
         "nodes": {
            "N1_Sangam_Ghat": (30.145, 78.595), # High Risk
            "N2_Market_Street": (30.148, 78.597),
            "N3_Badrinath_Highway": (30.150, 78.600),
            "N4_Suspension_Bridge": (30.142, 78.598),
            "N5_Upper_Terrace": (30.155, 78.605),
            "N6_SafeZone_GovtCollege": (30.160, 78.610)
        },
        "edges": {
            ("N1_Sangam_Ghat", "N2_Market_Street"): 0.5,
            ("N1_Sangam_Ghat", "N4_Suspension_Bridge"): 0.6,
            ("N2_Market_Street", "N3_Badrinath_Highway"): 1.0,
            ("N4_Suspension_Bridge", "N3_Badrinath_Highway"): 1.2,
            ("N3_Badrinath_Highway", "N5_Upper_Terrace"): 1.5,
            ("N5_Upper_Terrace", "N6_SafeZone_GovtCollege"): 1.0
        }
    }
}

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    R = 6371  # Radius of the earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_dynamic_edge_weight(u, v, base_weight, risk_level):
    """
    Adjusts edge weight based on the regional risk level.
    If risk is CRITICAL, roads near the epicenter (Node 1) are severely penalized.
    """
    multiplier = 1.0
    # If the edge connects to the epicenter (usually N1, N4, Epicenter, or Bridge)
    if "Center" in u or "Center" in v or "Ghat" in u or "Ghat" in v or "Bridge" in u or "Bridge" in v or "Epicenter" in u or "Epicenter" in v or "Valley_Road" in u or "Valley_Road" in v:
        if risk_level == "CRITICAL":
            multiplier = 999.0 # Effectively impassable
        elif risk_level == "HIGH":
            multiplier = 5.0
        elif risk_level == "MODERATE":
            multiplier = 1.5
    
    return base_weight * multiplier

LOCATION_COORDS = {
    "UK-001": (30.145, 78.595, "Govt Inter College & High Grounds"),
    "UK-002": (30.550, 79.566, "Army Cantonment Hill Shelter"),
    "UK-003": (30.735, 79.066, "GMVN Helipad Ridge Compound"),
    "UK-004": (30.285, 78.981, "District Hospital Higher Terrace"),
    "UK-005": (29.583, 80.218, "Pithoragarh Fort Plateau"),
    "UK-006": (30.727, 78.446, "Nehru Stadium High Ground"),
    "HP-001": (32.243, 77.189, "Atal Bihari Mountaineering Ground"),
    "HP-002": (31.957, 77.109, "Dhalpur Ground & High Ridge"),
    "HP-003": (32.219, 76.323, "Police Ground Upper Campus"),
    "HP-004": (31.104, 77.173, "Annandale Plateau Shelter"),
    "HP-005": (31.597, 78.174, "Kalpa Monastery Grounds"),
    "HP-006": (31.714, 76.932, "Paddal Ground Elevated Zone"),
    "JK-001": (34.083, 74.797, "Shankaracharya Hill Complex"),
    "JK-002": (33.729, 75.154, "Achabal Garden Plateau"),
    "JK-003": (33.379, 74.312, "Army Garrison Higher Grounds"),
    "NE-001": (25.270, 91.732, "Ramakrishna Mission High Plateau"),
    "NE-002": (27.338, 88.606, "Paljor Stadium Elevated Complex"),
    "NE-003": (25.183, 93.016, "Circuit House Hilltop Shelter"),
    "NE-004": (27.084, 93.605, "Rajiv Gandhi Stadium Complex"),
    "NE-005": (24.817, 93.950, "Kangla Fort Plateau"),
    "NE-006": (23.727, 92.717, "Assam Rifles Ground"),
    "NE-007": (25.674, 94.110, "War Cemetery Ridge"),
    "NE-008": (25.297, 91.583, "Community Hall Upper Plateau"),
    "WG-001": (11.554, 76.132, "Meppadi Higher Secondary Hill Campus"),
    "WG-002": (10.088, 77.059, "Tata High Altitude Ground"),
    "WG-003": (17.923, 73.658, "Table Land High Rock Plateau"),
    "WG-004": (12.424, 75.738, "Madikeri Fort Elevated Complex"),
    "WG-005": (11.413, 76.695, "Botanical Garden Plateau"),
    "WG-006": (9.852, 76.971, "Idukki Colony Higher Ground"),
    "WG-007": (15.964, 74.003, "Amboli Forest Rest House"),
    "WG-008": (15.228, 74.152, "Sanguem Municipal Ground"),
}

def generate_procedural_graph(location_id: str, lat: float, lng: float, safe_zone: Optional[str] = None):
    safe_label = safe_zone if safe_zone else "Safe Zone High Grounds"
    # Procedural topography nodes navigating up from epicenter towards higher ground
    nodes = {
        f"N1_{location_id}_Epicenter": (lat, lng),
        f"N2_Valley_Road": (lat + 0.003, lng + 0.002),
        f"N3_Cross_Junction": (lat + 0.007, lng + 0.005),
        f"N4_Ridge_Bypass": (lat + 0.004, lng + 0.008),
        f"N5_High_Terrace": (lat + 0.010, lng + 0.011),
        f"N6_SafeZone_{safe_label[:15].strip()}": (lat + 0.014, lng + 0.015)
    }
    edges = {
        (f"N1_{location_id}_Epicenter", "N2_Valley_Road"): 0.8,
        (f"N1_{location_id}_Epicenter", "N4_Ridge_Bypass"): 1.4,
        ("N2_Valley_Road", "N3_Cross_Junction"): 1.1,
        ("N4_Ridge_Bypass", "N3_Cross_Junction"): 0.9,
        ("N3_Cross_Junction", "N5_High_Terrace"): 1.3,
        ("N4_Ridge_Bypass", "N5_High_Terrace"): 1.6,
        ("N5_High_Terrace", f"N6_SafeZone_{safe_label[:15].strip()}"): 0.9
    }
    return {"nodes": nodes, "edges": edges}

def calculate_dynamic_route(
    location_id: str, 
    risk_level: str, 
    lat: Optional[float] = None, 
    lng: Optional[float] = None, 
    safe_zone: Optional[str] = None
) -> Optional[List[Dict[str, Any]]]:
    """
    Calculates the safest path using A* Algorithm adjusted by real-time risk.
    Supports all registered and custom locations dynamically.
    """
    if location_id in GRAPHS:
        graph = GRAPHS[location_id]
    elif lat is not None and lng is not None:
        graph = generate_procedural_graph(location_id, lat, lng, safe_zone)
    elif location_id in LOCATION_COORDS:
        c_lat, c_lng, c_safe = LOCATION_COORDS[location_id]
        graph = generate_procedural_graph(location_id, c_lat, c_lng, c_safe)
    else:
        return None
    nodes = graph["nodes"]
    edges = graph["edges"]
    
    # Identify start (epicenter) and goal (SafeZone)
    start_node = list(nodes.keys())[0] # Assume N1 is epicenter
    goal_node = list(nodes.keys())[-1] # Assume N6 is SafeZone
    
    # Build adjacency list
    adj = {n: [] for n in nodes}
    for (u, v), w in edges.items():
        adj[u].append((v, w))
        adj[v].append((u, w)) # Undirected graph
        
    # A* Algorithm
    open_set = []
    heapq.heappush(open_set, (0, start_node))
    
    came_from = {}
    g_score = {n: float('inf') for n in nodes}
    g_score[start_node] = 0
    
    f_score = {n: float('inf') for n in nodes}
    goal_lat, goal_lng = nodes[goal_node]
    start_lat, start_lng = nodes[start_node]
    f_score[start_node] = haversine(start_lat, start_lng, goal_lat, goal_lng)
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current == goal_node:
            # Reconstruct path
            path = []
            curr = current
            while curr in came_from:
                lat, lng = nodes[curr]
                path.append({"lat": lat, "lng": lng, "name": curr})
                curr = came_from[curr]
            lat, lng = nodes[start_node]
            path.append({"lat": lat, "lng": lng, "name": start_node})
            return path[::-1] # Reverse to get Start -> Goal
            
        for neighbor, base_weight in adj[current]:
            # Apply dynamic risk penalty
            weight = get_dynamic_edge_weight(current, neighbor, base_weight, risk_level)
            tentative_g = g_score[current] + weight
            
            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                
                n_lat, n_lng = nodes[neighbor]
                h_score = haversine(n_lat, n_lng, goal_lat, goal_lng)
                f_score[neighbor] = tentative_g + h_score
                
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
                
    return None # No path found

def generate_spatial_heatmap(location_id: str, lat: float, lng: float, risk_level: str) -> List[List[float]]:
    """
    Mocks the output of a ConvLSTM by generating a grid of probabilities around the epicenter.
    Returns array of [lat, lng, intensity]
    """
    points = []
    # Base intensity based on risk
    base_prob = 0.2
    if risk_level == "CRITICAL": base_prob = 0.95
    elif risk_level == "HIGH": base_prob = 0.75
    elif risk_level == "MODERATE": base_prob = 0.45
    
    # Generate 100 points around center
    import random
    for i in range(100):
        # Normal distribution around center, tighter spread for higher intensity
        spread = 0.015 if risk_level in ["CRITICAL", "HIGH"] else 0.03
        plat = random.gauss(lat, spread)
        plng = random.gauss(lng, spread)
        
        # Intensity decays by distance from epicenter
        dist = math.sqrt((plat - lat)**2 + (plng - lng)**2)
        intensity = max(0.1, base_prob - (dist * 15))
        
        points.append([plat, plng, round(intensity, 2)])
        
    return points
