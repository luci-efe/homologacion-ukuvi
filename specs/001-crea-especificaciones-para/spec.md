# Feature Specification: HDI Insurer Vehicle Catalog Homologation Process

**Feature Branch**: `001-crea-especificaciones-para`
**Created**: 2025-01-13
**Status**: Draft
**Input**: User description: "Crea especificaciones para el proceso indicado en el archivo anterior, para la aseguradora HDI, cuyos archivos se encuentran en: src/insurers/hdi/hdi-analisis.md src/insurers/hdi/hdi-query-de-extracción.sql src/insurers/hdi/ . We're working on n8n, and our current workflow is found in src/insurers/hdi/ETL - HDI.json"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Identified: HDI insurer process specification for vehicle catalog homologation
2. Extract key concepts from description
   ’ Actors: HDI insurer, system operators, downstream systems
   ’ Actions: extract, normalize, deduplicate, homologate vehicle data
   ’ Data: vehicle catalog with 38,186 active records
   ’ Constraints: only active records, 2000-2030 year range
3. For each unclear aspect:
   ’ All technical aspects are well documented in analysis files
4. Fill User Scenarios & Testing section
   ’ Clear user flow for data processing operator
5. Generate Functional Requirements
   ’ Each requirement derived from technical analysis and plan
6. Identify Key Entities
   ’ Vehicle records, hash identifiers, specifications
7. Run Review Checklist
   ’ No [NEEDS CLARIFICATION] markers needed - comprehensive analysis available
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A data processing operator needs to extract vehicle catalog data from HDI insurer's database, normalize it according to the master catalog schema, remove duplicates, and integrate it into the unified vehicle homologation system. The process must handle HDI's unique data structure with comma-separated specifications while maintaining high data quality and traceability.

### Acceptance Scenarios
1. **Given** HDI database contains 84,579 total vehicle records with 38,186 active ones, **When** operator initiates extraction process, **Then** system extracts only active records from years 2000-2030 and processes exactly 38,186 records
2. **Given** HDI vehicle record with structured ClaveVersion field "GLS PREMIUM, L4, 1.5L, 113 CP, 5 PUERTAS, AUT, BA, AA", **When** system processes the record, **Then** it extracts trim "GLS PREMIUM", identifies automatic transmission, 4-cylinder engine, and 1.5L displacement
3. **Given** processed HDI records with generated technical hashes, **When** system performs deduplication, **Then** duplicate records with identical technical specifications are removed keeping only unique vehicles
4. **Given** normalized HDI records ready for integration, **When** system sends data to homologation workflow, **Then** records are successfully integrated with proper aseguradora identification and metadata

### Edge Cases
- What happens when ClaveVersion field is malformed or missing comma separators?
- How does system handle HDI records with incomplete specifications (missing transmission, engine config)?
- What occurs when extraction query returns fewer than expected 38,186 active records?
- How are HDI-specific trim names like "I SPORT" and "S LINE" preserved during normalization?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST extract only active vehicle records (Activo = 1) from HDI database totaling approximately 38,186 records
- **FR-002**: System MUST filter records to include only vehicles from years 2000-2030
- **FR-003**: System MUST parse HDI's comma-separated ClaveVersion field to extract trim, engine configuration, displacement, transmission, and other specifications
- **FR-004**: System MUST normalize transmission codes (AUT’AUTO, STD’MANUAL, CVT’AUTO, DSG’AUTO) to standard format
- **FR-005**: System MUST extract and clean version/trim names by removing technical specifications like "CP PUERTAS", "BASE", transmission types, and engine details
- **FR-006**: System MUST generate commercial hash using normalized marca, modelo, año, and transmisión fields
- **FR-007**: System MUST generate technical hash including version and all extracted specifications for deduplication
- **FR-008**: System MUST deduplicate records based on technical hash to eliminate identical vehicle configurations
- **FR-009**: System MUST preserve HDI as origin aseguradora identifier throughout the process
- **FR-010**: System MUST maintain traceability by preserving original HDI IdVersion and ClaveVersion values
- **FR-011**: System MUST validate that processed records contain required main specifications before integration
- **FR-012**: System MUST handle HDI's structured data format with 67.6% door specifications and 69% displacement coverage
- **FR-013**: System MUST infer vehicle body type when possible based on door count and version text
- **FR-014**: System MUST extract technical specifications including engine configuration, displacement, power, and drivetrain when available

### Key Entities *(include if feature involves data)*
- **Vehicle Record**: Represents a single vehicle configuration from HDI with original IdVersion, marca, modelo, año, ClaveVersion, and active status
- **Normalized Specifications**: Processed vehicle attributes including cleaned version/trim, standardized transmission, extracted engine config, displacement, body type, and drivetrain
- **Hash Identifiers**: Commercial hash for basic vehicle identification and technical hash for complete specification matching and deduplication
- **Processing Metadata**: Tracking information including origin aseguradora (HDI), processing date, validation status, and original field values for audit trail

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---