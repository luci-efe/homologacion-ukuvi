/**
 * Dictionary for Zurich Vehicle Version Normalization
 * Based on analysis of version_original field patterns
 * 
 * This dictionary is used in the homologation process to:
 * 1. Remove irrelevant technical specifications
 * 2. Normalize transmission codes
 * 3. Clean version strings for meaningful comparison
 */

const ZURICH_NORMALIZATION_DICTIONARY = {
  
  // ============================================
  // COMFORT/AUDIO FEATURES TO REMOVE (IRRELEVANT)
  // ============================================
  irrelevant_comfort_audio: [
    // Audio/Entertainment Features
    'AA',           // Aire Acondicionado (Air Conditioning)
    'EE',           // Elevavidrios Eléctricos (Electric Windows)
    'CD',           // CD Player
    'DVD',          // DVD Player
    'GPS',          // GPS Navigation
    'BT',           // Bluetooth
    'USB',          // USB Port
    'MP3',          // MP3 Player
    'AM',           // AM Radio
    'RA',           // Radio
    'FX',           // Effects/Features
    'BOSE',         // Bose Sound System

    'BA',           // Bolsas de Aire
    'ABS',          // Anti-Lock Braking System
    
    // Comfort Features
    'QC',           // Quemacocos (Sunroof)
    'VP',           // Vidrios Polarizados (Tinted Windows)
    'PIEL',         // Leather seats
    'GAMUZA',       // Suede interior
    
    // Edition Markers (marketing terms, not technical differentiators)
    'VERSION DE LANZAMIENTO',    // Launch Version
    'VER.LANZ.',                // Launch Version (abbreviated)
    'MILLION EDITION',          // Special edition
    'RED EDITION',              // Color edition
    'UNION SQUARE',             // Special edition name
    'BLACK EGO EDITION',        // Special edition
    'EDIZIONE',                 // Edition (Italian)
    'DISTINTIVE',               // Distinctive (misspelled)
    'DEPORTIVO',                // Sport (Spanish)
    'SPORTWAGON',               // Station wagon type
    'QUADRIFOGLIO VERDE',       // Alfa Romeo performance badge
    'COMPETIZIONE',             // Competition variant
    'SPECIALE',                 // Special variant
    'ESTREMA',                  // Extreme variant
    
    // Transmission indicators (will be handled separately)
    'STD',          // Standard (Manual)
    'AUT',          // Automatic
    'CVT',          // Continuously Variable Transmission
    'DSG',          // Direct Shift Gearbox
    'S TRONIC',     // S Tronic
    'TIPTRONIC',    // Tiptronic
    'SELESPEED',    // Selespeed
    'Q-TRONIC',     // Q-Tronic
    'DCT',          // Dual Clutch Transmission
  ],

  // ============================================
  // TECHNICAL SPECIFICATIONS TO PRESERVE
  // ============================================
  preserve_technical_specs: [
    
    // Drivetrain Technical (important for vehicle differentiation)
    'TUR',          // Turbo
    'AWD',          // All Wheel Drive
    '4WD',          // 4 Wheel Drive
    '4X4',          // 4x4 Drive
    'SH',           // Super Handling (AWD)
    'PHEV',         // Plug-in Hybrid Electric Vehicle
    'EAWD',         // Electronic All Wheel Drive
    'HIBRIDO',      // Hybrid
    'TFSI',         // Turbocharged Fuel Stratified Injection
    'FSI',          // Fuel Stratified Injection
    'JTS',          // Jet Thrust Stoichiometric
    'TDI',          // Turbocharged Direct Injection
    
    // Wheel/Rim Specifications (technical differentiators)
    'R16', 'R17', 'R18', 'R19', 'R20',  // Rim sizes
  ],

  // ============================================
  // TRANSMISSION NORMALIZATION MAPPING
  // ============================================
  transmission_normalization: {
    'STD': 'MANUAL',
    'AUT': 'AUTO',
    'CVT': 'AUTO',
    'DSG': 'AUTO',
    'S TRONIC': 'AUTO',
    'TIPTRONIC': 'AUTO',
    'SELESPEED': 'AUTO',
    'Q-TRONIC': 'AUTO',
    'DCT': 'AUTO',
    'MANUAL': 'MANUAL',  // Already normalized
    'AUTO': 'AUTO',     // Already normalized
  },

  // ============================================
  // REGEX PATTERNS FOR COMFORT/AUDIO REMOVAL ONLY
  // ============================================
  regex_patterns: {
    // Occupancy patterns (doors and seats) - remove as these are not technical differentiators
    occupancy: /\b\d+P\s+\d+OCUP?\b/gi,
    
    // Year ranges or model codes that might appear
    year_codes: /\b(20\d{2})\b/g,
    
    // Multiple spaces cleanup
    multiple_spaces: /\s+/g,
    
    // Leading/trailing spaces
    trim_spaces: /^\s+|\s+$/g,
  },

  // ============================================
  // BODY TYPES TO PRESERVE (these help identify vehicle type)
  // ============================================
  preserve_body_types: [
    'SEDAN',
    'SUV', 
    'COUPE',
    'HB',           // Hatchback
    'CONV',         // Convertible
    'SW',           // Station Wagon
    'PICKUP',
    'WAGON',
  ],

  // ============================================
  // MEANINGFUL TRIM LEVELS TO PRESERVE
  // ============================================
  preserve_trim_levels: [
    // Acura trims
    'PREMIUM', 'TECH', 'ADVANCE', 'A-SPEC', 'TYPE S', 'SH AWD',
    
    // Alfa Romeo trims  
    'TI', 'VELOCE', 'SPORT', 'SPRINT', 'QV',
    
    // Audi trims
    'COOL', 'EGO', 'ENVY', 'SLINE', 'S LINE', 'SPORT ONE', 'URBAN', 'ACTIVE',
    'AMBITION', 'ATTRACTION', 'AMBIENTE', 'QUATTRO', 'PLUS',
    
    // Generic meaningful terms
    'BASE', 'LX', 'EX', 'LIMITED', 'PLATINUM', 'TITANIUM',
  ],
};

/**
 * Clean version string by removing comfort/audio features while preserving technical specs
 * @param {string} versionString - Original version string
 * @returns {string} - Cleaned version string with technical specs preserved
 */
function cleanVersionString(versionString) {
  if (!versionString || typeof versionString !== 'string') {
    return '';
  }
  
  let cleaned = versionString.toUpperCase().trim();
  
  // Remove comfort/audio features (irrelevant)
  ZURICH_NORMALIZATION_DICTIONARY.irrelevant_comfort_audio.forEach(spec => {
    const regex = new RegExp(`\\b${spec}\\b`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  });
  
  // Apply regex patterns for complex removals
  Object.values(ZURICH_NORMALIZATION_DICTIONARY.regex_patterns).forEach(pattern => {
    if (pattern !== ZURICH_NORMALIZATION_DICTIONARY.regex_patterns.multiple_spaces && 
        pattern !== ZURICH_NORMALIZATION_DICTIONARY.regex_patterns.trim_spaces) {
      cleaned = cleaned.replace(pattern, ' ');
    }
  });
  
  // Clean up multiple spaces and trim
  cleaned = cleaned.replace(ZURICH_NORMALIZATION_DICTIONARY.regex_patterns.multiple_spaces, ' ');
  cleaned = cleaned.replace(ZURICH_NORMALIZATION_DICTIONARY.regex_patterns.trim_spaces, '');
  
  return cleaned;
}

/**
 * Normalize transmission code
 * @param {string} transmissionCode - Original transmission code
 * @returns {string} - Normalized transmission (AUTO/MANUAL)
 */
function normalizeTransmission(transmissionCode) {
  if (!transmissionCode || typeof transmissionCode !== 'string') {
    return '';
  }
  
  const normalized = transmissionCode.toUpperCase().trim();
  return ZURICH_NORMALIZATION_DICTIONARY.transmission_normalization[normalized] || normalized;
}

/**
 * Generate commercial hash from core vehicle specifications
 * @param {Object} vehicle - Vehicle object with marca, modelo, anio, transmision
 * @returns {string} - SHA-256 hash of commercial key
 */
async function generateCommercialHash(vehicle) {
  const { marca, modelo, anio, transmision } = vehicle;
  
  // Validate required fields
  if (!marca || !modelo || !anio || !transmision) {
    throw new Error('Missing required fields for hash generation');
  }
  
  // Create normalized commercial key
  const commercialKey = `${marca.toUpperCase()}_${modelo.toUpperCase()}_${anio}_${transmision.toUpperCase()}`;
  
  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(commercialKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

module.exports = {
  ZURICH_NORMALIZATION_DICTIONARY,
  cleanVersionString,
  normalizeTransmission,
  generateCommercialHash,
};