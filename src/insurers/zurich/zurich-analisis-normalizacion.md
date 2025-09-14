# Análisis del Campo version_original de Zurich

## Enfoque de Limpieza Actualizado

**OBJETIVO**: Mantener especificaciones técnicas importantes mientras eliminamos características de confort/audio irrelevantes para la homologación vehicular.

## Resumen del Análisis

Basado en el análisis del archivo `sample-zurich.csv`, se identificaron patrones sistemáticos en el campo `version_original` que requieren limpieza selectiva para el proceso de homologación vehicular.

## Estrategia de Limpieza

### ✅ **MANTENER (Especificaciones Técnicas Importantes)**

#### Características de Seguridad/Rendimiento:
- **BA**: Bolsas de Aire (diferenciador técnico importante)
- **ABS**: Sistema de frenos antibloqueo (especificación de seguridad)

#### Especificaciones del Motor/Rendimiento:
- **HP**: Caballos de fuerza (150HP, 190HP, 200HP, etc.)
- **Desplazamiento**: 1.5L, 2L, 3.5L, etc.
- **Cilindros**: 4CIL, 6CIL, etc.
- **TUR**: Turbo
- **TFSI**: Turbocharged Fuel Stratified Injection
- **FSI**: Fuel Stratified Injection
- **JTS**: Jet Thrust Stoichiometric
- **PHEV**: Plug-in Hybrid Electric Vehicle
- **HIBRIDO**: Hybrid

#### Especificaciones de Tracción:
- **AWD**: All Wheel Drive
- **4WD**: 4 Wheel Drive  
- **4X4**: Tracción 4x4
- **SH**: Super Handling AWD
- **EAWD**: Electronic All Wheel Drive
- **QUATTRO**: Sistema AWD de Audi

#### Especificaciones de Ruedas:
- **R16, R17, R18**: Tamaños de rin (diferenciadores técnicos)

### ❌ **ELIMINAR (Características de Confort/Audio Irrelevantes)**

## Estructura del Campo version_original

El campo `version_original` de Zurich contiene información estructurada pero inconsistente que incluye:

1. **Nombre del trim/versión** (PREMIUM, TECH, ADVANCE, A-SPEC, etc.)
2. **Tipo de carrocería** (SEDAN, SUV, COUPE, HB)
3. **Especificaciones técnicas irrelevantes** (AA, EE, CD, BA, QC, VP, etc.)
4. **Información del motor** (190HP, 1.5L, 4CIL, etc.)
5. **Especificaciones de transmisión** (AUT, STD, CVT, etc.)
6. **Información de ocupación** (5P 5OCUP, 4P 5OCUP, etc.)

### Ejemplo de Análisis:
```
Entrada: "ADX A-SPEC SUV AUT AA EE CD BA QC VP 190HP ABS 1.5L 4CIL 5P 5OCUP"
Salida limpia: "ADX A-SPEC SUV"
Transmisión extraída: "AUT" → "AUTO"
```

## Diccionario de Términos a Eliminar

### ❌ Características de Confort/Audio (Irrelevantes)

### Características de Audio/Entretenimiento
- **AA**: Aire Acondicionado
- **EE**: Elevavidrios Eléctricos  
- **CD**: Reproductor de CD
- **DVD**: Reproductor de DVD
- **GPS**: Navegación GPS
- **BT**: Bluetooth
- **USB**: Puerto USB
- **MP3**: Reproductor MP3
- **AM**: Radio AM
- **RA**: Radio
- **BOSE**: Sistema de sonido Bose

### ❌ Ediciones Especiales/Marketing
- **VERSION DE LANZAMIENTO**, **VER.LANZ.**
- **MILLION EDITION**, **RED EDITION**, **BLACK EGO EDITION**
- **UNION SQUARE**, **EDIZIONE**
- **DISTINTIVE**, **DEPORTIVO**, **COMPETIZIONE**
- **SPECIALE**, **ESTREMA**, **QUADRIFOGLIO VERDE**

### ❌ Información de Ocupación (No Técnica)
- **Patrones**: 3P 5OCUP, 4P 5OCUP, 5P 7OCUP, etc.
- **P**: Número de puertas
- **OCUP**: Número de ocupantes

## Normalización de Transmisión

### Mapeo de Códigos:
```javascript
{
  'STD': 'MANUAL',        // Estándar
  'AUT': 'AUTO',          // Automático
  'CVT': 'AUTO',          // Transmisión Variable Continua
  'DSG': 'AUTO',          // Direct Shift Gearbox
  'S TRONIC': 'AUTO',     // S Tronic de Audi
  'TIPTRONIC': 'AUTO',    // Tiptronic
  'SELESPEED': 'AUTO',    // Selespeed de Alfa Romeo
  'Q-TRONIC': 'AUTO',     // Q-Tronic
  'DCT': 'AUTO',          // Dual Clutch Transmission
}
```

## Términos Significativos a Preservar

### Niveles de Trim Importantes:
- **Acura**: PREMIUM, TECH, ADVANCE, A-SPEC, TYPE S
- **Alfa Romeo**: TI, VELOCE, SPORT, SPRINT, QV, QUADRIFOGLIO VERDE
- **Audi**: COOL, EGO, ENVY, S LINE, URBAN, AMBITION, ATTRACTION, AMBIENTE

### Tipos de Carrocería:
- SEDAN, SUV, COUPE, HB (Hatchback), CONV (Convertible), SW (Station Wagon)

## Proceso de Limpieza Actualizado

1. **Extracción de transmisión**: Identificar y extraer códigos de transmisión antes de limpiar
2. **Eliminación selectiva**: Remover SOLO características de confort/audio irrelevantes
3. **Preservación técnica**: Mantener especificaciones técnicas importantes (HP, L, CIL, TUR, AWD, ABS, BA, etc.)
4. **Limpieza de ocupación**: Remover patrones de puertas/ocupantes (no son técnicos)
5. **Normalización de espacios**: Eliminar espacios múltiples y trim
6. **Preservación de términos significativos**: Mantener trims y tipos de carrocería importantes

## Uso en n8n

### Función de Limpieza Actualizada:
```javascript
// En el nodo de código de n8n para Zurich - PRESERVA especificaciones técnicas
const versionLimpia = cleanVersionString(item.version_original); // Solo remueve confort/audio
const transmisionNormalizada = normalizeTransmission(item.transmision || extractTransmissionFromVersion(item.version_original));
const hashComercial = await generateCommercialHash({
  marca: item.marca,
  modelo: item.modelo,
  anio: item.anio,
  transmision: transmisionNormalizada
});
```

## Ejemplos de Transformación Actualizada

| Entrada Original | Versión Limpia (Preserva Técnicas) | Transmisión |
|------------------|-------------------------------------|-------------|
| `"PREMIUM SEDAN AUT AA EE CD BA QC VP 150HP ABS 2L 4CIL 4P 5OCUP"` | `"PREMIUM SEDAN BA 150HP ABS 2L 4CIL"` | `"AUTO"` |
| `"A-SPEC SUV CVT AA EE CD BA QC VP 200HP ABS 1.5L 4CIL 4P 5OCUP"` | `"A-SPEC SUV BA 200HP ABS 1.5L 4CIL"` | `"AUTO"` |
| `"TUR AWD R18 SUV AUT AA EE CD BA QC VP 240HP ABS 2.3L 4CIL 5P 5OCUP"` | `"TUR AWD R18 SUV BA 240HP ABS 2.3L 4CIL"` | `"AUTO"` |
| `"QUADRIFOGLIO VERDE SEDAN STD AA EE CD BA VP 505HP ABS 2.9L 6CIL 4P 5OCUP"` | `"SEDAN BA 505HP ABS 2.9L 6CIL"` | `"MANUAL"` |

**Nota**: Las especificaciones técnicas importantes (HP, L, CIL, TUR, AWD, ABS, BA) se mantienen para diferenciación técnica precisa.

## Implementación

El diccionario completo está disponible en:
`/src/utils/diccionario-normalizacion-zurich.js`

Este archivo incluye:
- Dictionary separado de términos irrelevantes (confort/audio) vs. técnicos
- Funciones de limpieza selectiva que preservan especificaciones técnicas
- Mapeo de transmisiones
- Generación de hash comercial
- Patrones regex para limpieza de ocupación solamente

## Ventajas del Nuevo Enfoque

1. **Precisión Técnica**: Mantiene diferenciadores técnicos importantes como HP, desplazamiento, turbo, AWD
2. **Homologación Más Precisa**: Las variantes técnicas se pueden distinguir correctamente
3. **Eliminación Selectiva**: Solo remueve características irrelevantes de confort/audio
4. **Compatibilidad**: Funciona con el sistema de fuzzy matching existente en Supabase