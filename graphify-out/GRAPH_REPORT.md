# Graph Report - src.android.ineter.vue.internal  (2026-10-07)

## Corpus Check
- 97 files · ~83,381 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .xml 13, (none) 3, .properties 2)

## Summary
- 713 nodes · 1348 edges · 83 communities (17 shown, 66 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 16
- Community 17
- Community 18
- Community 20
- Community 21
- Community 22
- Community 23
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 36
- Community 38
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81

## God Nodes (most connected - your core abstractions)
1. `DatabaseHelper` - 68 edges
2. `MainActivity` - 49 edges
3. `AndroidBridge` - 36 edges
4. `GeometryUtil` - 31 edges
5. `CustomCameraActivity` - 27 edges
6. `SpatialHelper` - 21 edges
7. `ImportManager` - 18 edges
8. `FormActivity` - 15 edges
9. `FormImageHelper` - 14 edges
10. `Columna GRUPO_ID` - 14 edges

## Surprising Connections (you probably didn't know these)
- `WorkflowService (orquestación de reglas)` --conceptually_related_to--> `WorkflowService`  [INFERRED]
  docs/REGLAS_NEGOCIO.md → docs/CHANGELOG.md
- `Reglas de Exclusividad de Estado (No Encuestado/Unión)` --conceptually_related_to--> `Columna GRUPO_ID`  [INFERRED]
  docs/REGLAS_NEGOCIO.md → docs/DATABASE_MAP_DB.md
- `MainActivity` --calls--> `MainDialogHelper`  [INFERRED]
  app/src/main/java/com/cadicsa/inventario/MainActivity.kt → app/src/main/java/com/cadicsa/inventario/utils/MainDialogHelper.kt
- `MainActivity` --calls--> `PermissionHelper`  [INFERRED]
  app/src/main/java/com/cadicsa/inventario/MainActivity.kt → app/src/main/java/com/cadicsa/inventario/utils/PermissionHelper.kt
- `Foto del Frente: tracking independiente` --conceptually_related_to--> `fotoFrenteOriginal (snapshot)`  [INFERRED]
  docs/REGLAS_NEGOCIO.md → docs/CHANGELOG.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Regla de Exclusividad Master/Unión con Predio** — docs_changelog_master_esclavo_union, docs_reglas_negocio_exclusividad_estado, docs_reglas_negocio_master_candidatos, docs_changelog_getmastercandidates [INFERRED 0.85]
- **Ciclo de Vida Transaccional de Fotos (Commit/Rollback)** — docs_changelog_photoservice, docs_changelog_fotofrenteoriginal, docs_reglas_negocio_gestion_transaccional_fotos, docs_reglas_negocio_fotofrente_tracking [INFERRED 0.85]
- **Mecanismo de Subgrupos Catastrales (GRUPO_ID)** — docs_changelog_grupo_id, docs_database_map_db_grupo_id_column, docs_reglas_negocio_posicionamiento_grupo, docs_changelog_resolvegrupofornewpoint, docs_database_map_db_resolvegrupofornewpoint [INFERRED 0.90]

## Communities (83 total, 66 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (3): MainActivity, CancelableCallback, LocationCallback

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (3): GeometryUtil, CachedRoute, SpatialHelper

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (5): ManageUsersActivity, DeviceUser, SecurityManager, UserAdapter, UserViewHolder

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (3): ProjectionHelper, CoordinateSequenceFilter, RoutingHelper

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (7): AppConfig, CleanResult, DataCleaner, ExportManager, ExportResult, ExportTransactionException, ManzanaExportInfo

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (5): get_relative_files(), run(), main(), query_device(), run_query()

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (5): Geometry, ImportManager, ImportPredioEntry, ImportResult, ImportTransactionException

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (3): FormActivity, OnBackPressedCallback, FormWebViewHelper

### Community 18 - "Community 18"
Cohesion: 0.24
Nodes (8): DatabaseHelper.getDailyStatisticsMap, Android.getData(), DatabaseHelper.getGruposForObject, DatabaseHelper.getStatisticsByUserAndDateMap, ImportManager.kt / ExportManager.kt (GRUPO_ID), MapHelper.kt agrupamiento jerárquico de marcadores, DatabaseHelper.resolveGrupoForNewPoint, Regla: Entrevistado único por grupo

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): DatabaseHelper.getDataInBounds, MapHelper.updateSingleObjectMarker, Tabla config, Tabla DATOS, Map.db (base de datos SQLite), Tabla objects, Tabla tiles

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (5): Android.getGruposHermanos(), resolveGrupoForNewPoint, SpatialHelper.getGeometryByLocalizacion, SpatialHelper.getLoteClosestToPoint, SpatialHelper.getSiblingGroupsInSamePredio / AndroidBridge.getGruposHermanos

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (5): Borrado en Cascada de Familiares, Reglas de Exclusividad de Estado (No Encuestado/Unión), Regla: Familiares dependen de Propietario Natural, Regla: Ficha única por grupo, WorkflowService (orquestación de reglas)

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (3): PhotoService, WorkflowService, Foto del Frente: tracking independiente

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (4): fotoFrenteOriginal (snapshot), handleAndroidPhoto (rama tomandoFotoFrente), PhotoService.commit, PhotoService.usarComoFotoFrente

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (4): Polo de Inaccesibilidad (PIA), Motor Espacial en Memoria (JTS), Posicionamiento y Consolidación por Grupo (4.1), Formato WKB para geometrías

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): DOCUMENTOS_SIN_FECHA_OBLIGATORIA, FormFicha, styleFicha

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (4): WorkflowService.getMasterCandidates, Unión con Predio Master (Englobamiento), WorkflowService.validateDeletion, Candidatos Master (TotalGrupos === 1)

## Knowledge Gaps
- **44 isolated node(s):** `app`, `CatalogoSelector`, `CatalogoSelectorGrande`, `CatalogoSelectorGrande`, `CatalogoSelectorTwoLevels` (+39 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 197 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DatabaseHelper` connect `Community 9` to `Community 0`, `Community 1`, `Community 4`, `Community 6`, `Community 7`, `Community 11`, `Community 14`, `Community 19`, `Community 22`, `Community 24`, `Community 29`, `Community 30`, `Community 35`, `Community 39`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `MainActivity` (e.g. with `MainDialogHelper` and `PermissionHelper`) actually correct?**
  _`MainActivity` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `app`, `CatalogoSelector`, `CatalogoSelectorGrande` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06229508196721312 - nodes in this community are weakly interconnected._
- **Why does `MainActivity` connect `Community 0` to `Community 4`, `Community 7`, `Community 40`, `Community 11`, `Community 12`, `Community 14`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08953418027828192 - nodes in this community are weakly interconnected._
- **Why does `GeometryUtil` connect `Community 1` to `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._