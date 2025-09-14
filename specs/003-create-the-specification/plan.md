# Implementation Plan: Zurich ETL Process for Vehicle Homologation


**Branch**: `003-create-the-specification` | **Date**: 2025-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-create-the-specification/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement an n8n ETL workflow to extract Zurich vehicle catalog data, normalize it using commercial hashing strategy, and integrate it into the master homologated table. The workflow uses Code nodes for data transformation, SQL extraction from Zurich database, and Supabase RPC functions for persistence and homologation matching.

## Technical Context
**Language/Version**: JavaScript (n8n Code Nodes), SQL Server T-SQL, PostgreSQL/Supabase RPC
**Primary Dependencies**: n8n workflow orchestrator, Supabase (PostgreSQL + RPC), SQL Server database
**Storage**: SQL Server (Zurich source data), Supabase PostgreSQL (homologated catalog)
**Testing**: n8n workflow testing, SQL query validation, data quality validation
**Target Platform**: n8n Cloud/Self-hosted, Supabase cloud platform
**Project Type**: single (ETL data processing workflow)
**Performance Goals**: Process ~39,009 Zurich records, 5000-50000 records per batch, <5min total processing
**Constraints**: n8n memory limits (16MB payload), Supabase RPC timeout limits, SQL query timeouts
**Scale/Scope**: 39,009 Zurich records, 59 unique brands, 77 unique models, years 2000-2030

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (ETL workflow only)
- Using framework directly? (n8n native Code nodes, no wrapper libraries)
- Single data model? (Zurich vehicle records → normalized format, no DTOs)
- Avoiding patterns? (Direct data processing, no Repository pattern needed)

**Architecture**:
- EVERY feature as library? (N/A - ETL workflow is standalone)
- Libraries listed: [zurich-etl-normalization: data transformation and hash generation]
- CLI per library: [N/A - workflow-based execution]
- Library docs: llms.txt format planned? (Yes, normalization logic documented)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (Yes - data validation tests before processing)
- Git commits show tests before implementation? (Yes - test SQL queries and validation first)
- Order: Contract→Integration→E2E→Unit strictly followed? (Modified: Data validation → Processing → End-to-end)
- Real dependencies used? (Yes - actual Zurich database, actual Supabase)
- Integration tests for: new libraries, contract changes, shared schemas? (Yes - RPC function contracts, data model validation)
- FORBIDDEN: Implementation before test, skipping RED phase (Enforced)

**Observability**:
- Structured logging included? (Yes - n8n workflow logging, error tracking)
- Frontend logs → backend? (N/A - no frontend)
- Error context sufficient? (Yes - failed records logged with original data)

**Versioning**:
- Version number assigned? (1.0.0 - initial Zurich ETL implementation)
- BUILD increments on every change? (Yes)
- Breaking changes handled? (Yes - backward compatible normalization functions)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - ETL workflow with data processing focus

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- SQL extraction validation → contract test task [P]
- Normalization code node → implementation task with tests
- Supabase RPC function → contract test task [P]
- Data validation functions → unit test tasks
- Integration workflow → end-to-end test task
- Error handling → error scenario test tasks

**Zurich-Specific Task Categories**:
1. **Database Tasks**: SQL query optimization, connection setup
2. **Normalization Tasks**: Version cleaning logic, hash generation, technical spec extraction
3. **Integration Tasks**: n8n workflow assembly, Supabase RPC integration
4. **Validation Tasks**: Data quality checks, error handling scenarios
5. **Testing Tasks**: Unit tests for normalization, integration tests for workflow
6. **Documentation Tasks**: n8n workflow documentation, troubleshooting guide

**Ordering Strategy**:
- TDD order: Data validation tests → normalization tests → integration tests → implementation
- Dependency order: Database setup → normalization logic → workflow integration → monitoring
- Mark [P] for parallel execution: normalization functions, test creation, documentation
- Critical path: SQL extraction → Code node development → Supabase integration

**Task Complexity Distribution**:
- Simple tasks (1-2 hours): Validation functions, basic tests, documentation updates
- Medium tasks (4-8 hours): Normalization code node, error handling implementation
- Complex tasks (1-2 days): Full workflow integration, performance optimization

**Estimated Output**: 28-35 numbered, ordered tasks in tasks.md covering:
- 5 database/extraction tasks
- 8 normalization and hash generation tasks
- 6 integration and workflow tasks
- 7 testing and validation tasks
- 4 documentation and monitoring tasks
- 3 deployment and optimization tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*