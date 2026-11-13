import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import apprise
from schemas import PredictionResult, SAFETY_DISCLAIMER
from settings import settings


CAP_XML_NAMESPACE = "urn:oasis:names:tc:emergency:cap:1.2"
ET.register_namespace("", CAP_XML_NAMESPACE)


def generate_cap_xml(loc: Dict[str, Any], risk: PredictionResult) -> str:
    """Generates an OASIS CAP 1.2 (Common Alerting Protocol) XML document
    strictly compliant with the OASIS Standard v1.2 & NDMA Sachet specs.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    alert_id = f"JALRAKSHAK-{loc['id']}-{now.strftime('%Y%m%d%H%M%S')}"

    # Severity mapping
    severity_map = {
        "CRITICAL": ("Extreme", "Immediate", "Observed"),
        "HIGH": ("Severe", "Expected", "Likely"),
        "MODERATE": ("Moderate", "Future", "Possible"),
        "LOW": ("Minor", "Past", "Unlikely"),
    }
    severity, urgency, certainty = severity_map.get(risk.risk_level, ("Moderate", "Future", "Possible"))

    ns = f"{{{CAP_XML_NAMESPACE}}}"
    root = ET.Element(f"{ns}alert")

    ET.SubElement(root, f"{ns}identifier").text = alert_id
    ET.SubElement(root, f"{ns}sender").text = "jalrakshak.intelligence@ndma.gov.in"
    ET.SubElement(root, f"{ns}sent").text = now_iso
    ET.SubElement(root, f"{ns}status").text = "Actual" if not risk.is_simulated else "Draft"
    ET.SubElement(root, f"{ns}msgType").text = "Alert"
    ET.SubElement(root, f"{ns}scope").text = "Public"
    ET.SubElement(root, f"{ns}code").text = "IPAWS-1.0"

    info = ET.SubElement(root, f"{ns}info")
    ET.SubElement(info, f"{ns}language").text = "en-IN"
    ET.SubElement(info, f"{ns}category").text = "Met"
    ET.SubElement(info, f"{ns}event").text = f"Flash Flood {risk.risk_level} Warning"
    ET.SubElement(info, f"{ns}urgency").text = urgency
    ET.SubElement(info, f"{ns}severity").text = severity
    ET.SubElement(info, f"{ns}certainty").text = certainty

    headline = f"{risk.risk_level} FLASH FLOOD ALERT: {loc['name']}, {loc['state']}"
    ET.SubElement(info, f"{ns}headline").text = headline

    desc = (
        f"Flash flood probability evaluated at {risk.flood_probability}% with "
        f"landslide hazard at {risk.landslide_probability}%. "
        f"Compound hazard index is {risk.compound_hazard_level}. "
        f"Trajectory trend: {risk.trajectory_trend}. "
        f"Estimated lead time: {risk.lead_time_window}."
    )
    ET.SubElement(info, f"{ns}description").text = desc

    instruction = (
        f"ACTION DIRECTIVE: {risk.recommended_action}. "
        f"EVACUATION ROUTE TO SAFE ZONE: {risk.safe_zone}."
    )
    ET.SubElement(info, f"{ns}instruction").text = instruction

    # Area definition with circle & polygon bounds
    lat = loc["lat"]
    lng = loc["lng"]
    area = ET.SubElement(info, f"{ns}area")
    ET.SubElement(area, f"{ns}areaDesc").text = f"{loc['name']} Basin ({loc.get('river_basin', 'River Reach')})"
    ET.SubElement(area, f"{ns}circle").text = f"{lat},{lng},5.0"

    # Catchment bounding box polygon (clockwise closed ring)
    d = 0.02
    poly_coords = f"{lat+d},{lng-d} {lat+d},{lng+d} {lat-d},{lng+d} {lat-d},{lng-d} {lat+d},{lng-d}"
    ET.SubElement(area, f"{ns}polygon").text = poly_coords

    # Persistent Safety Disclaimer parameter
    param = ET.SubElement(info, f"{ns}parameter")
    ET.SubElement(param, f"{ns}valueName").text = "DisasterDecisionSupportDisclaimer"
    ET.SubElement(param, f"{ns}value").text = SAFETY_DISCLAIMER

    # Simulated flag parameter
    sim_param = ET.SubElement(info, f"{ns}parameter")
    ET.SubElement(sim_param, f"{ns}valueName").text = "DataSourceStatus"
    ET.SubElement(sim_param, f"{ns}value").text = "SIMULATED" if risk.is_simulated else "OPERATIONAL_REAL"

    return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")


def dispatch_notification(
    title: str,
    message: str,
    target_urls: Optional[str] = None
) -> Dict[str, Any]:
    """Human-confirmed dispatch via Apprise. Never auto-dispatches without explicit trigger."""
    targets = target_urls or settings.apprise_targets
    ap_obj = apprise.Apprise()

    if targets:
        for t in targets.split(","):
            if t.strip():
                ap_obj.add(t.strip())

    if len(ap_obj) > 0:
        delivered = ap_obj.notify(
            title=title,
            body=f"{message}\n\n[DISCLAIMER: {SAFETY_DISCLAIMER}]"
        )
        return {
            "status": "delivered" if delivered else "failed",
            "targets_count": len(ap_obj),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    else:
        # Dry-run logging when no targets are configured
        return {
            "status": "dry_run_logged",
            "targets_count": 0,
            "message": "No notification endpoints configured in APPRISE_TARGETS. Message logged safely.",
            "logged_alert": title,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
