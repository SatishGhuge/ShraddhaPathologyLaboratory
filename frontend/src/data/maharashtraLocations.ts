// Maharashtra locations hierarchy: City -> SubSection -> District -> Villages
export const maharashtraLocations = {
  "Pune": {
    "East Pune": {
      "Pune District": ["Hadapsar", "Magarpatta", "Viman Nagar", "Kalyani Nagar", "Koregaon Park"],
      "Pimpri-Chinchwad": ["Pimpri", "Chinchwad", "Akurdi", "Ravet", "Talegaon"]
    },
    "West Pune": {
      "Pune District": ["Kothrud", "Karve Nagar", "Shivajinagar", "Deccan", "Baner"],
      "Pimpri-Chinchwad": ["Bhosari", "Nigdi", "Wakad", "Hinjewadi"]
    },
    "Central Pune": {
      "Pune District": ["Camp", "Sadashiv Peth", "Navi Peth", "Ravivar Peth", "Budhwar Peth"]
    }
  },
  "Mumbai": {
    "South Mumbai": {
      "Mumbai District": ["Fort", "Colaba", "Kala Ghoda", "Ballard Estate", "Hutatma Chowk"],
      "Mumbai Suburban": ["Worli", "Prabhadevi", "Mahim", "Bandra"]
    },
    "Central Mumbai": {
      "Mumbai District": ["Dadar", "Matunga", "Parel", "Lower Parel", "Elphinstone"],
      "Mumbai Suburban": ["Sion", "Wadala", "Chembur", "Govandi"]
    },
    "North Mumbai": {
      "Mumbai District": ["Andheri", "Borivali", "Malad", "Kandivali", "Dahisar"],
      "Mumbai Suburban": ["Thane", "Navi Mumbai", "Mira Road", "Bhayandar"]
    }
  },
  "Nagpur": {
    "Central Nagpur": {
      "Nagpur District": ["Sitabuldi", "Itwari", "Sadar", "Ramdaspeth", "Dhantoli"]
    },
    "South Nagpur": {
      "Nagpur District": ["Wadi", "Lakhanpur", "Ambazari", "Kalamna", "Butibori"]
    }
  },
  "Aurangabad": {
    "Central Aurangabad": {
      "Aurangabad District": ["Paithan Gate", "Jalna Road", "Chikhalthana", "Waluj", "Vaijapur"]
    }
  },
  "Nashik": {
    "Central Nashik": {
      "Nashik District": ["Nashik Road", "Deolali", "Sinnar", "Igatpuri", "Malegaon"]
    }
  },
  "Kolhapur": {
    "Central Kolhapur": {
      "Kolhapur District": ["Kolhapur City", "Ichalkaranji", "Sangli", "Miraj", "Kagal"]
    }
  },
  "Solapur": {
    "Central Solapur": {
      "Solapur District": ["Solapur City", "Pandharpur", "Barshi", "Latur", "Vikarabad"]
    }
  }
};

// Get all cities
export const getCities = () => Object.keys(maharashtraLocations);

// Get sub-sections for a city
export const getSubSections = (city: string) => {
  return Object.keys(maharashtraLocations[city] || {});
};

// Get districts for a city and sub-section
export const getDistricts = (city: string, subSection: string) => {
  return Object.keys(maharashtraLocations[city]?.[subSection] || {});
};

// Get villages for a city, sub-section, and district
export const getVillages = (city: string, subSection: string, district: string) => {
  return maharashtraLocations[city]?.[subSection]?.[district] || [];
};

// Format location string
export const formatLocation = (city: string, subSection: string, district: string, village: string) => {
  const parts = [city, subSection, district, village].filter(Boolean);
  return parts.join(" | ");
};

// Parse location string
export const parseLocation = (locationString: string) => {
  const parts = locationString.split(" | ");
  return {
    city: parts[0] || "",
    subSection: parts[1] || "",
    district: parts[2] || "",
    village: parts[3] || ""
  };
};

// Generate all possible location combinations in simple format (City-Village)
export const getAllLocationCombinations = () => {
  const combinations: { display: string; city: string; village: string }[] = [];
  
  Object.entries(maharashtraLocations).forEach(([city, subSections]) => {
    // Add city alone
    combinations.push({ display: city, city, village: "" });
    
    Object.entries(subSections).forEach(([subSection, districts]) => {
      Object.entries(districts).forEach(([district, villages]: [string, string[]]) => {
        // Add each village with city prefix (City-Village format)
        (villages as string[]).forEach(village => {
          combinations.push({ 
            display: `${city}-${village}`, 
            city, 
            village 
          });
        });
      });
    });
  });
  
  return combinations;
};

// Search locations by query - returns simple City-Village format
export const searchLocations = (query: string): { display: string; city: string; village: string }[] => {
  if (!query.trim()) return [];
  
  const allLocations = getAllLocationCombinations();
  const lowerQuery = query.toLowerCase();
  
  return allLocations
    .filter(loc => loc.display.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      const aLower = a.display.toLowerCase();
      const bLower = b.display.toLowerCase();
      
      // Exact match comes first
      if (aLower === lowerQuery) return -1;
      if (bLower === lowerQuery) return 1;
      
      // Starts with query comes next
      if (aLower.startsWith(lowerQuery) && !bLower.startsWith(lowerQuery)) return -1;
      if (bLower.startsWith(lowerQuery) && !aLower.startsWith(lowerQuery)) return 1;
      
      // Alphabetical order
      return a.display.localeCompare(b.display);
    })
    .slice(0, 20); // Limit to 20 suggestions
};
