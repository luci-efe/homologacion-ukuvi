# Quickstart Guide: Zurich ETL Vehicle Homologation

## Overview

This guide provides step-by-step instructions to implement and test the Zurich ETL process for vehicle homologation. The workflow extracts vehicle data from Zurich database, normalizes it using n8n Code nodes, and integrates it with the master homologated catalog via Supabase RPC functions.

## Prerequisites

### Environment Setup
- n8n instance (Cloud or self-hosted)
- Access to Zurich SQL Server database (read-only)
- Supabase project with PostgreSQL database
- Service role key for Supabase API access

### Required Extensions
Enable the following PostgreSQL extensions in Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
```

### Database Schema
Ensure these tables exist in Supabase:
- `catalogo_homologado` - Master vehicle catalog
- `procesamiento_logs` - ETL processing logs
- `errores_procesamiento` - Error tracking

## Step 1: Database Connection Setup

### 1.1 SQL Server Connection
Create a new SQL Server node in n8n with the following configuration:

**Connection Parameters:**
```javascript
{
  "host": "zurich-db-server.domain.com",
  "database": "ZurichCatalogo",
  "username": "etl_reader",
  "password": "[SECURE_PASSWORD]",
  "port": 1433,
  "encrypt": true,
  "trustServerCertificate": true
}
```

### 1.2 Extraction Query
Use the optimized extraction query:

```sql
SELECT
    'ZURICH' as origen_aseguradora,
    v.fiId as id_original,
    m.fcMarca as marca,
    sm.fcSubMarca as modelo,
    v.fiModelo as anio,
    ISNULL(v.VersionCorta, v.fcVersion) as version_original,
    CASE
        WHEN v.fiTransmision = 1 THEN 'MANUAL'
        WHEN v.fiTransmision = 2 THEN 'AUTO'
        ELSE NULL
    END as transmision,
    1 as activo
FROM zurich.Version v
INNER JOIN zurich.Marcas m ON v.fiMarcaId = m.fiMarcaId
INNER JOIN zurich.SubMarcas sm ON v.fiMarcaId = sm.fiMarcaId
    AND v.fiSubMarcaId = sm.fiSubMarcaId
WHERE
    v.fiModelo BETWEEN 2000 AND 2030
ORDER BY m.fcMarca, sm.fcSubMarca, v.fiModelo
```

**Expected Output:** ~39,009 records

## Step 2: Data Normalization Code Node

### 2.1 Code Node Configuration
- **Mode:** "Run once for all items"
- **Language:** JavaScript
- **Memory Limit:** Consider batching for large datasets

### 2.2 Normalization Code Template

```javascript
// N8N Code Node - Zurich ETL Normalization
const crypto = require('crypto');

// Configuration
const BATCH_SIZE = 5000;
const logger = createLogger('zurich-etl', Date.now());

// Main processing function
const items = $input.all();
const results = [];
const errors = [];

logger.info(`Processing ${items.length} Zurich records`);

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  logger.info(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}`);

  for (const item of batch) {
    try {
      const processed = processZurichRecord(item.json);
      results.push({ json: processed });
    } catch (error) {
      logger.error(`Failed to process record ${item.json.id_original}:`, error);
      errors.push({
        json: {
          error: true,
          mensaje: error.message,
          id_original: item.json.id_original,
          codigo_error: categorizeError(error),
          registro_original: item.json,
          fecha_error: new Date().toISOString()
        }
      });
    }
  }
}

logger.info(`Completed processing: ${results.length} successful, ${errors.length} errors`);
return [...results, ...errors];

// Processing Functions
function processZurichRecord(record) {
  // Validation
  const validation = validateRecord(record);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Normalization
  const normalized = {
    origen_aseguradora: 'ZURICH',
    id_original: record.id_original,
    marca: normalizeMarca(record.marca),
    modelo: normalizeModelo(record.modelo),
    anio: record.anio,
    version_limpia: cleanVersionString(record.version_original),
    transmision: record.transmision,
    fecha_procesamiento: new Date().toISOString()
  };

  // Hash generation
  normalized.hash_comercial = generateCommercialHash(
    normalized.marca,
    normalized.modelo,
    normalized.anio,
    normalized.transmision
  );

  // Technical specifications extraction
  normalized.especificaciones_tecnicas = extractTechnicalSpecs(record.version_original);

  return normalized;
}

function validateRecord(record) {
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

  return { isValid: errors.length === 0, errors };
}

function normalizeMarca(marca) {
  return marca ? marca.trim().toUpperCase() : '';
}

function normalizeModelo(modelo) {
  return modelo ? modelo.trim().toUpperCase() : '';
}

function cleanVersionString(versionOriginal) {
  if (!versionOriginal) return '';

  let cleaned = versionOriginal.toUpperCase().trim();

  // Remove comfort/audio features (preserve technical specs)
  const comfortFeatures = [
    'AA', 'EE', 'CD', 'DVD', 'GPS', 'BT', 'USB', 'MP3', 'AM', 'RA', 'QC', 'VP'
  ];

  comfortFeatures.forEach(feature => {
    cleaned = cleaned.replace(new RegExp(`\\b${feature}\\b`, 'g'), '');
  });

  // Remove occupation patterns (3P 5OCUP, etc.)
  cleaned = cleaned.replace(/\b\d+P\s+\d+OCUP\b/g, '');

  // Remove transmission codes (handled separately)
  const transmissionCodes = ['AUT', 'STD', 'CVT', 'DSG', 'TIPTRONIC'];
  transmissionCodes.forEach(code => {
    cleaned = cleaned.replace(new RegExp(`\\b${code}\\b`, 'g'), '');
  });

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function extractTechnicalSpecs(versionOriginal) {
  if (!versionOriginal) return {};

  const specs = {};
  const version = versionOriginal.toUpperCase();

  // Extract power
  const powerMatch = version.match(/\b(\d+)HP\b/);
  if (powerMatch) specs.potencia = powerMatch[0];

  // Extract displacement
  const displacementMatch = version.match(/\b(\d+(?:\.\d+)?)L\b/);
  if (displacementMatch) specs.cilindrada = displacementMatch[0];

  // Extract cylinders
  const cylinderMatch = version.match(/\b(\d+)CIL\b/);
  if (cylinderMatch) {
    specs.cilindros = cylinderMatch[0];
    specs.motor_config = inferMotorConfig(cylinderMatch[1]);
  }

  // Extract body type
  const bodyTypes = ['SEDAN', 'SUV', 'HB', 'PICKUP', 'COUPE', 'CONV'];
  for (const body of bodyTypes) {
    if (version.includes(body)) {
      specs.carroceria = body === 'HB' ? 'HATCHBACK' :
                        body === 'CONV' ? 'CONVERTIBLE' : body;
      break;
    }
  }

  // Extract traction
  const tractionTypes = ['AWD', '4WD', 'FWD', 'RWD', '4X4'];
  for (const traction of tractionTypes) {
    if (version.includes(traction)) {
      specs.traccion = traction;
      break;
    }
  }

  // Extract safety features
  const safetyFeatures = [];
  if (version.includes('ABS')) safetyFeatures.push('ABS');
  if (version.includes('BA')) safetyFeatures.push('BA');
  if (safetyFeatures.length > 0) specs.seguridad = safetyFeatures;

  // Extract trim level
  const trimMatch = version.match(/^([A-Z\s]+?)(?:\s+(?:SEDAN|SUV|HB|PICKUP|COUPE|CONV))/);
  if (trimMatch) specs.trim_nivel = trimMatch[1].trim();

  return specs;
}

function inferMotorConfig(cylinders) {
  const config = {
    '3': 'L3', '4': 'L4', '5': 'L5',
    '6': 'V6', '8': 'V8', '10': 'V10', '12': 'V12'
  };
  return config[cylinders] || null;
}

function generateCommercialHash(marca, modelo, anio, transmision) {
  const normalized = [
    marca || '',
    modelo || '',
    anio ? anio.toString() : '',
    transmision || ''
  ].join('|').toLowerCase().trim();

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function categorizeError(error) {
  const message = error.message.toLowerCase();
  if (message.includes('validation')) return 'VALIDATION_ERROR';
  if (message.includes('hash')) return 'HASH_GENERATION_ERROR';
  if (message.includes('spec')) return 'SPEC_EXTRACTION_ERROR';
  return 'NORMALIZATION_ERROR';
}

function createLogger(name, batchId) {
  return {
    info: (message, data) => console.log(`[${name}:${batchId}] INFO: ${message}`, data || ''),
    error: (message, error) => console.error(`[${name}:${batchId}] ERROR: ${message}`, error),
    warn: (message, data) => console.warn(`[${name}:${batchId}] WARN: ${message}`, data || '')
  };
}
```

## Step 3: Supabase Integration

### 3.1 HTTP Request Node Configuration
Create an HTTP Request node with these settings:

**Request Configuration:**
- **Method:** POST
- **URL:** `https://zsyapaddgdrnqfdxxzjw.supabase.co/rest/v1/rpc/procesar_batch_zurich`
- **Headers:**
  - `apikey`: `[SERVICE_ROLE_KEY]`
  - `Authorization`: `Bearer [SERVICE_ROLE_KEY]`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`

**Body Template:**
```javascript
{
  "vehiculos_json": [
    // Array of normalized records from previous node
    {{ JSON.stringify($input.all().filter(item => !item.json.error).map(item => item.json)) }}
  ]
}
```

### 3.2 Batch Size Management
Add a Code node before the HTTP request to manage batch sizes:

```javascript
const items = $input.all().filter(item => !item.json.error);
const SUPABASE_BATCH_SIZE = 50000;
const batches = [];

for (let i = 0; i < items.length; i += SUPABASE_BATCH_SIZE) {
  batches.push({
    json: {
      vehiculos_json: items.slice(i, i + SUPABASE_BATCH_SIZE).map(item => item.json),
      batch_number: Math.floor(i / SUPABASE_BATCH_SIZE) + 1,
      total_batches: Math.ceil(items.length / SUPABASE_BATCH_SIZE)
    }
  });
}

return batches;
```

## Step 4: Error Handling and Monitoring

### 4.1 Error Branch Setup
Create error handling branches for:
- SQL extraction failures
- Normalization errors
- Supabase API failures

### 4.2 Monitoring Code Node
Add final monitoring node:

```javascript
const successItems = $input.all().filter(item => !item.json.error);
const errorItems = $input.all().filter(item => item.json.error);

const summary = {
  json: {
    workflow_execution: new Date().toISOString(),
    total_extracted: $('SQL Server').all().length,
    successful_normalized: successItems.length,
    errors: errorItems.length,
    error_breakdown: errorItems.reduce((acc, item) => {
      const errorType = item.json.codigo_error || 'UNKNOWN';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {}),
    supabase_responses: $('HTTP Request').all().map(item => ({
      status: item.json.status,
      total_procesados: item.json.total_procesados,
      registros_creados: item.json.registros_creados,
      errores: item.json.errores
    }))
  }
};

console.log('Zurich ETL Summary:', summary.json);
return [summary];
```

## Step 5: Testing and Validation

### 5.1 Small Batch Test
Start with a limited query to test the workflow:

```sql
-- Test query - limited records
SELECT TOP 100
    'ZURICH' as origen_aseguradora,
    v.fiId as id_original,
    m.fcMarca as marca,
    sm.fcSubMarca as modelo,
    v.fiModelo as anio,
    ISNULL(v.VersionCorta, v.fcVersion) as version_original,
    CASE
        WHEN v.fiTransmision = 1 THEN 'MANUAL'
        WHEN v.fiTransmision = 2 THEN 'AUTO'
        ELSE NULL
    END as transmision,
    1 as activo
FROM zurich.Version v
INNER JOIN zurich.Marcas m ON v.fiMarcaId = m.fiMarcaId
INNER JOIN zurich.SubMarcas sm ON v.fiMarcaId = sm.fiMarcaId
    AND v.fiSubMarcaId = sm.fiSubMarcaId
WHERE v.fiModelo = 2023
ORDER BY m.fcMarca, sm.fcSubMarca
```

### 5.2 Data Quality Validation
Run these validation queries in Supabase after processing:

```sql
-- Check for successful insertions
SELECT COUNT(*) as zurich_records
FROM catalogo_homologado
WHERE disponibilidad ? 'ZURICH';

-- Check error rates
SELECT
    codigo_error,
    COUNT(*) as count
FROM errores_procesamiento
WHERE origen_aseguradora = 'ZURICH'
GROUP BY codigo_error;

-- Sample records review
SELECT
    marca, modelo, anio, version_homologada,
    disponibilidad -> 'ZURICH' as zurich_data
FROM catalogo_homologado
WHERE disponibilidad ? 'ZURICH'
LIMIT 10;
```

### 5.3 Performance Benchmarks
Target performance metrics:
- **Extraction time:** <2 minutes for full dataset
- **Normalization time:** <3 minutes for 39K records
- **Supabase insertion:** <30 seconds per 50K batch
- **Total workflow time:** <5 minutes
- **Success rate:** >95% of records processed successfully

## Step 6: Production Deployment

### 6.1 Workflow Schedule
Set up the workflow to run:
- **Frequency:** Daily at off-peak hours
- **Timeout:** 10 minutes maximum
- **Retry policy:** 3 attempts with exponential backoff

### 6.2 Monitoring and Alerts
Configure alerts for:
- Workflow failures
- High error rates (>5%)
- Processing time exceeding thresholds
- Supabase API errors

### 6.3 Data Backup
Before running production:
1. Backup current `catalogo_homologado` table
2. Test rollback procedures
3. Verify data integrity constraints

## Troubleshooting

### Common Issues
1. **Memory errors in Code node:** Reduce batch size or implement streaming
2. **Supabase timeout:** Check batch sizes and network connectivity
3. **SQL connection failures:** Verify credentials and network access
4. **Hash collisions:** Review normalization logic and hash algorithm

### Debug Mode
Enable detailed logging by adding to Code nodes:
```javascript
console.log('Debug info:', {
  record_id: record.id_original,
  processing_step: 'normalization',
  memory_usage: process.memoryUsage()
});
```

## Success Criteria

The workflow is considered successful when:
- [ ] All 39,009 Zurich records are extracted
- [ ] >95% normalization success rate
- [ ] Commercial hashes generated for all valid records
- [ ] Technical specifications extracted for >90% of records
- [ ] Supabase homologation completes without errors
- [ ] No data corruption in master catalog
- [ ] Processing completes within 5-minute target