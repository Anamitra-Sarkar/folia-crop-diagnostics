def get_offline_interpretation(class_name: str) -> dict:
    """
    Parses a crop-disease classification string and returns professional,
    non-technical agricultural explanations and actionable treatment steps.
    Supports all 98 classes.
    """
    if not class_name:
        return {
            "crop": "Unknown",
            "disease": "Unknown",
            "explanation": "No diagnostic data was received. Please capture a clear leaf image.",
            "care_guide": ["Ensure proper lighting.", "Position the leaf center in frame."]
        }

    # Handle healthy classes
    if "healthy" in class_name.lower():
        parts = class_name.replace("___", "__").split("__")
        crop = parts[0].replace("_", " ").title()
        return {
            "crop": crop,
            "disease": "Healthy",
            "explanation": f"Your {crop} plant leaf appears healthy, vibrant, and free of visible diseases or pests. The leaf tissues are intact, indicating optimal water transport and photosynthetic efficiency.",
            "care_guide": [
                "Maintain consistent watering according to the crop's specific needs, ensuring well-drained soil.",
                "Inspect the underside of leaves weekly to spot any early insect infestations or spore formations.",
                "Ensure proper weed control around the base of the plant to prevent nutrient competition and reduce pest harborages.",
                "Apply balanced organic compost to maintain optimal soil nutrition and build robust plant immunity."
            ]
        }
    
    # Parse crop and disease name
    parts = class_name.replace("___", "__").split("__")
    crop = parts[0].replace("_", " ").title()
    disease = parts[1].replace("_", " ").title() if len(parts) > 1 else "Condition / Pest Infestation"
    
    disease_lower = disease.lower()
    explanation = f"Signs of {disease} have been detected on your {crop} plant. "
    care_guide = []
    
    if "rust" in disease_lower:
        explanation += "Rust is a fungal disease that produces powdery orange, yellow, or brown spore pustules on leaves, disrupting photosynthesis and weakening the plant's overall health."
        care_guide = [
            "Immediately prune and safely destroy infected leaves to limit spore dispersal.",
            "Avoid overhead irrigation; water directly at the root zone to keep the foliage dry.",
            "Apply a copper-based or sulfur-based organic fungicide, ensuring thorough coverage of both leaf surfaces.",
            "Improve plant spacing to enhance airflow and accelerate leaf drying."
        ]
    elif "rot" in disease_lower:
        explanation += "Rot is typically caused by fungal or bacterial pathogens thriving in high humidity, leading to localized tissue death, decay, and darkening of plant structures."
        care_guide = [
            "Prune infected foliage using sanitized tools, disinfecting the blades between cuts with rubbing alcohol.",
            "Ensure the soil has excellent drainage and reduce watering frequency to allow the topsoil to dry.",
            "Apply a suitable bio-fungicide (like Bacillus subtilis) or targeted treatment to halt pathogen spread.",
            "Clear away fallen crop debris from around the plant base to eliminate overwintering spores."
        ]
    elif "blight" in disease_lower:
        explanation += "Blight refers to rapid, extensive yellowing, browning, and death of plant tissues (leaves, stems, flowers) caused by fungal or bacterial pathogens."
        care_guide = [
            "Remove and discard all affected leaves; do not compost diseased material to avoid spreading spores.",
            "Ensure foliage remains dry by watering early in the morning and using drip lines.",
            "Apply protective fungicides (such as Chlorothalonil or copper fungicides) at the first sign of symptoms.",
            "Mulch around the base of the plant to prevent rain from splashing soil-borne spores onto lower leaves."
        ]
    elif "spot" in disease_lower:
        explanation += "Leaf spot diseases are caused by fungi or bacteria that produce distinct circular or irregular lesions, often leading to premature leaf drop and reduced plant vigor."
        care_guide = [
            "Pick off and dispose of spotted leaves to prevent the infection from spreading upward.",
            "Water the plant at soil level and prune lower branches to keep them away from damp soil.",
            "Apply a natural neem oil spray or copper-based fungicide to protect unaffected foliage.",
            "Keep the garden bed free of weeds and crop residues where the pathogen can multiply."
        ]
    elif "mildew" in disease_lower:
        explanation += "Powdery or Downy Mildew is a fungal disease characterized by a white-to-gray powdery coating on leaves, causing curling, yellowing, and growth stunting."
        care_guide = [
            "Isolate the plant if possible and prune heavily infected areas to improve sunlight penetration.",
            "Spray leaves with a diluted neem oil solution or potassium bicarbonate mixture to inhibit mildew growth.",
            "Maintain adequate spacing between crops to minimize humidity build-up in the canopy.",
            "Grow the plant in a location with plenty of direct sunlight, which naturally suppresses mildew."
        ]
    elif "virus" in disease_lower or "mosaic" in disease_lower or "curl" in disease_lower:
        explanation += "Viral infections cause leaf curling, mottling, stunting, and mosaic patterns. They are systemic, meaning they infect the entire plant, and are often spread by insect vectors like aphids or whiteflies."
        care_guide = [
            "Note: Viral infections cannot be cured. Prune and destroy heavily infected plants immediately to protect healthy crops.",
            "Control sap-sucking insect vectors (aphids, whiteflies, thrips) using insecticidal soaps or neem oil.",
            "Plant virus-resistant cultivars in the future and source certified disease-free seeds.",
            "Sanitize hands and all tools thoroughly after handling infected plants to prevent mechanical transmission."
        ]
    elif any(term in disease_lower for term in ["mite", "spider", "vector", "pest", "insect", "bug", "hispa", "caterpillar", "whitefly"]):
        explanation += "This indicates a pest infestation where active feeding by insects or mites damages leaf structures, reduces plant vigor, and potentially transmits pathogens."
        care_guide = [
            "Introduce natural predators like ladybugs, lacewings, or predatory mites to help control the pest population.",
            "Apply organic insecticide sprays, such as neem oil or insecticidal soap, targeting the undersides of the leaves.",
            "Use physical traps (e.g., yellow sticky cards) around the perimeter to catch flying pests.",
            "Spray the foliage with a strong stream of water to dislodge light infestations of mites or aphids."
        ]
    else:
        # Generic disease/scab fallback
        explanation += "This condition can lead to leaf lesions, premature drop, and reduced photosynthetic capability if left untreated."
        care_guide = [
            "Inspect the entire plant and prune leaves showing advanced symptoms.",
            "Water directly at the root zone and avoid wetting leaf surfaces.",
            "Apply a broad-spectrum organic fungicide or neem oil as a preventive measure.",
            "Sanitize tools and wash hands thoroughly to prevent transmitting the condition to nearby plants."
        ]
        
    return {
        "crop": crop,
        "disease": disease,
        "explanation": explanation,
        "care_guide": care_guide
    }
