import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
import xml.etree.ElementTree as ET
from fastapi.testclient import TestClient
from main import app
from alerting import CAP_XML_NAMESPACE


@pytest.fixture
def client():
    return TestClient(app)


def test_cap_12_xml_structure_and_schema(client):
    """Verifies that the /api/cap-alert/{location_id} endpoint produces valid
    OASIS CAP 1.2 XML conforming to emergency communication standards.
    """
    res = client.get("/api/cap-alert/UK-001")
    assert res.status_code == 200
    assert "application/cap+xml" in res.headers["content-type"]

    xml_text = res.text
    root = ET.fromstring(xml_text)

    # Clean tag name
    tag = root.tag.split("}")[-1] if "}" in root.tag else root.tag
    assert tag == "alert", f"Expected root <alert>, got <{root.tag}>"

    # Mandatory CAP 1.2 top-level elements
    mandatory_alert_fields = ["identifier", "sender", "sent", "status", "msgType", "scope"]
    for field in mandatory_alert_fields:
        elem = root.find(f"{{{CAP_XML_NAMESPACE}}}{field}")
        if elem is None:
            elem = root.find(field)
        assert elem is not None, f"Mandatory CAP 1.2 field <{field}> is missing from <alert>!"
        assert elem.text, f"Field <{field}> is empty!"

    # Mandatory <info> elements
    info = root.find(f"{{{CAP_XML_NAMESPACE}}}info")
    if info is None:
        info = root.find("info")
    assert info is not None, "Mandatory <info> block missing from CAP alert!"

    mandatory_info_fields = ["category", "event", "urgency", "severity", "certainty", "headline", "description", "area"]
    for field in mandatory_info_fields:
        elem = info.find(f"{{{CAP_XML_NAMESPACE}}}{field}")
        if elem is None:
            elem = info.find(field)
        assert elem is not None, f"Mandatory CAP 1.2 info field <{field}> missing!"

    # Verify Area Polygon / Circle
    area = info.find(f"{{{CAP_XML_NAMESPACE}}}area")
    if area is None:
        area = info.find("area")
    assert area is not None
    circle = area.find(f"{{{CAP_XML_NAMESPACE}}}circle")
    if circle is None:
        circle = area.find("circle")
    polygon = area.find(f"{{{CAP_XML_NAMESPACE}}}polygon")
    if polygon is None:
        polygon = area.find("polygon")
    assert circle is not None or polygon is not None, "Area must contain either circle or polygon coordinates"

    # Verify Mandatory Safety Disclaimer Parameter is present
    params = info.findall(f"{{{CAP_XML_NAMESPACE}}}parameter")
    if not params:
        params = info.findall("parameter")
    found_disclaimer = False
    for p in params:
        name = p.find(f"{{{CAP_XML_NAMESPACE}}}valueName")
        if name is None:
            name = p.find("valueName")
        if name is not None and "Disclaimer" in (name.text or ""):
            found_disclaimer = True
            break
    assert found_disclaimer, "CAP XML must include mandatory decision-support disclaimer parameter!"
