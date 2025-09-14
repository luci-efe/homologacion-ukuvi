# Data Model: Zurich ETL Vehicle Homologation

## Core Entities

### ZurichVehicleRecord
**Description**: Raw vehicle record extracted from Zurich database

**Fields**:
- `id_original`: String - Zurich's internal vehicle ID (fiId)
- `marca`: String - Vehicle brand name from Zurich.Marcas.fcMarca
- `modelo`: String - Vehicle model name from Zurich.SubMarcas.fcSubMarca
- `anio`: Number - Model year from Zurich.Version.fiModelo (2000-2030)
- `version_original`: String - Original version string from VersionCorta or fcVersion
- `transmision_codigo`: Number - Transmission code (1=Manual, 2=Auto, 0=Unspecified)
- `transmision`: String - Normalized transmission ('MANUAL', 'AUTO', NULL)
- `activo`: Number - Active flag (always 1 for Zurich)

**Validation Rules**:
- `anio` must be between 2000 and 2030
- `marca` and `modelo` cannot be empty or null
- `id_original` must be unique within extraction batch

### NormalizedVehicleRecord
**Description**: Processed and normalized vehicle record ready for homologation

**Fields**:
- `origen_aseguradora`: String - Always 'ZURICH'
- `id_original`: String - Preserved from source record
- `marca_normalizada`: String - Trimmed and standardized brand name
- `modelo_normalizado`: String - Trimmed and standardized model name
- `anio`: Number - Validated model year
- `version_limpia`: String - Cleaned version with integrated technical specifications (power, displacement, cylinders, doors, traction)
- `transmision`: String - Normalized transmission value
- `hash_comercial`: String - SHA-256 hash of marca + modelo + anio + transmision
- `fecha_procesamiento`: DateTime - Processing timestamp
- `errores_validacion`: Array - Validation errors encountered

**Version Limpia Format**:
```javascript
// Integrated technical specifications in clean version string:
// "[TRIM_LEVEL] [BODY_TYPE] [POWER] [DISPLACEMENT] [CYLINDERS] [DOORS] [TRACTION]"
// Example: "ADVANCE SEDAN 145HP 2L 4CIL 4Puertas AWD"
// Note: Security features (ABS, BA) and occupant info (5OCUP) are excluded as irrelevant
```

**Validation Rules**:
- `hash_comercial` must be unique within processing batch
- `version_limpia` cannot be empty after normalization
- `version_limpia` should contain power specification matching pattern /\d+HP/
- `version_limpia` should contain displacement matching pattern /\d+(\\.\d+)?L/
- `version_limpia` should contain doors in format /\d+Puertas/

### HomologatedVehicleEntry
**Description**: Final homologated record in master catalog

**Fields**:
- `id`: UUID - Auto-generated primary key
- `hash_comercial`: String - Commercial hash for matching
- `marca`: String - Standardized brand name
- `modelo`: String - Standardized model name
- `anio`: Number - Model year
- `transmision`: String - Standardized transmission
- `version_homologada`: String - Homologated version string with integrated technical specifications
- `disponibilidad`: JSONB - Availability by insurer
- `confianza_score`: Number - Matching confidence (0.0-1.0)
- `fecha_creacion`: DateTime - Record creation timestamp
- `fecha_actualizacion`: DateTime - Last update timestamp

**JSONB Structure**:
```javascript
disponibilidad: {
  "ZURICH": {
    "activo": true,
    "version_original": "ADVANCE SEDAN CVT AA EE CD BA QC VP 145HP ABS 2L 4CIL 4P 5OCUP",
    "version_limpia": "ADVANCE SEDAN 145HP 2L 4CIL 4Puertas",
    "id_original": "12345",
    "fecha_agregado": "2025-01-13T10:00:00Z"
  }
}

// Note: No separate specifications field - all technical details are integrated
// into version_homologada string for consistency with master catalog structure
```

## State Transitions

### Extraction State
```
Raw Zurich Data → ZurichVehicleRecord
- Validation: Check required fields
- Transformation: Map database fields to entity
- Error handling: Log invalid records
```

### Normalization State
```
ZurichVehicleRecord → NormalizedVehicleRecord
- Brand/Model normalization: Trim, standardize case
- Version cleaning: Remove comfort/security features, integrate technical specs
- Door format conversion: Convert "4P" to "4Puertas" format
- Remove irrelevant data: Occupant count, security features
- Transmission mapping: Convert codes to standard values
- Hash generation: Create commercial hash
- Technical spec integration: Rebuild version with power, displacement, cylinders, doors
```

### Homologation State
```
NormalizedVehicleRecord → HomologatedVehicleEntry
- Hash lookup: Search existing records by commercial hash
- Fuzzy matching: Compare versions using pg_trgm similarity
- Decision logic:
  - Exact hash match + high similarity (≥0.85): Update availability
  - Exact hash match + low similarity (<0.85): Create new variant
  - No hash match: Create new entry
- Availability update: Add Zurich to insurer list
```

## Relationships

### One-to-Many: ZurichVehicleRecord → NormalizedVehicleRecord
- Multiple Zurich records may normalize to same hash (duplicates)
- Deduplication occurs at normalization stage
- Latest record by processing timestamp takes precedence

### Many-to-One: NormalizedVehicleRecord → HomologatedVehicleEntry
- Multiple insurer records may match to same homologated entry
- Fuzzy matching determines relationship strength
- Availability JSONB tracks all contributing insurers

## Data Quality Rules

### Required Fields Validation
```javascript
function validateZurichRecord(record) {
  const errors = [];

  if (!record.marca || record.marca.trim() === '') {
    errors.push('marca is required');
  }

  if (!record.modelo || record.modelo.trim() === '') {
    errors.push('modelo is required');
  }

  if (!record.anio || record.anio < 2000 || record.anio > 2030) {
    errors.push('anio must be between 2000-2030');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Normalization Quality Checks
```javascript
function validateNormalizedRecord(record) {
  const warnings = [];

  if (!record.version_limpia || record.version_limpia.trim() === '') {
    warnings.push('version_limpia is empty after normalization');
  }

  // Check for integrated technical specifications in version_limpia
  if (!record.version_limpia.match(/\b\d+HP\b/)) {
    warnings.push('No power specification found in version_limpia');
  }

  if (!record.version_limpia.match(/\b\d+(\\.\d+)?L\b/)) {
    warnings.push('No displacement specification found in version_limpia');
  }

  if (!record.version_limpia.match(/\b\d+Puertas\b/)) {
    warnings.push('No door count specification found in version_limpia');
  }

  if (!record.hash_comercial || record.hash_comercial.length !== 64) {
    warnings.push('Invalid hash_comercial format');
  }

  return warnings;
}

function cleanVersionString(versionOriginal) {
  if (!versionOriginal) return '';

  let cleaned = versionOriginal.toUpperCase().trim();
  const extractedSpecs = {};

  // Extract technical specifications before removal
  extractedSpecs.power = cleaned.match(/\b(\d+HP)\b/);
  extractedSpecs.displacement = cleaned.match(/\b(\d+(?:\\.\d+)?L)\b/);
  extractedSpecs.cylinders = cleaned.match(/\b(\d+CIL)\b/);
  extractedSpecs.doors = cleaned.match(/\b(\d+)P\b/); // Extract door count
  extractedSpecs.traction = cleaned.match(/\b(AWD|4WD|FWD|RWD|4X4)\b/);

  // Remove ALL unwanted elements
  const removePatterns = [
    // Comfort/audio features
    /\b(AA|EE|CD|DVD|GPS|BT|USB|MP3|AM|RA|QC|VP)\b/g,
    // Security features (now excluded as irrelevant)
    /\b(ABS|BA|ESC|TCS)\b/g,
    // Transmission codes (handled separately)
    /\b(AUT|STD|CVT|DSG|TIPTRONIC|S\s+TRONIC|SELESPEED|Q-TRONIC|DCT)\b/g,
    // Occupant information (now irrelevant)
    /\b\d+OCUP\b/g,
    // Door patterns (will be reformatted)
    /\b\d+P\b/g,
    // Technical specs (will be re-added in proper order)
    /\b\d+HP\b/g,
    /\b\d+(?:\\.\d+)?L\b/g,
    /\b\d+CIL\b/g,
    /\b(AWD|4WD|FWD|RWD|4X4)\b/g
  ];

  removePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Clean up extra spaces and get base version
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Rebuild version with technical specs in proper order
  const orderedSpecs = [];

  if (extractedSpecs.power) orderedSpecs.push(extractedSpecs.power[1]);
  if (extractedSpecs.displacement) orderedSpecs.push(extractedSpecs.displacement[1]);
  if (extractedSpecs.cylinders) orderedSpecs.push(extractedSpecs.cylinders[1]);
  if (extractedSpecs.doors) orderedSpecs.push(`${extractedSpecs.doors[1]}Puertas`);
  if (extractedSpecs.traction) orderedSpecs.push(extractedSpecs.traction[1]);

  // Combine base version with technical specs
  const finalVersion = [cleaned, ...orderedSpecs].filter(part => part && part.trim()).join(' ');

  return finalVersion.replace(/\s+/g, ' ').trim();
}
```

## Performance Considerations

### Batch Processing Sizes
- **Extraction batch**: 5,000 records per n8n Code node execution
- **Normalization batch**: Process all extracted records in single pass
- **Homologation batch**: 50,000 records per Supabase RPC call

### Memory Management
- Use streaming processing for large datasets
- Clear processed batches from memory after each iteration
- Monitor n8n payload limits (16MB maximum)

### Database Optimization
- Index on `hash_comercial` for fast lookups
- GIN index on `disponibilidad` JSONB for insurer queries
- Trigram index on `version_homologada` for fuzzy matching

## Error Handling Strategies

### Validation Errors
- Continue processing with error flagged records
- Log validation errors for manual review
- Preserve original record data for debugging

### Processing Errors
- Isolate failed records to prevent batch failure
- Retry logic for transient errors
- Dead letter queue for persistent failures

### Data Integrity
- Foreign key constraints on reference data
- Check constraints on year ranges and enum values
- Unique constraints on hash_comercial within batches