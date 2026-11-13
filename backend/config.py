"""
JALRAKSHAK System Configuration
===============================
Plug & Play Regions: To monitor a new city (e.g. Sikkim or Ladakh), 
just add its Name, Lat/Lon (Coordinates), and metadata below.
The system (UI, Map, ML Training) will automatically adapt to it.
"""

# COMPREHENSIVE HILLY REGION DATABASE — ALL FLOOD-PRONE ZONES ACROSS INDIA
LOCATIONS = [
    # ──────────────────────── UTTARAKHAND (Himalayan Belt) ────────────────────────
    {
        "id": "UK-001", "name": "Devprayag (Alaknanda Basin)", "state": "Uttarakhand", "region": "North Himalayas",
        "lat": 30.145, "lng": 78.595, "safe_zone": "Govt Inter College & High Grounds", "base_slope": 45, "vulnerability": 0.85,
        "population": 2140, "critical_infra": 3, "upstream_of": ["UK-004"],
        "river_basin": "Alaknanda", "elevation_m": 472, "annual_rainfall_mm": 1520,
        "historical_events": ["2013 Kedarnath Disaster downstream impact", "2021 Chamoli avalanche flood pulse"]
    },
    {
        "id": "UK-002", "name": "Joshimath / Chamoli Sector", "state": "Uttarakhand", "region": "North Himalayas",
        "lat": 30.550, "lng": 79.566, "safe_zone": "Army Cantonment Hill Shelter", "base_slope": 52, "vulnerability": 0.90,
        "population": 1650, "critical_infra": 2, "upstream_of": ["UK-001"],
        "river_basin": "Dhauliganga-Alaknanda", "elevation_m": 1890, "annual_rainfall_mm": 1150,
        "historical_events": ["2021 Chamoli glacial lake outburst flood (GLOF)", "Ongoing subsidence crisis"]
    },
    {
        "id": "UK-003", "name": "Kedarnath Valley (Mandakini)", "state": "Uttarakhand", "region": "North Himalayas",
        "lat": 30.735, "lng": 79.066, "safe_zone": "GMVN Helipad Ridge Compound", "base_slope": 58, "vulnerability": 0.95,
        "population": 840, "critical_infra": 1, "upstream_of": ["UK-004"],
        "river_basin": "Mandakini", "elevation_m": 3583, "annual_rainfall_mm": 1800,
        "historical_events": ["2013 Kedarnath mega-disaster (>5000 casualties)", "Glacial moraine dam breach"]
    },
    {
        "id": "UK-004", "name": "Rudraprayag Sangam", "state": "Uttarakhand", "region": "North Himalayas",
        "lat": 30.285, "lng": 78.981, "safe_zone": "District Hospital Higher Terrace", "base_slope": 40, "vulnerability": 0.75,
        "population": 3200, "critical_infra": 4, "upstream_of": [],
        "river_basin": "Mandakini-Alaknanda Confluence", "elevation_m": 610, "annual_rainfall_mm": 1400,
        "historical_events": ["2013 massive downstream flooding", "Receives combined upstream discharge"]
    },
    {
        "id": "UK-005", "name": "Pithoragarh (Kali River)", "state": "Uttarakhand", "region": "North Himalayas",
        "lat": 29.583, "lng": 80.218, "safe_zone": "Pithoragarh Fort Plateau", "base_slope": 44, "vulnerability": 0.78,
        "population": 4800, "critical_infra": 3, "upstream_of": [],
        "river_basin": "Kali (Sharda)", "elevation_m": 1514, "annual_rainfall_mm": 1680,
        "historical_events": ["2021 cloudburst casualties", "Frequent landslides on NH-9"]
    },
    {
        "id": "UK-006", "name": "Uttarkashi (Bhagirathi Valley)", "state": "Uttarakhand", "region": "North Himalayas",
        "lat": 30.727, "lng": 78.446, "safe_zone": "Nehru Stadium High Ground", "base_slope": 50, "vulnerability": 0.82,
        "population": 3100, "critical_infra": 2, "upstream_of": ["UK-001"],
        "river_basin": "Bhagirathi", "elevation_m": 1158, "annual_rainfall_mm": 1350,
        "historical_events": ["1991 Uttarkashi earthquake + landslides", "2012 Asi Ganga flash flood"]
    },

    # ──────────────────────── HIMACHAL PRADESH (Western Himalayas) ────────────────────────
    {
        "id": "HP-001", "name": "Manali (Upper Beas River)", "state": "Himachal Pradesh", "region": "North Himalayas",
        "lat": 32.243, "lng": 77.189, "safe_zone": "Atal Bihari Mountaineering Ground", "base_slope": 48, "vulnerability": 0.88,
        "population": 4500, "critical_infra": 4, "upstream_of": ["HP-002"],
        "river_basin": "Beas", "elevation_m": 2050, "annual_rainfall_mm": 1200,
        "historical_events": ["2023 July cloudburst", "Annual flash floods on Beas"]
    },
    {
        "id": "HP-002", "name": "Kullu - Aut Valley", "state": "Himachal Pradesh", "region": "North Himalayas",
        "lat": 31.957, "lng": 77.109, "safe_zone": "Dhalpur Ground & High Ridge", "base_slope": 42, "vulnerability": 0.80,
        "population": 5200, "critical_infra": 5, "upstream_of": [],
        "river_basin": "Beas (Middle)", "elevation_m": 1219, "annual_rainfall_mm": 1100,
        "historical_events": ["2023 Aut tunnel flooding", "Receives Manali upstream discharge"]
    },
    {
        "id": "HP-003", "name": "Dharamshala (Kangra Hills)", "state": "Himachal Pradesh", "region": "North Himalayas",
        "lat": 32.219, "lng": 76.323, "safe_zone": "Police Ground Upper Campus", "base_slope": 38, "vulnerability": 0.70,
        "population": 6200, "critical_infra": 4, "upstream_of": [],
        "river_basin": "Baner Khad", "elevation_m": 1457, "annual_rainfall_mm": 3000,
        "historical_events": ["Highest rainfall in HP belt", "2023 massive cloudbursts"]
    },
    {
        "id": "HP-004", "name": "Shimla Ridge & Tutu", "state": "Himachal Pradesh", "region": "North Himalayas",
        "lat": 31.104, "lng": 77.173, "safe_zone": "Annandale Plateau Shelter", "base_slope": 46, "vulnerability": 0.78,
        "population": 12000, "critical_infra": 8, "upstream_of": [],
        "river_basin": "Sutlej (Proximity)", "elevation_m": 2276, "annual_rainfall_mm": 1500,
        "historical_events": ["2023 Shimla landslides", "Temple collapse during monsoon"]
    },
    {
        "id": "HP-005", "name": "Kinnaur (Sutlej Gorge)", "state": "Himachal Pradesh", "region": "North Himalayas",
        "lat": 31.597, "lng": 78.174, "safe_zone": "Kalpa Monastery Grounds", "base_slope": 55, "vulnerability": 0.92,
        "population": 1100, "critical_infra": 1, "upstream_of": [],
        "river_basin": "Sutlej", "elevation_m": 2960, "annual_rainfall_mm": 800,
        "historical_events": ["2021 Kinnaur landslide (bus buried)", "2023 NH-5 repeated destruction"]
    },
    {
        "id": "HP-006", "name": "Mandi (Beas-Sutlej Link)", "state": "Himachal Pradesh", "region": "North Himalayas",
        "lat": 31.714, "lng": 76.932, "safe_zone": "Paddal Ground Elevated Zone", "base_slope": 36, "vulnerability": 0.72,
        "population": 7500, "critical_infra": 5, "upstream_of": [],
        "river_basin": "Beas", "elevation_m": 760, "annual_rainfall_mm": 1600,
        "historical_events": ["2023 Mandi flash floods", "Bridge collapses during monsoon"]
    },

    # ──────────────────────── JAMMU & KASHMIR ────────────────────────
    {
        "id": "JK-001", "name": "Srinagar (Jhelum Floodplain)", "state": "Jammu & Kashmir", "region": "Kashmir Valley",
        "lat": 34.083, "lng": 74.797, "safe_zone": "Shankaracharya Hill Complex", "base_slope": 22, "vulnerability": 0.88,
        "population": 45000, "critical_infra": 12, "upstream_of": [],
        "river_basin": "Jhelum", "elevation_m": 1585, "annual_rainfall_mm": 710,
        "historical_events": ["2014 mega flood (1 million displaced)", "Dal Lake overflow events"]
    },
    {
        "id": "JK-002", "name": "Anantnag (Lidder Valley)", "state": "Jammu & Kashmir", "region": "Kashmir Valley",
        "lat": 33.729, "lng": 75.154, "safe_zone": "Achabal Garden Plateau", "base_slope": 35, "vulnerability": 0.76,
        "population": 8500, "critical_infra": 4, "upstream_of": ["JK-001"],
        "river_basin": "Lidder-Jhelum", "elevation_m": 1640, "annual_rainfall_mm": 1200,
        "historical_events": ["2014 Lidder River flooding", "Glacial melt flash events"]
    },
    {
        "id": "JK-003", "name": "Rajouri (Pir Panjal Foothills)", "state": "Jammu & Kashmir", "region": "Pir Panjal",
        "lat": 33.379, "lng": 74.312, "safe_zone": "Army Garrison Higher Grounds", "base_slope": 42, "vulnerability": 0.74,
        "population": 5600, "critical_infra": 3, "upstream_of": [],
        "river_basin": "Tawi Tributary", "elevation_m": 915, "annual_rainfall_mm": 1050,
        "historical_events": ["2024 cloudburst fatalities", "Frequent debris flows on Mughal Road"]
    },

    # ──────────────────────── NORTHEAST INDIA ────────────────────────
    {
        "id": "NE-001", "name": "Cherrapunji / Sohra", "state": "Meghalaya", "region": "Northeast",
        "lat": 25.270, "lng": 91.732, "safe_zone": "Ramakrishna Mission High Plateau", "base_slope": 35, "vulnerability": 0.92,
        "population": 1200, "critical_infra": 2, "upstream_of": [],
        "river_basin": "Umiam Catchment", "elevation_m": 1484, "annual_rainfall_mm": 11777,
        "historical_events": ["Wettest place on Earth", "Chronic waterfall-driven erosion", "2022 massive landslides"]
    },
    {
        "id": "NE-002", "name": "Gangtok (Teesta River Basin)", "state": "Sikkim", "region": "Northeast",
        "lat": 27.338, "lng": 88.606, "safe_zone": "Paljor Stadium Elevated Complex", "base_slope": 50, "vulnerability": 0.86,
        "population": 3500, "critical_infra": 4, "upstream_of": [],
        "river_basin": "Teesta", "elevation_m": 1650, "annual_rainfall_mm": 3500,
        "historical_events": ["2023 South Lhonak GLOF (>100 casualties)", "Teesta Dam III breach", "2011 earthquake + landslides"]
    },
    {
        "id": "NE-003", "name": "Haflong (Dima Hasao Hills)", "state": "Assam", "region": "Northeast",
        "lat": 25.183, "lng": 93.016, "safe_zone": "Circuit House Hilltop Shelter", "base_slope": 44, "vulnerability": 0.82,
        "population": 2800, "critical_infra": 2, "upstream_of": [],
        "river_basin": "Jatinga Tributary", "elevation_m": 680, "annual_rainfall_mm": 2800,
        "historical_events": ["2022 railway line destroyed by landslide", "Annual monsoon road cuts"]
    },
    {
        "id": "NE-004", "name": "Itanagar (Papum Pare)", "state": "Arunachal Pradesh", "region": "Northeast",
        "lat": 27.084, "lng": 93.605, "safe_zone": "Rajiv Gandhi Stadium Complex", "base_slope": 36, "vulnerability": 0.65,
        "population": 5400, "critical_infra": 3, "upstream_of": [],
        "river_basin": "Dikrong Tributary", "elevation_m": 350, "annual_rainfall_mm": 2700,
        "historical_events": ["2022 flash floods in capital", "Frequent slope failures"]
    },
    {
        "id": "NE-005", "name": "Imphal Valley (Manipur)", "state": "Manipur", "region": "Northeast",
        "lat": 24.817, "lng": 93.950, "safe_zone": "Kangla Fort Plateau", "base_slope": 30, "vulnerability": 0.72,
        "population": 9800, "critical_infra": 5, "upstream_of": [],
        "river_basin": "Imphal River", "elevation_m": 786, "annual_rainfall_mm": 1320,
        "historical_events": ["2023 Manipur landslides (Tupul)", "Flood-prone Loktak Lake overflow"]
    },
    {
        "id": "NE-006", "name": "Aizawl (Tlawng Basin)", "state": "Mizoram", "region": "Northeast",
        "lat": 23.727, "lng": 92.717, "safe_zone": "Assam Rifles Ground", "base_slope": 48, "vulnerability": 0.80,
        "population": 4200, "critical_infra": 3, "upstream_of": [],
        "river_basin": "Tlawng", "elevation_m": 1132, "annual_rainfall_mm": 2500,
        "historical_events": ["2017 Aizawl landslide disaster", "Chronic slope instability in capital"]
    },
    {
        "id": "NE-007", "name": "Kohima (Nagaland Hills)", "state": "Nagaland", "region": "Northeast",
        "lat": 25.674, "lng": 94.110, "safe_zone": "War Cemetery Ridge", "base_slope": 46, "vulnerability": 0.75,
        "population": 3800, "critical_infra": 2, "upstream_of": [],
        "river_basin": "Dhansiri Tributary", "elevation_m": 1444, "annual_rainfall_mm": 1800,
        "historical_events": ["Frequent NH-29 landslides", "2022 monsoon road blockades"]
    },
    {
        "id": "NE-008", "name": "Mawsynram Plateau", "state": "Meghalaya", "region": "Northeast",
        "lat": 25.297, "lng": 91.583, "safe_zone": "Community Hall Upper Plateau", "base_slope": 40, "vulnerability": 0.94,
        "population": 600, "critical_infra": 1, "upstream_of": ["NE-001"],
        "river_basin": "Wah Rilang", "elevation_m": 1400, "annual_rainfall_mm": 11871,
        "historical_events": ["Highest recorded annual rainfall globally", "Feeds Cherrapunji catchment"]
    },

    # ──────────────────────── WESTERN GHATS & SOUTHERN HILLS ────────────────────────
    {
        "id": "WG-001", "name": "Wayanad (Chooralmala)", "state": "Kerala", "region": "Western Ghats",
        "lat": 11.554, "lng": 76.132, "safe_zone": "Meppadi Higher Secondary Hill Campus", "base_slope": 54, "vulnerability": 0.96,
        "population": 1800, "critical_infra": 2, "upstream_of": [],
        "river_basin": "Chaliyar Tributary", "elevation_m": 700, "annual_rainfall_mm": 3500,
        "historical_events": ["2024 Wayanad landslide disaster (>400 casualties)", "2019 Puthumala landslide"]
    },
    {
        "id": "WG-002", "name": "Munnar (Muthirapuzha River)", "state": "Kerala", "region": "Western Ghats",
        "lat": 10.088, "lng": 77.059, "safe_zone": "Tata High Altitude Ground", "base_slope": 46, "vulnerability": 0.84,
        "population": 3200, "critical_infra": 3, "upstream_of": [],
        "river_basin": "Muthirapuzha", "elevation_m": 1532, "annual_rainfall_mm": 4500,
        "historical_events": ["2018 Kerala floods devastation", "Frequent tea estate landslides"]
    },
    {
        "id": "WG-003", "name": "Mahabaleshwar & Chiplun Basin", "state": "Maharashtra", "region": "Western Ghats",
        "lat": 17.923, "lng": 73.658, "safe_zone": "Table Land High Rock Plateau", "base_slope": 40, "vulnerability": 0.79,
        "population": 7500, "critical_infra": 5, "upstream_of": [],
        "river_basin": "Koyna-Vashishti", "elevation_m": 1353, "annual_rainfall_mm": 6000,
        "historical_events": ["2021 Chiplun catastrophic floods", "2023 Irshalwadi landslide (>27 casualties)"]
    },
    {
        "id": "WG-004", "name": "Coorg / Madikeri Ghats", "state": "Karnataka", "region": "Western Ghats",
        "lat": 12.424, "lng": 75.738, "safe_zone": "Madikeri Fort Elevated Complex", "base_slope": 38, "vulnerability": 0.72,
        "population": 4200, "critical_infra": 3, "upstream_of": [],
        "river_basin": "Cauvery Headwaters", "elevation_m": 1452, "annual_rainfall_mm": 3200,
        "historical_events": ["2018 Kodagu mega landslides", "2019 severe flooding"]
    },
    {
        "id": "WG-005", "name": "Nilgiris (Coonoor-Ooty)", "state": "Tamil Nadu", "region": "Western Ghats",
        "lat": 11.413, "lng": 76.695, "safe_zone": "Botanical Garden Plateau", "base_slope": 50, "vulnerability": 0.85,
        "population": 5600, "critical_infra": 4, "upstream_of": [],
        "river_basin": "Bhavani Headwaters", "elevation_m": 2240, "annual_rainfall_mm": 1800,
        "historical_events": ["2009 Nilgiris landslide disaster (>60 dead)", "2021 Coonoor mudslides"]
    },
    {
        "id": "WG-006", "name": "Idukki (Periyar Dam Zone)", "state": "Kerala", "region": "Western Ghats",
        "lat": 9.852, "lng": 76.971, "safe_zone": "Idukki Colony Higher Ground", "base_slope": 52, "vulnerability": 0.90,
        "population": 2500, "critical_infra": 3, "upstream_of": ["WG-002"],
        "river_basin": "Periyar", "elevation_m": 1200, "annual_rainfall_mm": 4000,
        "historical_events": ["2018 Idukki dam gates opened for first time in 26 years", "Periyar flash floods"]
    },
    {
        "id": "WG-007", "name": "Amboli Ghat (Sindhudurg)", "state": "Maharashtra", "region": "Western Ghats",
        "lat": 15.964, "lng": 74.003, "safe_zone": "Amboli Forest Rest House", "base_slope": 42, "vulnerability": 0.73,
        "population": 1500, "critical_infra": 2, "upstream_of": [],
        "river_basin": "Hiranyakeshi", "elevation_m": 690, "annual_rainfall_mm": 7500,
        "historical_events": ["Among highest rainfall zones in Maharashtra", "Frequent ghat road landslides"]
    },
    {
        "id": "WG-008", "name": "Goa Hinterland (Sanguem Ghats)", "state": "Goa", "region": "Western Ghats",
        "lat": 15.228, "lng": 74.152, "safe_zone": "Sanguem Municipal Ground", "base_slope": 34, "vulnerability": 0.62,
        "population": 3200, "critical_infra": 2, "upstream_of": [],
        "river_basin": "Zuari Headwaters", "elevation_m": 380, "annual_rainfall_mm": 3800,
        "historical_events": ["2023 dam release flash floods", "Mining area slope failures"]
    },
]
