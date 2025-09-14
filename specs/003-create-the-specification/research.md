# Research Findings: Zurich ETL Process for Vehicle Homologation

## Technical Architecture Decisions

### Decision: n8n Code Node for Data Transformation
**Rationale**: n8n Code nodes provide sandboxed JavaScript runtime with access to all input data, allowing complex normalization logic without external dependencies.

**Alternatives considered**:
- Custom Node.js service: More complex deployment, requires separate infrastructure
- Python scripts: Not natively supported in n8n Cloud, requires self-hosted instance

**Implementation details**:
- JavaScript ES6+ support in n8n runtime
- Memory limit: 16MB payload per node execution
- Batch processing: 5000-50000 records per execution
- Error handling: Try-catch blocks with structured error outputs

### Decision: Commercial Hash Strategy
**Rationale**: Use 4-parameter hash (marca, modelo, año, transmisión) for consistent vehicle identification across insurers, enabling fuzzy matching on version field.

**Alternatives considered**:
- Full record hash: Too specific, prevents variant matching
- 3-parameter hash: Insufficient for transmission differentiation
- String similarity only: Computationally expensive at scale

**Implementation details**:
- SHA-256 hash of normalized concatenated fields
- Normalization: trim, lowercase, standardize transmission codes
- Hash reproducibility: Critical for cross-insurer matching

### Decision: Version Field Normalization Strategy
**Rationale**: Preserve technical specifications (HP, displacement, cylinders, safety features) while removing comfort/audio features for precise homologation.

**Alternatives considered**:
- Full version preservation: Creates too many unique variants
- Complete version removal: Loses important technical differentiation
- Regex-only cleaning: Insufficient for complex patterns

**Preserved specifications**:
- Power specs: HP ratings, turbo indicators
- Engine specs: Displacement (L), cylinder count (CIL), configuration
- Safety specs: ABS, airbags (BA), traction systems (AWD, 4WD)
- Removed specs: A/A, E/E, CD, GPS, audio equipment

### Decision: Supabase RPC Function for Homologation Logic
**Rationale**: Server-side processing ensures data consistency, enables complex PostgreSQL fuzzy matching extensions (pg_trgm), handles concurrent access.

**Alternatives considered**:
- Client-side matching in n8n: Limited fuzzy matching capabilities
- Direct SQL operations: More complex error handling and transaction management
- External API service: Additional infrastructure complexity

**Implementation details**:
- Batch size: 50,000 records per RPC call
- Fuzzy matching: pg_trgm extension with similarity threshold ≥ 0.85
- Transaction safety: RPC function handles rollback on errors
- Response format: JSON with processing statistics and error details

### Decision: SQL Server Database Connection
**Rationale**: Direct connection to Zurich database for real-time data extraction, ensuring data freshness and avoiding intermediate file exports.

**Alternatives considered**:
- CSV export/import: Manual process, data staleness risk
- Data lake integration: Over-engineered for single-source ETL
- Scheduled snapshots: Complexity without clear benefit

**Connection specifications**:
- Read-only access to zurich.Version, zurich.Marcas, zurich.SubMarcas tables
- Query optimization: JOIN operations with year filtering (2000-2030)
- Record deduplication: ROW_NUMBER() window function for latest records

### Decision: Transmission Code Mapping
**Rationale**: Zurich uses numeric codes (1=MANUAL, 2=AUTO, 0=NULL) requiring standardization to text values for homologation consistency.

**Mapping logic**:
```javascript
{
  1: 'MANUAL',
  2: 'AUTO',
  0: null // Extract from version text if available
}
```

**Fallback strategy**: When fiTransmision = 0, attempt extraction from VersionCorta field using transmission pattern recognition.

## Data Quality Analysis

### Zurich Data Characteristics
- **Total records**: 39,009 (years 2000-2030)
- **Unique brands**: 59
- **Unique models**: 77
- **Data completeness**: 99% have power specs, 95% have displacement, 94% have cylinder info
- **Version field**: VersionCorta is well-structured, contains technical specifications

### Data Normalization Requirements
- **Brand/model normalization**: Trim whitespace, standardize capitalization
- **Year validation**: Ensure range 2000-2030, convert to integer
- **Transmission mapping**: Handle numeric codes and text extraction
- **Version cleaning**: Remove comfort features, preserve technical specs
- **Door count normalization**: Convert '3P' to '3puertas' pattern matching

## Performance Specifications

### Processing Targets
- **Total processing time**: <5 minutes for full Zurich catalog
- **Batch processing**: 5,000 records per n8n Code node execution
- **Supabase batch**: 50,000 records per RPC call
- **Memory usage**: Stay within n8n 16MB payload limits
- **Error tolerance**: Continue processing on individual record failures

### Monitoring Requirements
- **Success metrics**: Total processed, normalization success rate
- **Error tracking**: Failed records with original data preservation
- **Performance metrics**: Processing duration, throughput per batch
- **Data quality**: Validation failure counts and types

## Integration Patterns

### n8n Workflow Design
- **Node sequence**: SQL extraction → Code normalization → HTTP Supabase RPC
- **Error handling**: Try-catch in Code nodes, error branch routing
- **Batch management**: Split large datasets into manageable chunks
- **Retry logic**: Circuit breaker pattern for Supabase connection failures

### Database Connections
- **Source**: SQL Server with connection pooling
- **Target**: Supabase PostgreSQL via REST API
- **Backup strategy**: Error records logged to separate table
- **Data lineage**: Preserve original IDs and source information

## Security and Compliance
- **Database access**: Read-only permissions for Zurich source
- **API security**: Supabase service role key for RPC functions
- **Data privacy**: No PII processing, vehicle catalog data only
- **Audit trail**: Processing logs with timestamps and record counts