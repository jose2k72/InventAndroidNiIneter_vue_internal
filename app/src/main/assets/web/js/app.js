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

        // Referencia para copia de datos
        const pendingCopyData = ref(null);

        // Helper para obtener el contexto de auditoria y ubicación
        const getContext = () => ({
            fechaActual: fechaActual.value,
            encuestador: encuestador.value,
            idObject: idObject.value,
            localizacion: localizacion.value,
            latLng: latLng,
            localProj: localProj
        });

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
                    const rawEnc = Android.getEncuestador ? Android.getEncuestador() : '';
                    encuestador.value = getInitials(rawEnc);

                    const rawFecha = Android.getFecha ? Android.getFecha() : '';
                    // Si viene como DD/MM/YYYY o similar de Android, intentar normalizar
                    if (rawFecha && rawFecha.includes('/')) {
                        const parts = rawFecha.split('/');
                        if (parts.length === 3) {
                            // Asumiendo DD/MM/YYYY del equipo Android
                            fechaActual.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        } else {
                            fechaActual.value = formatDateToISO(new Date());
                        }
                    } else {
                        fechaActual.value = rawFecha || formatDateToISO(new Date());
                    }

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
                        // WGS84 a UTM 16N (EPSG:4326)
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
                encuestador.value = 'DEV';
                fechaActual.value = formatDateToISO(new Date());
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

                if (type === 'Ficha') {
                    // Se inyectan los datos interceptados del mapa directamente al factory
                    formData.value = ModelsFactory.createFicha(ctx, {
                        area: areaCalculada.value,
                        muni: municipioInterceptado.value, // Se pasa como string
                        sector: sectorInterceptado.value
                    });
                } else if (type === 'SujetoNatural') {
                    formData.value = ModelsFactory.createSujetoNatural(ctx);
                } else if (type === 'SujetoJuridico') {
                    formData.value = ModelsFactory.createSujetoJuridico(ctx);
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
            // 1. Revertir cambios físicos de fotos y estado reactivo
            PhotoService.rollback(vueAppContext);

            // 2. Limpiar estado de navegación
            operation.value = 'List';
            formData.value = {};
        };

        // Guardar datos (CONFIRMAR - sincronizar fotos)
        const sendData = (data) => {
            // 1. Ejecutar guardado mediante SyncService
            const savedId = SyncService.saveData(data, currentId.value, getContext());

            if (savedId !== null) {
                currentId.value = savedId;

                // 2. Confirmar transacción de fotos (borrar marcadas, limpiar buffers)
                PhotoService.commit(vueAppContext);

                // 3. Volver a lista y recargar
                volver();
                init();
            }
        };

        // Eliminar registro con modal visual
        const deleteItem = (id) => {
            const itemToDelete = listData.value.find(item => item.Id === id);
            if (!itemToDelete) return;

            // 1. Validar reglas de negocio para borrado
            const deletion = WorkflowService.validateDeletion(itemToDelete.Data?.Type, listData.value);
            if (!deletion.allowed) {
                showConfirmModal({
                    icon: '⚠️', title: 'Acción impedida',
                    message: deletion.message,
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

                    // 3. Ejecutar posibles borrados en cascada (reglas de negocio)
                    const cascadeId = WorkflowService.executeCascadeDeletion(itemToDelete.Data?.Type, listData.value);

                    // 4. Actualizar UI
                    listData.value = listData.value.filter(item => item.Id !== id && item.Id !== cascadeId);
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
            showConfirmModal({
                icon: '🎤', title: 'Crear Entrevistado',
                message: '¿Desea crear un Entrevistado automáticamente con los datos de este Propietario Natural?',
                confirmText: 'Sí, crear',
                onConfirm: () => {
                    ConversionService.propietarioAEntrevistado(propietarioObj, getContext());
                    init();
                }
            });
        };

        // Función para crear automáticamente un propietario natural clonando datos de un entrevistado
        const crearPropietarioDesdeEntrevistado = (entrevistadoId) => {
            const entrevistadoObj = listData.value.find(item => item.Id === entrevistadoId);
            showConfirmModal({
                icon: '👤', title: 'Crear Propietario Natural',
                message: '¿Desea crear un Propietario Natural automáticamente con los datos de este Entrevistado?',
                confirmText: 'Sí, crear',
                onConfirm: () => {
                    ConversionService.entrevistadoAPropietario(entrevistadoObj, getContext());
                    init();
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

            // 1. Validar reglas de negocio con WorkflowService
            const workflow = WorkflowService.validateCreation(type, listData.value);
            if (!workflow.allowed) {
                showConfirmModal({
                    icon: workflow.icon || '⚠️',
                    title: workflow.title,
                    message: workflow.message,
                    confirmText: 'Entendido',
                    cancelText: '',
                    onConfirm: () => { }
                });
                return;
            }

            // 2. Caso especial: Familiares (si ya existe, redirigir a edición en vez de crear nuevo)
            if (type === 'Familiares') {
                const existing = listData.value.find(item => item.Data?.Type === 'Familiares');
                if (existing) {
                    editItem(existing);
                    return;
                }
            }

            // 3. Garantizar limpieza de datos de copia si no existe
            if (!pendingCopyData.value) {
                pendingCopyData.value = null;
            }

            // 4. Proceder con el reset y cambio de vista
            resetForm(type);
            operation.value = 'Create';
        };

        // Ordenar y formatear lista para la tabla
        const sortedListData = Vue.computed(() => {
            const getWeight = (item) => {
                const type = item.Data?.Type;
                if (type === 'Ficha') return 1;
                if (type === 'SujetoJuridico') return 2;
                if (type === 'SujetoNatural') {
                    // Priorizar Propietario (1) sobre Poseedor (2)
                    return item.Data.DerehoParcelaCatalog === 2 ? 4 : 3;
                }
                if (type === 'Entrevistado') return 5;
                if (type === 'Familiares') return 6;
                return 99;
            };

            return [...listData.value].sort((a, b) => getWeight(a) - getWeight(b));
        });

        const getDisplayName = (data) => DisplayService.getShortName(data);

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
            listData,
            sortedListData,
            getDisplayName,
            getDisplayInfo,
            formData,
            fotos,
            fotosOriginales,
            fotosNuevas,
            fotosMarcadasBorrar,
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
            crearPropietarioDesdeEntrevistado,
            getContext
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
window.addPhoto = (filename, base64Data) => PhotoService.handleAndroidPhoto(filename, base64Data, vueAppContext);

// Función global para eliminar foto
window.deletePhoto = (filename) => PhotoService.handleAndroidDelete(filename, vueAppContext);

// Función global para cargar datos existentes (modo edición desde marcador)
window.loadExistingData = (id, jsonData) => SyncService.handleLoadData(id, jsonData, vueAppContext);

// La función showConfirmModal ahora reside en utils.js
