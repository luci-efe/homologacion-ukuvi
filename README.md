# Vehicle Homologation System - UKUVI

A comprehensive ETL system that unifies vehicle catalogs from multiple Mexican insurance companies into a single, normalized master catalog with intelligent deduplication and cross-insurer compatibility matching.

## 🎯 Project Overview

This system addresses the challenge of consolidating heterogeneous vehicle data from 11+ insurance companies (Qualitas, HDI, AXA, GNP, Mapfre, Chubb, Zurich, Atlas, BX, El Potosí, ANA) into a unified catalog that enables:

- **Cross-insurer vehicle comparison** with normalized specifications
- **Intelligent deduplication** using hash-based matching and fuzzy algorithms
- **Active/inactive status tracking** per insurer with full audit trail
- **Scalable ETL processing** handling millions of vehicle records
- **API-ready homologated catalog** for multicotización systems

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Insurance     │───▶│     n8n      │───▶│    Supabase     │───▶│   Master     │
│   Databases     │    │  Workflows   │    │  PostgreSQL     │    │   Catalog    │
│  (11+ sources)  │    │   (ETL)      │    │   (Storage)     │    │ (Unified)    │
└─────────────────┘    └──────────────┘    └─────────────────┘    └──────────────┘
```

### Data Flow Pipeline

1. **Extraction**: SQL queries pull raw vehicle data from insurance databases
2. **Normalization**: n8n workflows standardize brands, models, versions, and technical specs
3. **Homologation**: Supabase RPC functions perform intelligent matching and deduplication
4. **Storage**: Master catalog maintains unified vehicle records with per-insurer availability

### Key Technologies

- **n8n**: ETL orchestration and data transformation
- **Supabase/PostgreSQL**: Data storage with advanced matching algorithms
- **PostgreSQL Extensions**: `pg_trgm` for fuzzy string matching
- **SHA-256 Hashing**: Deterministic vehicle identification
- **JSONB**: Flexible per-insurer availability tracking

## 📊 Data Model

### Master Catalog Schema

The `catalogo_homologado` table serves as the single source of truth:

```sql
CREATE TABLE catalogo_homologado (
    -- Unique identifiers
    id BIGSERIAL PRIMARY KEY,
    id_canonico VARCHAR(64) UNIQUE NOT NULL,
    hash_comercial VARCHAR(64) NOT NULL,

    -- Normalized vehicle data
    marca VARCHAR(100) NOT NULL,           -- TOYOTA, NISSAN, etc.
    modelo VARCHAR(150) NOT NULL,          -- COROLLA, SENTRA, etc.
    anio INTEGER NOT NULL,                 -- 2020, 2021, etc.
    transmision VARCHAR(20),               -- MANUAL, AUTO, null
    version TEXT,                          -- "ADVANCE SEDAN 145HP 2L 4CIL 4PUERTAS AWD"

    -- Traceability strings
    string_comercial TEXT NOT NULL,        -- "TOYOTA|COROLLA|2020|AUTO"
    string_tecnico TEXT NOT NULL,          -- Full technical specification string

    -- Per-insurer availability (JSONB)
    disponibilidad JSONB DEFAULT '{}',

    -- Confidence and timestamps
    confianza_score DECIMAL(3,2) DEFAULT 1.0,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);
```

### Availability Tracking Structure

```json
{
  "disponibilidad": {
    "QUALITAS": {
      "activo": true,
      "id_original": "Q_156789",
      "version_original": "COROLLA ADVANCE CVT AA EE CD BA 145HP 2L 4CIL 4P 5OCUP",
      "fecha_actualizacion": "2025-01-15T10:00:00Z"
    },
    "HDI": {
      "activo": false,
      "id_original": "HDI_3787",
      "version_original": "COROLLA PREMIUM 1.8L SEDAN AUTOMATICO",
      "fecha_actualizacion": "2025-01-14T15:30:00Z"
    }
  }
}
```

## 🔧 Installation & Setup

### Prerequisites

- **n8n**: Self-hosted or cloud instance
- **Supabase**: Project with PostgreSQL database
- **Database Access**: Credentials for insurance company databases
- **Node.js**: For local development and testing

### Environment Configuration

Create `.env` file in project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Connections
QUALITAS_DB_HOST=qualitas-db-host
QUALITAS_DB_USER=username
QUALITAS_DB_PASS=password
QUALITAS_DB_NAME=database_name

HDI_DB_HOST=hdi-db-host
HDI_DB_USER=username
HDI_DB_PASS=password
HDI_DB_NAME=database_name

# Add similar entries for other insurers...
```

### Database Setup

1. **Initialize Supabase tables**:
   ```sql
   -- Run the schema from src/supabase/Tabla maestra.sql
   ```

2. **Deploy RPC functions**:
   ```sql
   -- Deploy from src/supabase/Funcion RPC Nueva.sql
   ```

3. **Create necessary indexes**:
   ```sql
   CREATE INDEX idx_hash_comercial_hom ON catalogo_homologado(hash_comercial);
   CREATE INDEX idx_disponibilidad_gin_hom ON catalogo_homologado USING GIN(disponibilidad);
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX idx_version_trgm ON catalogo_homologado USING GIN(version gin_trgm_ops);
   ```

### n8n Workflow Deployment

1. **Import workflows**: Load ETL workflows from `src/insurers/[name]/ETL - [Name].json`
2. **Configure credentials**: Set up database connections in n8n
3. **Test individual workflows**: Start with small data samples
4. **Schedule executions**: Set up automated runs for production

## 🚀 Usage

### Running ETL for a Single Insurer

1. **Navigate to n8n interface**
2. **Open specific insurer workflow** (e.g., "ETL - Zurich")
3. **Execute manually** for testing
4. **Monitor processing logs** for success/error counts
5. **Verify results** in Supabase `catalogo_homologado` table

### Processing Flow Example

```javascript
// 1. Raw Zurich data extraction
{
  "id_original": "12345",
  "marca": "Toyota",
  "modelo": "Corolla",
  "anio": 2023,
  "version_original": "ADVANCE SEDAN CVT AA EE CD BA 145HP ABS 2L 4CIL 4P 5OCUP",
  "transmision_codigo": 2
}

// 2. n8n normalization
{
  "id_canonico": "a1b2c3d4e5f6...",
  "hash_comercial": "7890abcdef...",
  "marca": "TOYOTA",
  "modelo": "COROLLA",
  "anio": 2023,
  "version": "ADVANCE SEDAN 145HP 2L 4CIL 4PUERTAS",
  "transmision": "AUTO",
  "origen_aseguradora": "ZURICH",
  "activo": true
}

// 3. Supabase homologation result
{
  "success": true,
  "staged": 1,
  "procesados": {
    "nuevos": 0,
    "actualizados": 1,
    "enriquecidos": 0,
    "conflictos": 0
  }
}
```

### API Access

Query the homologated catalog via Supabase REST API:

```bash
# Get all active Toyota Corollas
curl "https://your-project.supabase.co/rest/v1/catalogo_homologado?marca=eq.TOYOTA&modelo=eq.COROLLA" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Get vehicles available at specific insurer
curl "https://your-project.supabase.co/rest/v1/catalogo_homologado?disponibilidad->>QUALITAS->>activo=eq.true" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 🔍 Fuzzy Matching Algorithm

### How It Works

The system uses PostgreSQL's `pg_trgm` extension for intelligent cross-insurer matching:

1. **Hash Grouping**: Vehicles with identical `hash_comercial` (marca+modelo+año+transmisión) are grouped
2. **Fuzzy Comparison**: Within groups, `version` strings are compared using trigram similarity
3. **Threshold Application**: Similarity scores ≥ 0.85 trigger matches
4. **Conflict Resolution**: Lower scores create new records with warnings

### Example Matching

```sql
-- These would match (similarity ≈ 0.92)
version1: "ADVANCE SEDAN 145HP 2L 4CIL 4PUERTAS"
version2: "ADVANCE SEDAN 145HP 2.0L 4CIL 4P"

-- These would not match (similarity ≈ 0.67)
version1: "ADVANCE SEDAN 145HP 2L 4CIL 4PUERTAS"
version2: "PREMIUM HATCHBACK 180HP 1.8L 4CIL 5PUERTAS"
```

## 📈 Performance & Scalability

### Batch Processing

- **Extraction batches**: 5,000 records per n8n execution
- **Normalization**: Single-pass processing per insurer
- **Homologation batches**: Up to 50,000 records per Supabase RPC call

### Database Optimization

- **B-tree indexes**: On frequently queried fields (marca, modelo, año)
- **GIN indexes**: On JSONB availability data and trigram version matching
- **Hash indexes**: On commercial hash for exact lookups

### Monitoring

Track system performance through:
- n8n execution logs and timings
- Supabase RPC response metrics
- PostgreSQL query performance stats
- Data quality validation reports

## 🏢 Supported Insurance Companies

| Insurer | Status | Records | Special Notes |
|---------|--------|---------|---------------|
| Qualitas | ✅ Active | ~500K | Primary reference data |
| HDI | ✅ Active | ~300K | Rich technical specifications |
| Zurich | ✅ Active | ~250K | Complex version parsing |
| AXA | ✅ Active | ~200K | Multi-table joins required |
| GNP | ✅ Active | ~180K | Custom normalization logic |
| Mapfre | ✅ Active | ~150K | Standard processing |
| Chubb | 🚧 In Progress | ~100K | Data quality issues |
| Atlas | 🚧 In Progress | ~80K | Schema variations |
| BX | 📋 Planned | ~60K | API integration needed |
| El Potosí | 📋 Planned | ~40K | Limited data available |
| ANA | 📋 Planned | ~30K | New integration |

## 🧪 Testing & Validation

### Data Quality Checks

```sql
-- Validate processing results
SELECT
    origen_aseguradora,
    COUNT(*) as total_records,
    COUNT(DISTINCT hash_comercial) as unique_vehicles,
    AVG(confianza_score) as avg_confidence
FROM catalogo_homologado
GROUP BY origen_aseguradora;

-- Check for normalization issues
SELECT marca, COUNT(*)
FROM catalogo_homologado
WHERE marca LIKE '% %'  -- Multi-word brands
GROUP BY marca
ORDER BY count DESC;
```

### Integration Testing

1. **Small batch testing**: Process 100-1000 records per insurer
2. **Cross-insurer matching**: Verify fuzzy matching accuracy
3. **Performance testing**: Measure processing times at scale
4. **Data integrity**: Validate hash consistency and deduplication

## 🔒 Security & Compliance

### Data Protection

- **Database credentials**: Stored securely in environment variables
- **API access**: Supabase RLS policies restrict data access
- **Audit trails**: Complete processing history maintained
- **Backup strategy**: Regular database snapshots

### Access Control

- **n8n workflows**: Restricted to authorized ETL operators
- **Supabase admin**: Limited to senior technical staff
- **API consumption**: Rate-limited and authenticated
- **Source databases**: Read-only access only

## 🛠️ Development Workflow

### Adding New Insurance Companies

1. **Create insurer directory**: `src/insurers/[name]/`
2. **Data analysis**: Document source schema in `[name]-analisis.md`
3. **Extract query**: Develop SQL in `[name]-query-de-extraccion.sql`
4. **Normalization logic**: Create transformation in `[name]-codigo-de-normalizacion.js`
5. **n8n workflow**: Build complete ETL in `ETL - [Name].json`
6. **Testing**: Validate with small batches before production
7. **Documentation**: Update README and CLAUDE.md

### Code Standards

- **Consistent hashing**: Use identical hash generation across all insurers
- **Version integration**: All technical specs must go into single `version` field
- **Error handling**: Graceful degradation with comprehensive logging
- **Idempotency**: Re-running workflows produces identical results

## 📚 Documentation

- **`CLAUDE.md`**: Technical guidance for AI-assisted development
- **`specs/003-create-the-specification/`**: Current feature specifications
- **`src/insurers/[name]/[name]-analisis.md`**: Per-insurer data analysis
- **`.qoder/repowiki/`**: Comprehensive project wiki

## 🤝 Contributing

### Development Setup

1. **Fork repository** and create feature branch
2. **Set up local environment** with required credentials
3. **Test changes** with small data samples
4. **Update documentation** for any schema/process changes
5. **Submit pull request** with comprehensive testing results

### Code Review Process

- **Technical accuracy**: Verify hash generation and normalization logic
- **Performance impact**: Assess scaling implications
- **Data integrity**: Confirm idempotency and error handling
- **Documentation**: Ensure comprehensive updates

## 📧 Support & Contact

For technical questions, data issues, or feature requests:

- **Project Wiki**: `.qoder/repowiki/` for comprehensive documentation
- **Issue Tracking**: Create detailed bug reports with sample data
- **Feature Requests**: Include business justification and technical requirements

## 📄 License

This project contains proprietary business logic and data integration processes. All rights reserved.

---

**Last Updated**: January 2025
**System Status**: Production Ready
**Next Milestone**: Complete integration of remaining 3 insurance companies