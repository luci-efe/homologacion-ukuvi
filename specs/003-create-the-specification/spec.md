# Feature Specification: Zurich ETL Process for Vehicle Homologation

**Feature Branch**: `003-create-the-specification`
**Created**: 2025-01-13
**Status**: Draft
**Input**: User description: "Create the specification for the ETL process of the aseguradora 'Zurich'. Consider for the context the files in PLAN-HOMOLOGACION.md src/insurers/zurich/zurich-analisis-normalizacion.md , src/insurers/zurich/zurich-analisis.md src/insurers/zurich/zurich-query-de-extraccion.sql, we want to do this inside of an n8n workflow, with a code node for the normalization. Check in depth documentation from context7 and https://docs.n8n.io/code/"

## Execution Flow (main)
```
1. Parse user description from Input
   � Extract ETL requirements for Zurich insurer data
2. Extract key concepts from description
   � Identify: Data extraction, normalization, homologation process, n8n workflow
3. For each unclear aspect:
   � Technical implementation details marked with [NEEDS CLARIFICATION]
4. Fill User Scenarios & Testing section
   � Data processing workflow scenarios identified
5. Generate Functional Requirements
   � Each requirement covers extraction, normalization, and persistence steps
6. Identify Key Entities
   � Vehicle records, commercial hash, version strings, transmissions
7. Run Review Checklist
   � WARN "Spec focuses on data processing requirements"
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT data needs to be processed and WHY
- L Avoid HOW to implement (specific n8n node configurations, JavaScript code structure)
- =e Written for data stakeholders and business analysts

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a data engineer working on vehicle homologation, I need to extract Zurich's vehicle catalog data, normalize it according to our commercial hashing strategy, and integrate it into our master homologated table so that all insurance vehicle records follow a consistent format for comparison and deduplication.

### Acceptance Scenarios
1. **Given** raw Zurich vehicle data exists in their database, **When** the ETL process runs, **Then** all vehicle records (marca, modelo, a�o, transmisi�n) must be extracted and available for processing
2. **Given** extracted Zurich data with version strings containing mixed specifications, **When** the normalization process runs, **Then** only technical specifications (HP, displacement, cylinders, drivetrain) are preserved while comfort features (AA, EE, CD) are removed
3. **Given** normalized vehicle data, **When** commercial hash generation occurs, **Then** each record gets a unique hash based on marca, modelo, a�o, and transmisi�n for homologation matching
4. **Given** processed Zurich data with commercial hashes, **When** the homologation process runs, **Then** records are either matched to existing entries or created as new entries in the master catalog
5. **Given** successful data processing, **When** the workflow completes, **Then** all Zurich vehicle variants are available in the homologated catalog with proper availability flags

### Edge Cases
- What happens when Zurich records have missing transmission data (fiTransmision = 0)?
- How does the system handle malformed VersionCorta strings that don't match expected patterns?
- What occurs when duplicate records exist within Zurich's own dataset?
- How are records processed when version strings contain unexpected technical specifications not in the normalization dictionary?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST extract all active Zurich vehicle records from the database using the predefined SQL query for model years 2000-2030
- **FR-002**: System MUST normalize marca and modelo fields by removing extra whitespace and standardizing capitalization
- **FR-003**: System MUST extract and clean version information from VersionCorta field, preserving technical specifications while removing comfort features
- **FR-004**: System MUST map Zurich transmission codes (1=MANUAL, 2=AUTO, 0=NULL) to standardized transmission values
- **FR-005**: System MUST generate commercial hash using the four core parameters: marca, modelo, a�o, transmisi�n
- **FR-006**: System MUST preserve technical specifications including horsepower (HP), engine displacement (L), cylinder count (CIL), drivetrain (AWD, 4WD), and safety features (ABS, BA)
- **FR-007**: System MUST remove comfort and audio specifications including AA, EE, CD, GPS, BT, USB, MP3 from version strings
- **FR-008**: System MUST complete the door number cases, by normalizing the door number from '3P' to '3puertas' for example using regex expressions such as '[0-9]+[P|p]uertas' from '[0-9]P' by replacing them in the 'version' field
- **FR-009**: System MUST validate that each processed record contains the four required fields for hash generation
- **FR-010**: System MUST format output data as JSON objects compatible with Supabase RPC function calls
- **FR-011**: System MUST process records in batches to avoid workflow timeouts
- **FR-012**: System MUST log processing statistics including total records processed, normalization success rate, and error counts
- **FR-013**: System MUST handle transmission extraction from version text when fiTransmision field is 0 or null
- **FR-014**: System MUST preserve trim levels (ADVANCE, PREMIUM, SPORT, etc.) as part of the cleaned version string
- **FR-015**: System MUST maintain data lineage by preserving Zurich's original ID and source information

### Key Entities *(include if feature involves data)*
- **Vehicle Record**: Represents a complete vehicle entry from Zurich with marca, modelo, a�o, version_original, and transmision fields
- **Commercial Hash**: Unique identifier generated from the four core vehicle parameters used for homologation matching
- **Normalized Version**: Cleaned version string with technical specifications preserved and comfort features removed
- **Transmission Mapping**: Standardized transmission values (MANUAL, AUTO, NULL) mapped from Zurich's numeric codes
- **Technical Specifications**: Preserved vehicle specs including power (HP), engine size (L), cylinders (CIL), drivetrain systems
- **Comfort Features**: Removed specifications including air conditioning (AA), electric windows (EE), CD player, and other non-technical amenities

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
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
- [ ] Review checklist passed

---