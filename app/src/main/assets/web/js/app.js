/**
 * Inventario ACERAS - Vue 3 App
 * Aplicación principal con Composition API
 */

// Definir la proyección UTM Zona 16 Norte (EPSG:32616)
if (typeof proj4 !== 'undefined' && proj4.defs) {
    if (!proj4.defs['EPSG:32616']) {
        proj4.defs("EPSG:32616", "+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs");
        console.log('✅ Proyección UTM 16N definida');
    }
} else {
    console.error('❌ proj4 no disponible o no tiene método defs');
}

const { createApp, ref, reactive, computed, onMounted } = Vue;

const app = createApp({
    setup() {
        // Estado
        const operation = ref('List');
        const formType = ref('');
        const currentId = ref(-1);
        const currentIndex = ref(0);
        const savedScrollPos = ref(0);

        // Datos de ubicación
        const latLng = reactive({
            lat: 0,
            lng: 0
        });

        const localProj = reactive({
            x: 0,
            y: 0
        });

        const localizacion = ref('');
        const encuestador = ref('');
        const fechaActual = ref('');
        const idObject = ref(0);
        const areaCalculada = ref(0);
        const municipioInterceptado = ref('');
        const sectorInterceptado = ref('');

        // Lista de datos guardados
        const listData = ref([]);


        // Datos del formulario actual
        const formData = ref({});

        // Fotos - Estado visible en UI
        const fotos = ref([]);

        // Tracking transaccional de fotos
        const fotosOriginales = ref([]);      // Fotos que venían de la BD (snapshot)
        const fotosNuevas = ref([]);          // Fotos tomadas en esta sesión (ya en disco)
        const fotosMarcadasBorrar = ref([]);  // Fotos originales "eliminadas" (aún en disco)

        // Rutas adyacentes al predio
        const rutasAdyacentes = ref([]);

        // Referencia para copia de datos
        const pendingCopyData = ref(null);

        // Inicialización
        const init = () => {
            console.log('Inicializando Vue app...');

            // Obtener datos desde Android
            if (typeof Android !== 'undefined') {
                try {
                    // 1. CAPTURA DE DATOS BÁSICOS (Síncrona)
                    latLng.lat = Math.round(Android.getLat() * 1000000) / 1000000;
                    latLng.lng = Math.round(Android.getLng() * 1000000) / 1000000;
                    localizacion.value = Android.getLocalizacion ? Android.getLocalizacion() : '';
                    encuestador.value = Android.getEncuestador ? Android.getEncuestador() : '';
                    fechaActual.value = Android.getFecha ? Android.getFecha() : '';
                    idObject.value = Android.getIdObject ? Android.getIdObject() : 0;
                    areaCalculada.value = Android.getAreaCalculada ? Android.getAreaCalculada() : 0;
                    municipioInterceptado.value = Android.getMunicipioInterceptado ? Android.getMunicipioInterceptado() : '';
                    sectorInterceptado.value = Android.getSectorInterceptado ? Android.getSectorInterceptado() : '';

                    console.log('📍 Datos capturados de Android:', {
                        lat: latLng.lat,
                        lng: latLng.lng,
                        loc: localizacion.value,
                        muni: municipioInterceptado.value,
                        sec: sectorInterceptado.value
                    });

                    // 2. REPROYECCIÓN A UTM 16N (Para visualización y formularios legacy)
                    if (typeof proj4 !== 'undefined') {
                        // WGS84 a UTM 16N (EPSG:32616)
                        const projected = proj4("EPSG:4326", "EPSG:32616", [latLng.lng, latLng.lat]);
                        localProj.x = Math.round(projected[0] * 100) / 100;
                        localProj.y = Math.round(projected[1] * 100) / 100;
                    }

                    // 3. CARGA DE DATOS EXISTENTES
                    const jsonData = Android.getData();
                    listData.value = JSON.parse(jsonData);

                } catch (error) {
                    console.error('❌ Error inicializando datos Android:', error);
                }
            } else {
                // Modo desarrollo (navegador)
                latLng.lat = 9.9458;
                latLng.lng = -84.0628;
                localProj.x = 500000;
                localProj.y = 1300000;
                localizacion.value = 'Desarrollo - Localización de Prueba';
                encuestador.value = 'Developer';
                fechaActual.value = new Date().toLocaleDateString('es-CR');
                idObject.value = Date.now();
                municipioInterceptado.value = '6065';
                sectorInterceptado.value = '001';
            }
        };

        // Reset formulario (nuevo registro)
        const resetForm = (type) => {
            formType.value = type;
            currentId.value = -1;

            // Limpiar listas de fotos
            fotos.value = [];
            fotosOriginales.value = [];
            fotosNuevas.value = [];
            fotosMarcadasBorrar.value = [];

            if (pendingCopyData.value) {
                // Usar datos de copia si existen
                formData.value = { ...pendingCopyData.value };
                pendingCopyData.value = null; // Consumir los datos
            } else {
                // Contexto compartido para la creación de modelos
                const ctx = {
                    lat: latLng.lat,
                    lng: latLng.lng,
                    x: localProj.x,
                    y: localProj.y,
                    loc: localizacion.value,
                    fecha: fechaActual.value,
                    enc: encuestador.value,
                    idObject: idObject.value
                };

                if (type === 'Acera') {
                    formData.value = ModelsFactory.createAcera(ctx.lat, ctx.lng, ctx.x, ctx.y);
                } else if (type === 'Costo') {
                    formData.value = ModelsFactory.createCosto(ctx.lat, ctx.lng, ctx.x, ctx.y);
                } else if (type === 'EncuestaCatastral') {
                    formData.value = ModelsFactory.createEncuestaCatastral(ctx);

                    // Inicialización específica de Encuesta (Valores interceptados)
                    formData.value._isFromMap = true;
                    formData.value.AreaEstimada = areaCalculada.value;
                    formData.value.UnidadMedidaAreaEstimadaCatalog = 3; // Metros Cuadrados

                    if (municipioInterceptado.value) {
                        const muniId = parseInt(municipioInterceptado.value);
                        if (!isNaN(muniId)) formData.value.MunicipioCatalog = muniId;
                    }
                    if (sectorInterceptado.value) {
                        formData.value.IdSector = sectorInterceptado.value;
                    }
                } else if (type === 'PropietarioNatural') {
                    formData.value = ModelsFactory.createPropietarioNatural(ctx);
                } else if (type === 'PropietarioJuridica') {
                    formData.value = ModelsFactory.createPropietarioJuridica(ctx);
                } else if (type === 'Entrevistado') {
                    formData.value = ModelsFactory.createEntrevistado(ctx);
                } else if (type === 'Familiares') {
                    formData.value = ModelsFactory.createFamiliares(ctx);
                }
            }

            operation.value = 'Edit';
        };

        // Editar item desde la lista (busca el índice real)
        const editItem = (item) => {
            const index = listData.value.findIndex(i => i.Id === item.Id);
            if (index !== -1) {
                updateData(index);
            }
        };

        // Cargar datos existentes para edición
        const updateData = (index) => {
            currentIndex.value = index;
            const item = listData.value[index];

            currentId.value = item.Id;
            formType.value = item.Data.Type;
            formData.value = { ...item.Data };

            // Limpiar listas de tracking
            fotosNuevas.value = [];
            fotosMarcadasBorrar.value = [];

            // Cargar fotos usando el servicio central
            if (item.Data.Imagenes) {
                const fotosData = PhotoService.loadPhotosFromDisk(item.Data.Imagenes);
                fotos.value = fotosData;
                // Guardar snapshot de fotos originales (copia profunda)
                fotosOriginales.value = fotosData.map(f => ({ ...f }));
                console.log(`📸 Cargadas ${fotos.value.length} fotos con PhotoService`);
            } else {
                fotos.value = [];
                fotosOriginales.value = [];
            }

            operation.value = 'Edit';
        };

        // Volver a lista (CANCELAR - revertir cambios de fotos)
        const volver = () => {
            // 1. Eliminar físicamente las fotos NUEVAS (no guardadas)
            if (fotosNuevas.value.length > 0) {
                console.log(`🗑️ Eliminando ${fotosNuevas.value.length} fotos nuevas no guardadas...`);
                for (const foto of fotosNuevas.value) {
                    if (typeof Android !== 'undefined' && typeof Android.deletePhotoFile === 'function') {
                        Android.deletePhotoFile(foto.name);
                    }
                }
            }

            // 2. Las fotos marcadas para borrar SE RESTAURAN (ya están en disco, no hacer nada)
            if (fotosMarcadasBorrar.value.length > 0) {
                console.log(`↩️ Restaurando ${fotosMarcadasBorrar.value.length} fotos marcadas para borrar`);
            }

            // 3. Limpiar estado
            operation.value = 'List';
            formData.value = {};
            fotos.value = [];
            fotosOriginales.value = [];
            fotosNuevas.value = [];
            fotosMarcadasBorrar.value = [];
        };

        // Guardar datos (CONFIRMAR - sincronizar fotos)
        const sendData = (data) => {
            // 1. Limpieza física de fotos marcadas
            PhotoService.deletePhotosFromDisk(fotosMarcadasBorrar.value);

            // 2. Preparar contexto para el servicio de guardado
            const context = {
                fechaActual: fechaActual.value,
                encuestador: encuestador.value,
                idObject: idObject.value,
                localizacion: localizacion.value,
                latLng: latLng,
                localProj: localProj
            };

            // 3. Ejecutar guardado mediante SyncService
            const savedId = SyncService.saveData(data, currentId.value, context);

            if (savedId !== null) {
                currentId.value = savedId;

                // 4. Reset de tracking de fotos tras éxito
                fotosOriginales.value = [];
                fotosNuevas.value = [];
                fotosMarcadasBorrar.value = [];

                // Volver a lista y recargar
                volver();
                init();
            }
        };

        // Eliminar registro con modal visual
        const deleteItem = (id) => {
            const itemToDelete = listData.value.find(item => item.Id === id);
            if (!itemToDelete) return;

            const type = itemToDelete.Data?.Type;
            const hasEncuesta = listData.value.some(item => item.Data?.Type === 'EncuestaCatastral');

            // 1. Validar reglas de negocio
            if (hasEncuesta && type === 'Entrevistado') {
                showConfirmModal({
                    icon: '⚠️', title: 'Acción impedida',
                    message: 'No puede eliminar al Entrevistado porque existe una Encuesta Catastral vinculada.',
                    confirmText: 'Entendido', cancelText: ''
                });
                return;
            }

            // 2. Confirmación de borrado
            showConfirmModal({
                icon: '🗑️', title: '¿Eliminar registro?',
                message: 'Esta acción eliminará el registro y todas sus fotos asociadas.',
                confirmText: 'Sí, eliminar', cancelText: 'Cancelar',
                onConfirm: () => {
                    // Sincronizar con backend
                    SyncService.deleteData(id);

                    // Buscar el índice REAL para actualizar UI
                    const realIndex = listData.value.findIndex(item => item.Id === id);
                    if (realIndex !== -1) {
                        listData.value.splice(realIndex, 1);

                        // Lógica de borrado en cascada (Familiares depende de Propietario Natural)
                        if (type === 'PropietarioNatural') {
                            const stillHasNatural = listData.value.some(x => x.Data?.Type === 'PropietarioNatural');
                            if (!stillHasNatural) {
                                const famIdx = listData.value.findIndex(x => x.Data?.Type === 'Familiares');
                                if (famIdx !== -1) {
                                    SyncService.deleteData(listData.value[famIdx].Id);
                                    listData.value.splice(famIdx, 1);
                                    console.log('🗑️ Eliminada Composición Familiar por falta de Propietario Natural');
                                }
                            }
                        }
                    }
                }
            });
        };

        // Propiedad computada para verificar si hay un entrevistado
        const hasEntrevistado = Vue.computed(() => {
            return listData.value.some(item => item.Data?.Type === 'Entrevistado');
        });

        // Función para crear automáticamente un entrevistado clonando datos de un propietario natural
        const crearEntrevistadoDesdePropietario = (propietarioId) => {
            const propietarioObj = listData.value.find(item => item.Id === propietarioId);
            if (!propietarioObj || !propietarioObj.Data) return;

            showConfirmModal({
                icon: '🎤',
                title: 'Crear Entrevistado',
                message: '¿Desea crear un Entrevistado automáticamente con los datos de este Propietario Natural?',
                confirmText: 'Sí, crear',
                onConfirm: () => {
                    const nuevo = ModelsFactory.createEntrevistado();

                    // 1. Clonar datos personales y de residencia
                    ClonadorService.clonarDatos(propietarioObj.Data, nuevo, ClonadorService.CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO);

                    // 2. Ajustes específicos de Entrevistado
                    nuevo.RelacionConParcelaCatalog = 1; // Propietario

                    // 3. Ejecutar guardado silencioso (-1 para nuevo)
                    const context = { fechaActual: fechaActual.value, encuestador: encuestador.value, idObject: idObject.value, localizacion: localizacion.value, latLng, localProj };
                    SyncService.saveData(nuevo, -1, context);

                    init(); // Recargar lista
                }
            });
        };

        // Función para crear automáticamente un propietario natural clonando datos de un entrevistado
        const crearPropietarioDesdeEntrevistado = (entrevistadoId) => {
            const entrevistadoObj = listData.value.find(item => item.Id === entrevistadoId);
            if (!entrevistadoObj || !entrevistadoObj.Data) return;

            showConfirmModal({
                icon: '👤',
                title: 'Crear Propietario Natural',
                message: '¿Desea crear un Propietario Natural automáticamente con los datos de este Entrevistado?',
                confirmText: 'Sí, crear',
                onConfirm: () => {
                    const nuevo = ModelsFactory.createPropietarioNatural();

                    // 1. Clonar datos personales y de residencia
                    ClonadorService.clonarDatos(entrevistadoObj.Data, nuevo, ClonadorService.CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO);

                    // 2. Ejecutar guardado silencioso (-1 para nuevo)
                    const context = { fechaActual: fechaActual.value, encuestador: encuestador.value, idObject: idObject.value, localizacion: localizacion.value, latLng, localProj };
                    SyncService.saveData(nuevo, -1, context);

                    init(); // Recargar lista
                }
            });
        };

        // ── Selector de Municipio (dos niveles: Dpto → Municipio) ──────────
        const municipioParams = Vue.ref(null);

        const openMunicipio = (params) => {
            savedScrollPos.value = window.scrollY;
            municipioParams.value = params || {};
            operation.value = 'SelectMunicipio';
        };

        const onMunicipioSelect = (resultado) => {
            if (municipioParams.value && typeof municipioParams.value.onSelect === 'function') {
                municipioParams.value.onSelect(resultado);
            }
            municipioParams.value = null;
            operation.value = 'Edit';
        };

        const cancelMunicipio = () => {
            municipioParams.value = null;
            operation.value = 'Edit';
        };

        // Abrir cámara
        const openCamera = () => {
            if (typeof Android !== 'undefined') {
                Android.Camera();
            } else {
                console.log('Cámara no disponible en modo desarrollo');
            }
        };

        // Restaurar scroll al volver de selectores
        Vue.watch(operation, (newOp, oldOp) => {
            const viewsWithScroll = ['Edit', 'Create'];
            const selectors = ['SelectCatalog', 'SelectMunicipio'];

            if (viewsWithScroll.includes(newOp) && selectors.includes(oldOp)) {
                Vue.nextTick(() => {
                    setTimeout(() => {
                        window.scrollTo({
                            top: savedScrollPos.value,
                            behavior: 'auto'
                        });
                    }, 50); // Un pequeño delay para asegurar renderizado de componentes pesados
                });
            }
        });

        // Inicializar al montar
        onMounted(() => {
            init();

            // Guardar referencia global para addPhoto/deletePhoto/loadExistingData
            vueAppContext = {
                fotos,
                fotosOriginales,
                fotosNuevas,
                fotosMarcadasBorrar,
                formData,
                listData,
                updateData,
                openCatalog,    // <- Selector catálogo grande (Profesión, etc.)
                openMunicipio   // <- Selector municipio dos niveles
            };
            console.log('✅ Vue app context guardado globalmente (con tracking de fotos)');
        });

        // Iniciar copia de registro
        const startCopy = (item) => {
            showConfirmModal({
                icon: '📋',
                title: '¿Crear copia?',
                message: 'Se creará una copia de este registro con la ubicación actual, sin fotos.',
                confirmText: 'Copiar',
                cancelText: 'Cancelar',
                onConfirm: () => {
                    // Clonar datos
                    const clonedData = JSON.parse(JSON.stringify(item.Data));
                    // Limpiar campos únicos y fotos
                    clonedData.Imagenes = '';
                    clonedData.Fecha = null;
                    clonedData.Encuestador = null;
                    clonedData.NumBoleta = 'GEN-' + Date.now();

                    pendingCopyData.value = clonedData;
                    startCreate(item.Data.Type);
                }
            });
        };

        // Iniciar creación de registro (Validando exclusividad de propietarios)
        const startCreate = (type) => {
            console.log('🏁 Iniciando creación:', type);

            // 1. Validaciones de Exclusividad de Propietarios (REMOVIDO: Ahora se permite mezcla y multiplicidad)
            const hasNatural = listData.value.some(item => item.Data?.Type === 'PropietarioNatural');
            const hasJuridico = listData.value.some(item => item.Data?.Type === 'PropietarioJuridica');

            // 2. Validación de Entrevistado Único
            const hasEntrevistado = listData.value.some(item => item.Data?.Type === 'Entrevistado');
            if (type === 'Entrevistado' && hasEntrevistado) {
                showConfirmModal({
                    icon: '🚫',
                    title: 'Límite alcanzado',
                    message: 'Solo se puede registrar un (1) Entrevistado por predio.',
                    confirmText: 'Entendido',
                    cancelText: '',
                    onConfirm: () => { }
                });
                return;
            }

            // 2.5 Validación de Familiares Único y Dependencia
            if (type === 'Familiares') {
                if (!hasNatural) {
                    showConfirmModal({
                        icon: '⚠️',
                        title: 'Acción requerida',
                        message: 'Solo se pueden agregar integrantes familiares si existe al menos un Propietario Natural registrado.',
                        confirmText: 'Entendido',
                        cancelText: '',
                        onConfirm: () => { }
                    });
                    return;
                }

                const existing = listData.value.find(item => item.Data?.Type === 'Familiares');
                if (existing) {
                    editItem(existing);
                    return;
                }
            }

            // 3. Validación de Encuesta Catastral
            if (type === 'EncuestaCatastral') {
                const hasEncuesta = listData.value.some(item => item.Data?.Type === 'EncuestaCatastral');
                if (hasEncuesta) {
                    showConfirmModal({
                        icon: '🚫',
                        title: 'Límite alcanzado',
                        message: 'Solo se puede registrar una (1) Encuesta Catastral por predio.',
                        confirmText: 'Entendido',
                        cancelText: '',
                        onConfirm: () => { }
                    });
                    return;
                }

                if (!hasEntrevistado) {
                    showConfirmModal({
                        icon: '⚠️',
                        title: 'Faltan datos',
                        message: 'Debe registrar primero un Entrevistado antes de realizar la encuesta.',
                        confirmText: 'Entendido',
                        cancelText: '',
                        onConfirm: () => { }
                    });
                    return;
                }
            }

            // 4. Lógica de Copia (si aplica)
            if (!pendingCopyData.value) {
                pendingCopyData.value = null;
            }

            // 5. Proceder con el reset y cambio de vista
            resetForm(type);
            operation.value = 'Create';
        };

        // Ordenar y formatear lista para la tabla
        const sortedListData = Vue.computed(() => {
            const orderWeights = {
                'EncuestaCatastral': 1,
                'PropietarioNatural': 2,
                'PropietarioJuridica': 2,
                'Entrevistado': 3,
                'Familiares': 4
            };

            return [...listData.value].sort((a, b) => {
                const weightA = orderWeights[a.Data?.Type] || 99;
                const weightB = orderWeights[b.Data?.Type] || 99;
                return weightA - weightB;
            });
        });

        const getDisplayName = (type) => DisplayService.getShortName(type);

        const getDisplayInfo = (item) => DisplayService.getDisplayInfo(item, localizacion.value);

        // --- GESTIÓN DE CATÁLOGOS GLOBALES A PANTALLA COMPLETA ---
        const catalogParams = ref(null); // Contendrá las opciones (name, targetVar...)

        const openCatalog = (options) => {
            // Guardamos qué catálogo se pidió y a qué variable local de retorno va dirigida
            savedScrollPos.value = window.scrollY;
            catalogParams.value = options;
            operation.value = 'SelectCatalog';
        };

        const onCatalogSelect = (result) => {
            if (result && catalogParams.value?.onSelect) {
                catalogParams.value.onSelect(result);
            }
            catalogParams.value = null; // Limpiar después de usar
            operation.value = 'Edit'; // Volver al formulario
        };

        const cancelCatalog = () => {
            catalogParams.value = null;
            operation.value = 'Edit';
        };

        return {
            operation,
            formType,
            currentId,
            latLng,
            localProj,
            localizacion,
            rutasAdyacentes,
            listData,
            sortedListData,
            getDisplayName,
            getDisplayInfo,
            formData,
            fotos,
            encuestador,

            // Catálogo Global (un nivel - ej. Profesión)
            catalogParams,
            openCatalog,
            onCatalogSelect,
            cancelCatalog,

            // Selector Municipio (dos niveles: Depto → Municipio)
            municipioParams,
            onMunicipioSelect,
            cancelMunicipio,

            // Acciones

            volver,
            sendData,
            deleteItem,
            updateData,
            editItem,
            openCamera,
            resetForm,
            startCreate,
            startCopy,
            hasEntrevistado,
            crearEntrevistadoDesdePropietario,
            crearPropietarioDesdeEntrevistado
        };
    }
});

// Hacer app accesible globalmente para los componentes
window.app = app;

// NOTA: La app se monta desde index.html después de cargar todos los componentes
// NO montar aquí para evitar que se monte antes de registrar los componentes

// Variable global para guardar referencia al contexto de Vue
let vueAppContext = null;

// Función global para agregar foto desde Android
window.addPhoto = function (filename, base64Data) {
    console.log('📷 Foto capturada:', filename);
    if (!vueAppContext) return;

    try {
        const fotoObj = {
            name: filename,
            data: base64Data ? `data:image/jpeg;base64,${base64Data}` : null
        };

        // Actualizar estado Vue
        vueAppContext.fotos.value.push(fotoObj);
        vueAppContext.fotosNuevas.value.push({ ...fotoObj });

        // Sincronizar campo Imagenes en el modelo
        vueAppContext.formData.value.Imagenes = vueAppContext.fotos.value.map(f => f.name).join(',');
    } catch (error) {
        console.error('❌ Error agregando foto:', error);
    }
};

// Función global para eliminar foto (lógica transaccional)
window.deletePhoto = function (filename) {
    if (!vueAppContext) return;

    try {
        const esNueva = vueAppContext.fotosNuevas.value.some(f => f.name === filename);
        const esOriginal = vueAppContext.fotosOriginales.value.some(f => f.name === filename);

        if (esNueva) {
            // Borrado físico inmediato para fotos nuevas
            PhotoService.deletePhotosFromDisk([{ name: filename }]);
            const idx = vueAppContext.fotosNuevas.value.findIndex(f => f.name === filename);
            if (idx > -1) vueAppContext.fotosNuevas.value.splice(idx, 1);
        } else if (esOriginal) {
            // Marcado de borrado diferido para fotos que ya estaban en BD
            const foto = vueAppContext.fotosOriginales.value.find(f => f.name === filename);
            if (foto) vueAppContext.fotosMarcadasBorrar.value.push({ ...foto });
        }

        // Quitar de UI y actualizar modelo
        const idxUI = vueAppContext.fotos.value.findIndex(f => f.name === filename);
        if (idxUI > -1) {
            vueAppContext.fotos.value.splice(idxUI, 1);
            vueAppContext.formData.value.Imagenes = vueAppContext.fotos.value.map(f => f.name).join(',');
        }
    } catch (error) {
        console.error('❌ Error eliminando foto:', error);
    }
};

// Variables globales para el modal de rutas
let routeSelectionCallback = null;

window.openRouteModal = function (rutas, callback) {
    const modal = document.getElementById('route-selection-modal');
    const listContainer = document.getElementById('route-list');

    if (!modal || !listContainer) return;

    // Guardar callback
    routeSelectionCallback = callback;

    // Limpiar lista
    listContainer.innerHTML = '';

    // Crear botones
    rutas.forEach(ruta => {
        const btn = document.createElement('div');
        btn.className = 'route-btn';
        btn.innerHTML = `
            <div>
                <div class="route-btn-code">${ruta.localizacion}</div>
                <div class="route-btn-details">${ruta.tipo} • ${ruta.direccion || '?'}</div>
            </div>
            <div class="route-btn-dist">${ruta.distancia}m</div>
        `;

        btn.onclick = () => {
            selectRoute(ruta);
        };

        listContainer.appendChild(btn);
    });

    // Mostrar modal
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('visible');
    });
};

window.closeRouteModal = function () {
    const modal = document.getElementById('route-selection-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    routeSelectionCallback = null;
};

function selectRoute(ruta) {
    console.log('✅ Ruta seleccionada:', ruta);
    // Guardar referencia local porque closeRouteModal limpia la global
    const callback = routeSelectionCallback;

    window.closeRouteModal();

    if (callback) {
        callback(ruta);
    }
}

// Función global para cargar datos existentes (modo edición desde marcador)
window.loadExistingData = function (id, jsonData) {
    console.log('📝 Cargando datos existentes - ID:', id);

    if (!vueAppContext) {
        console.error('❌ Vue app context no disponible');
        return;
    }

    try {
        const data = JSON.parse(jsonData);



        // Agregar a listData si no existe
        const existingIndex = vueAppContext.listData.value.findIndex(item => item.Id === id);

        if (existingIndex === -1) {
            // Agregar a la lista
            vueAppContext.listData.value.push({
                Id: id,
                Data: data
            });
        }

        // Llamar updateData con el índice
        const index = existingIndex !== -1 ? existingIndex : vueAppContext.listData.value.length - 1;

        // Ejecutar después de un tick para asegurar que Vue haya procesado los cambios
        setTimeout(() => {
            if (typeof vueAppContext.updateData === 'function') {
                vueAppContext.updateData(index);
                console.log('✅ Datos cargados para edición');
            }
        }, 100);

    } catch (error) {
        console.error('❌ Error cargando datos existentes:', error);
    }
};

// La función showConfirmModal ahora reside en utils.js
