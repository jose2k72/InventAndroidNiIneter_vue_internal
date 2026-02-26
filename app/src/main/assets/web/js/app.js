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
                    latLng.lat = Math.round(Android.getLat() * 1000000) / 1000000;
                    latLng.lng = Math.round(Android.getLng() * 1000000) / 1000000;

                    // Reproyectar a UTM 16N
                    if (typeof proj4 !== 'undefined') {
                        const projected = proj4("EPSG:4326", "EPSG:32616", [latLng.lng, latLng.lat]);
                        localProj.x = Math.round(projected[0] * 100) / 100;
                        localProj.y = Math.round(projected[1] * 100) / 100;
                    }

                    localizacion.value = Android.getLocalizacion();
                    encuestador.value = Android.getEncuestador();
                    fechaActual.value = Android.getFecha();
                    idObject.value = Android.getIdObject();

                    // Cargar datos existentes
                    const jsonData = Android.getData();
                    listData.value = JSON.parse(jsonData);

                } catch (error) {
                    console.error('Error inicializando datos Android:', error);
                }
            } else {
                // Modo desarrollo (navegador)
                latLng.lat = 9.9458;
                latLng.lng = -84.0628;
                localProj.x = 500000;
                localProj.y = 1300000;
                localizacion.value = 'Desarrollo - Sin conexión Android';
                encuestador.value = 'Developer';
                fechaActual.value = new Date().toLocaleDateString('es-CR');
                idObject.value = Date.now();
            }
        };

        // Crear modelo vacío de Acera (FORMATO LEGACY - NO MODIFICAR)
        const createAceraModel = () => ({
            Type: 'Acera',
            Distrito: '',

            CodigoCamino: '',
            NumBoleta: 'GEN-' + Date.now(),
            Longitud: 0,
            Ancho: 0,
            Area: 0,

            // Evaluación Estructural
            EstructGrietas: '',
            EstructHuecos: '',
            EstructDesnud: '',
            EstructEscalon: '',
            EstructDrenaje: '',
            TotalEstruct: 0,

            // Evaluación Funcional
            FuncPendTransv: '',
            FuncPendLong: '',
            FuncAnchoLibre: '',
            FuncObstrucion: '',
            FuncAccesibilidad: '',
            FuncRejillas: '',
            TotalFunc: 0,

            // Factor de Actividad
            ActividadProxEscuelas: '',
            ActividadProxServGob: '',
            ActividadProxTerminalBus: '',
            ActividadProxCentroRecreacion: '',
            ActividadProxHospital: '',
            ActividadProxGenTransito: '',
            ActividadProxAltaPoblacion: '',
            TotalActividad: 0,

            IndiceCondicionAceras: 0,
            ClasificacionVial: '',
            Observaciones: '',

            // Coordenadas - PascalCase para compatibilidad con legacy
            LatLng: {
                Lat: latLng.lat,
                Lng: latLng.lng
            },
            LocalProj: {
                East: localProj.east,
                North: localProj.north
            },

            CondicionMeteorol: '',

            // Metadatos
            Fecha: null,
            Encuestador: null,
            Imagenes: '',
            IdObject: 0,
            Localizacion: ''
        });

        // Crear modelo vacío de Costo (FORMATO LEGACY COMPLETO - NO MODIFICAR)
        const createCostoModel = () => ({
            Type: 'Costo',
            Distrito: '',

            CodigoCamino: '',
            NumBoleta: 'GEN-' + Date.now(),
            NumProcesoCobro: '',

            // Preliminares (4 items)
            Preliminares: createPayLines([
                { descr: 'Preliminares-trazado', unidad: 'ml', precio: 13520 },
                { descr: 'Demoliciones estructuras existentes', unidad: 'm3', precio: 26500 },
                { descr: 'Conformacion de terreno', unidad: 'm3', precio: 28500 },
                { descr: 'Excavaciones Maquinaria', unidad: 'm3', precio: 9895 }
            ]),
            PreliminaresObservaciones: null,

            // Tuberias (10 items)
            Tuberias: createPayLines([
                { descr: 'Encamado', unidad: 'm3', precio: 13520 },
                { descr: 'Tuberia 300mm diametro', unidad: 'ml', precio: 189500 },
                { descr: 'Tuberia 400mm diametro', unidad: 'ml', precio: 220000 },
                { descr: 'Tuberia 600mm diametro', unidad: 'ml', precio: 245114 },
                { descr: 'Tuberia 650mm diametro', unidad: 'ml', precio: 295666 },
                { descr: 'Tuberia 750mm diametro', unidad: 'ml', precio: 325600 },
                { descr: 'Tuberia 800mm diametro', unidad: 'ml', precio: 398500 },
                { descr: 'Rellenos y compactacion zona de tubo', unidad: 'm3', precio: 27500 },
                { descr: 'Reposicion de base de material selecto', unidad: 'm3', precio: 35600 },
                { descr: 'Diseño de espacios urbanos', unidad: 'm2', precio: 41250 }
            ]),
            TuberiasObservaciones: null,

            // Tragantes (4 items)
            Tragantes: createPayLines([
                { descr: 'Construccion de tragante H=2m', unidad: 'unidad', precio: 1895665 },
                { descr: 'Construccion de tragante H=1', unidad: 'unidad', precio: 1025554 },
                { descr: 'Colocacion de loseta tactil en aceras en buen estado', unidad: 'ml', precio: 11450 },
                { descr: 'Construccion de rejilla-Tragante', unidad: 'ml', precio: 125422 }
            ]),
            TragantesObservaciones: null,

            // Acera (9 items)
            Acera: createPayLines([
                { descr: 'Acera concreto sin loseta tactil', unidad: 'm2', precio: 29500 },
                { descr: 'Acera concreto con loseta tactil', unidad: 'm2', precio: 33500 },
                { descr: 'Acera concreto sin loseta tactil con acero de refuerzo (malla eletrosoldada #2)', unidad: 'm2', precio: 33925 },
                { descr: 'Acera concreto con loseta tactil con acero de refuerzo (malla eletrosoldada #2)', unidad: 'm2', precio: 38525 },
                { descr: 'Acera concreto sin loseta tactil con acero de refuerzo malla de varilla #3@15cm', unidad: 'm2', precio: 39014 },
                { descr: 'Acera concreto con loseta tactil con acero de refuerzo malla de varilla #3@15cm', unidad: 'm2', precio: 46230 },
                { descr: 'Rampas en cruces de calle con loseta tactil', unidad: 'm2', precio: 76500 },
                { descr: 'Pasamanos de seguridad', unidad: 'ml', precio: 66520 },
                { descr: 'Colocacion de Bolardos', unidad: 'unidad', precio: 56422 }
            ]),
            AceraObservaciones: null,

            // Cordon (4 items)
            Cordon: createPayLines([
                { descr: 'Construcción de cordón de caño (acceso vehicular)', unidad: 'ml', precio: 33422 },
                { descr: 'Construcción de cordón de caño sencillo', unidad: 'ml', precio: 35422 },
                { descr: 'Colocación de cuneta D=300mm', unidad: 'ml', precio: 23000 },
                { descr: 'Colocación de cuneta D=400mm', unidad: 'ml', precio: 26400 }
            ]),
            CordonObservaciones: null,

            // Complementarias (7 items)
            Complementarias: createPayLines([
                { descr: 'Reubicación de medidores de agua', unidad: 'unidad', precio: 66522 },
                { descr: 'Reconstrucción de cajas de registro', unidad: 'unidad', precio: 74500 },
                { descr: 'Construcción de muros pequeños máximo 1,0 metros de alto', unidad: 'm2', precio: 114200 },
                { descr: 'Corte taludes', unidad: 'm3', precio: 9895 },
                { descr: 'Construcción de drenajes y desagües pluviales domésticos', unidad: 'ml', precio: 94500 },
                { descr: 'Reparación de previstas domiciliarias afectadas (potable, negras)', unidad: 'unidad', precio: 114500 },
                { descr: 'Construcción de rampas ley 7600', unidad: 'm2', precio: 115420 }
            ]),
            ComplementariasObservaciones: null,

            // Coordenadas - PascalCase para compatibilidad con legacy
            LatLng: {
                Lat: latLng.lat,
                Lng: latLng.lng
            },
            LocalProj: {
                East: localProj.east,
                North: localProj.north
            },

            CondicionMeteorol: null,

            // Metadatos
            Fecha: null,
            Encuestador: null,
            Imagenes: '',
            IdObject: 0,
            Localizacion: '',
            CodigoCamino: null
        });

        const createEncuestaCatastralModel = () => ({
            Type: 'EncuestaCatastral',
            Departamento: '', CodigoDepartamento: '',
            Municipio: '', CodigoMunicipio: '',
            Sector: '', NombreFinca: '',
            ParcelaCatastrada: '', ParcelaSegregada: '',
            TipoEncuesta: null, Comarca: '', Barrio: '', Manzana: '', NumeroLote: '',
            TipoUso: null, Descripcion: '', AreaEstimada: null, UnidadMedidaAreaEstimada: null,
            // Servidumbre Agua
            ServidumbreAgua: false, ServidumbreAguaEscritura: false, ServidumbreAguaJudicial: false, ServidumbreAguaAcuerdo: false, ServidumbreAguaOtro: false,
            // Servidumbre Pase
            ServidumbrePase: false, ServidumbrePaseEscritura: false, ServidumbrePaseJudicial: false, ServidumbrePaseAcuerdo: false, ServidumbrePaseOtro: false,
            // Servidumbre Otro
            ServidumbreOtro: false, ServidumbreOtroEscritura: false, ServidumbreOtroJudicial: false, ServidumbreOtroAcuerdo: false, ServidumbreOtroOtro: false,
            DerechoParcela: null, NoPersonasSimilarDerecho: 0, PresentaDocumentos: false,
            DocumentoCatalog: 0, AutorNotario: '', FechaDocumento: null,
            AreaTitulada: null, UnidadMedidaAreaTitulada: null,
            EsAFavorDe: false, AFavorDe: '', RelacionConPoseedor: 0,
            TieneDatosRegistrales: false, FechaAdquisicion: null, FechaRegistro: null,
            NoFinca: '', Tomo: '', Folio: '', Asiento: ''
        });

        const createPropietarioNaturalModel = () => ({
            Type: 'PropietarioNatural',
            // Person fields
            FirstName: '', SecondName: '', FirstSurName: '', SecondSurName: '',
            Gender: null, // null para forzar selección
            Age: null, // null para forzar entrada
            CivilState: null, // null para forzar selección
            ProfessionCatalog: 0,
            ResidenceDireccion: '',
            ResidenceDepartamento: '',
            ResidenceComarca: '',
            ResidenceBarrio: ''
        });

        const createPropietarioJuridicaModel = () => ({
            Type: 'PropietarioJuridica',
            RazonSocial: '',
            RegistradaEn: '',
            FechaRegistro: null,
            TipoPersonaJuridica: null, // null para forzar selección
            NroSocios: 0,
            NroSocias: 0,
            Colectivo: '',
            Denominacion: '',
            NroMiembros: 0
        });

        const createEntrevistadoModel = () => ({
            Type: 'Entrevistado',
            // Person fields
            FirstName: '', SecondName: '', FirstSurName: '', SecondSurName: '',
            Gender: null, // null para forzar selección
            Age: null, // null para forzar entrada
            CivilState: null, // null para forzar selección
            ProfessionCatalog: 0,
            ResidenceDireccion: '',
            ResidenceDepartamento: '',
            ResidenceComarca: '',
            ResidenceBarrio: '',

            // Entrevistado fields
            RelacionConParcela: null, // null para forzar selección
            RelacionInformantePropietarioCatalog: 0
        });

        // Crear líneas de pago
        const createPayLines = (items) => {
            return items.map((item, index) => ({
                Id: index,
                Descr: item.descr,
                Unidad: item.unidad,
                Precio: item.precio,
                Cantidad: 0,
                Monto: 0,
                Longitud: 0,
                Ancho: 0,
                Area: 0,
                Volumen: 0
            }));
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
                if (type === 'Acera') {
                    formData.value = createAceraModel();
                } else if (type === 'Costo') {
                    formData.value = createCostoModel();
                } else if (type === 'EncuestaCatastral') {
                    formData.value = createEncuestaCatastralModel();
                } else if (type === 'PropietarioNatural') {
                    formData.value = createPropietarioNaturalModel();
                } else if (type === 'PropietarioJuridica') {
                    formData.value = createPropietarioJuridicaModel();
                } else if (type === 'Entrevistado') {
                    formData.value = createEntrevistadoModel();
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

            // Cargar fotos si existen
            if (item.Data.Imagenes) {
                const nombres = item.Data.Imagenes.split(',').filter(f => f.trim());

                // Cargar cada foto desde el disco
                const fotosData = nombres.map(nombre => {
                    const base64 = typeof Android !== 'undefined' && typeof Android.loadPhotoAsBase64 === 'function'
                        ? Android.loadPhotoAsBase64(nombre.trim())
                        : '';

                    return {
                        name: nombre.trim(),
                        data: base64 ? `data:image/jpeg;base64,${base64}` : null
                    };
                });

                fotos.value = fotosData;
                // Guardar snapshot de fotos originales (copia profunda)
                fotosOriginales.value = fotosData.map(f => ({ ...f }));

                console.log(`📸 Cargadas ${fotos.value.length} fotos para edición (originales guardadas)`);
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
            // 1. Eliminar físicamente las fotos MARCADAS para borrar
            if (fotosMarcadasBorrar.value.length > 0) {
                console.log(`🗑️ Eliminando ${fotosMarcadasBorrar.value.length} fotos marcadas para borrar...`);
                for (const foto of fotosMarcadasBorrar.value) {
                    if (typeof Android !== 'undefined' && typeof Android.deletePhotoFile === 'function') {
                        Android.deletePhotoFile(foto.name);
                    }
                }
            }

            // 2. Las fotos NUEVAS ya están en disco, se quedan
            if (fotosNuevas.value.length > 0) {
                console.log(`✅ Conservando ${fotosNuevas.value.length} fotos nuevas`);
            }

            // 3. Agregar metadatos
            data.Fecha = fechaActual.value;
            data.Encuestador = encuestador.value;
            data.IdObject = idObject.value;
            data.Localizacion = localizacion.value;

            // Coordenadas con PascalCase para compatibilidad legacy
            data.LatLng = {
                Lat: latLng.lat,
                Lng: latLng.lng
            };
            data.LocalProj = {
                East: localProj.east,
                North: localProj.north
            };

            // 4. Enviar a Android
            if (typeof Android !== 'undefined') {
                try {
                    const jsonData = JSON.stringify(data);
                    console.log('JSON a guardar:', jsonData);
                    const savedId = Android.sendData(currentId.value, jsonData);
                    currentId.value = savedId;
                    console.log('Datos guardados con ID:', savedId);
                } catch (error) {
                    console.error('Error guardando datos:', error);
                }
            } else {
                console.log('Datos guardados (modo desarrollo):', data);
            }

            // 5. Limpiar listas de tracking
            fotosOriginales.value = [];
            fotosNuevas.value = [];
            fotosMarcadasBorrar.value = [];

            // Volver a lista
            volver();
            init(); // Recargar lista
        };

        // Eliminar registro con modal visual
        const deleteItem = (id) => {
            const itemToDelete = listData.value.find(item => item.Id === id);
            if (!itemToDelete) return;

            const type = itemToDelete.Data?.Type;
            const hasEncuesta = listData.value.some(item => item.Data?.Type === 'EncuestaCatastral');

            // 1. Validar si se puede borrar
            if (hasEncuesta) {
                if (type === 'Entrevistado') {
                    showConfirmModal({
                        icon: '⚠️',
                        title: 'Acción impedida',
                        message: 'No puede eliminar al Entrevistado porque existe una Encuesta Catastral vinculada. Debe eliminar la Encuesta primero.',
                        confirmText: 'Entendido',
                        cancelText: '',
                        onConfirm: () => { }
                    });
                    return;
                }

                if (type === 'PropietarioNatural' || type === 'PropietarioJuridica') {
                    const propietarios = listData.value.filter(item =>
                        item.Data?.Type === 'PropietarioNatural' || item.Data?.Type === 'PropietarioJuridica'
                    );

                    if (propietarios.length <= 1) {
                        showConfirmModal({
                            icon: '⚠️',
                            title: 'Acción impedida',
                            message: 'No puede eliminar al único Propietario porque existe una Encuesta Catastral vinculada. Debe eliminar la Encuesta primero.',
                            confirmText: 'Entendido',
                            cancelText: '',
                            onConfirm: () => { }
                        });
                        return;
                    }
                }
            }

            // 2. Proceder con la confirmación de borrado
            showConfirmModal({
                icon: '🗑️',
                title: '¿Eliminar registro?',
                message: 'Esta acción eliminará el registro y todas sus fotos asociadas. Esta acción no se puede deshacer.',
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                onConfirm: () => {
                    // 1. Llamar a Android primero
                    if (typeof Android !== 'undefined') {
                        Android.deleteData(id);
                    } else {
                        console.log('Borrado simulado (modo desarrollo) ID:', id);
                    }

                    // 2. Buscar el índice REAL en listData usando el ID
                    const realIndex = listData.value.findIndex(item => item.Id === id);

                    if (realIndex !== -1) {
                        console.log(`🗑️ Eliminando de Vue: ID ${id} en índice real ${realIndex}`);
                        listData.value.splice(realIndex, 1);
                    } else {
                        console.warn(`⚠️ No se encontró el ID ${id} en listData para actualizar la UI`);
                    }
                }
            });
        };

        // Abrir cámara
        const openCamera = () => {
            if (typeof Android !== 'undefined') {
                Android.Camera();
            } else {
                console.log('Cámara no disponible en modo desarrollo');
            }
        };

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
                openCatalog  // <-- Exponer función global
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

            // 1. Validaciones de Exclusividad de Propietarios
            const hasNatural = listData.value.some(item => item.Data?.Type === 'PropietarioNatural');
            const hasJuridico = listData.value.some(item => item.Data?.Type === 'PropietarioJuridica');

            if (type === 'PropietarioNatural' && hasJuridico) {
                showConfirmModal({
                    icon: '🚫',
                    title: 'Acción no permitida',
                    message: 'Ya existe un Propietario Jurídico registrado. No se pueden mezclar tipos de propietarios en el mismo predio.',
                    confirmText: 'Entendido',
                    cancelText: '',
                    onConfirm: () => { }
                });
                return;
            }

            if (type === 'PropietarioJuridica') {
                if (hasJuridico) {
                    showConfirmModal({
                        icon: '🚫',
                        title: 'Límite alcanzado',
                        message: 'Solo se puede registrar un (1) Propietario Jurídico por predio.',
                        confirmText: 'Entendido',
                        cancelText: '',
                        onConfirm: () => { }
                    });
                    return;
                }
                if (hasNatural) {
                    showConfirmModal({
                        icon: '🚫',
                        title: 'Acción no permitida',
                        message: 'Existen Propietarios Naturales registrados. No se puede agregar un propietario jurídico a este predio.',
                        confirmText: 'Entendido',
                        cancelText: '',
                        onConfirm: () => { }
                    });
                    return;
                }
            }

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

                if ((!hasNatural && !hasJuridico) || !hasEntrevistado) {
                    showConfirmModal({
                        icon: '⚠️',
                        title: 'Faltan datos',
                        message: 'Debe registrar primero un Propietario (Natural o Jurídico) y un Entrevistado antes de realizar la encuesta.',
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
                'Entrevistado': 3
            };

            return [...listData.value].sort((a, b) => {
                const weightA = orderWeights[a.Data?.Type] || 99;
                const weightB = orderWeights[b.Data?.Type] || 99;
                return weightA - weightB;
            });
        });

        const getDisplayName = (type) => {
            const names = {
                'EncuestaCatastral': 'ENCUESTA',
                'PropietarioNatural': 'PROP. NAT.',
                'PropietarioJuridica': 'PROP. JUR.',
                'Entrevistado': 'ENTREVIST.'
            };
            return names[type] || type;
        };

        const getDisplayInfo = (item) => {
            const data = item.Data;
            if (!data) return '-';

            if (data.Type === 'EncuestaCatastral') {
                return localizacion.value || '-';
            }

            if (data.Type === 'PropietarioJuridica') {
                return data.RazonSocial || '-';
            }

            if (data.Type === 'PropietarioNatural' || data.Type === 'Entrevistado') {
                const first = data.FirstName || '';
                const second = data.SecondName ? data.SecondName.charAt(0).toUpperCase() + '.' : '';
                const last = data.FirstSurName || '';
                return `${first} ${second} ${last}`.trim();
            }

            return data.CodigoCamino || '-';
        };

        // --- GESTIÓN DE CATÁLOGOS GLOBALES A PANTALLA COMPLETA ---
        const catalogParams = ref(null); // Contendrá las opciones (name, targetVar...)

        const openCatalog = (options) => {
            // Guardamos qué catálogo se pidió y a qué variable local de retorno va dirigida
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

            // Catálogo Global
            catalogParams,
            openCatalog,
            onCatalogSelect,
            cancelCatalog,

            // Acciones

            volver,
            sendData,
            deleteItem,
            updateData,
            editItem,
            openCamera,
            resetForm,
            startCreate,
            startCopy
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

    if (!vueAppContext) {
        console.error('❌ Vue app context no disponible');
        return;
    }

    try {
        // Agregar foto al array como objeto {name, data}
        const fotoObj = {
            name: filename,
            data: base64Data ? `data:image/jpeg;base64,${base64Data}` : null
        };

        // Añadir a fotos visibles
        vueAppContext.fotos.value.push(fotoObj);

        // TRACKING: Registrar como foto NUEVA (ya guardada en disco por la cámara)
        vueAppContext.fotosNuevas.value.push({ ...fotoObj });

        // Actualizar campo Imagenes con solo los nombres (CSV)
        const nombres = vueAppContext.fotos.value.map(f => f.name).join(',');
        vueAppContext.formData.value.Imagenes = nombres;

        console.log('✅ Foto agregado (nueva):', filename);
        console.log('✅ Total fotos visibles:', vueAppContext.fotos.value.length);
        console.log('✅ Total fotos nuevas:', vueAppContext.fotosNuevas.value.length);
    } catch (error) {
        console.error('❌ Error agregando foto:', error);
    }
};

// Función global para eliminar foto (lógica transaccional)
window.deletePhoto = function (filename) {
    console.log('🗑️ Marcando foto para eliminar:', filename);

    if (!vueAppContext) {
        console.error('❌ Vue app context no disponible');
        return;
    }

    try {
        // Determinar si es foto ORIGINAL o NUEVA
        const esNueva = vueAppContext.fotosNuevas.value.some(f => f.name === filename);
        const esOriginal = vueAppContext.fotosOriginales.value.some(f => f.name === filename);

        if (esNueva) {
            // FOTO NUEVA: Eliminar físicamente AHORA (no tiene sentido conservarla)
            console.log('🗑️ Foto nueva - eliminando físicamente...');
            if (typeof Android !== 'undefined' && typeof Android.deletePhotoFile === 'function') {
                Android.deletePhotoFile(filename);
            }
            // Quitar de fotosNuevas
            const idxNueva = vueAppContext.fotosNuevas.value.findIndex(f => f.name === filename);
            if (idxNueva > -1) {
                vueAppContext.fotosNuevas.value.splice(idxNueva, 1);
            }
        } else if (esOriginal) {
            // FOTO ORIGINAL: Solo MARCAR para borrar (no eliminar físicamente aún)
            console.log('⏸️ Foto original - marcando para borrar...');
            const fotoOriginal = vueAppContext.fotosOriginales.value.find(f => f.name === filename);
            if (fotoOriginal) {
                vueAppContext.fotosMarcadasBorrar.value.push({ ...fotoOriginal });
            }
        }

        // Quitar de fotos visibles (UI)
        const index = vueAppContext.fotos.value.findIndex(f => f.name === filename);
        if (index > -1) {
            vueAppContext.fotos.value.splice(index, 1);

            // Actualizar campo Imagenes con solo los nombres
            const nombres = vueAppContext.fotos.value.map(f => f.name).join(',');
            vueAppContext.formData.value.Imagenes = nombres;

            console.log('✅ Foto quitada de UI');
            console.log('✅ Fotos visibles restantes:', vueAppContext.fotos.value.length);
            console.log('✅ Fotos marcadas para borrar:', vueAppContext.fotosMarcadasBorrar.value.length);
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

// Función global para mostrar modal de confirmación visual
function showConfirmModal(options) {
    const {
        icon = '⚠️',
        title = '¿Está seguro?',
        message = '',
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        onConfirm = () => { },
        onCancel = () => { }
    } = options;

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';

    // Conditionally create cancel button
    const cancelButtonBg = cancelText ? `<button class="confirm-btn confirm-btn-cancel" id="modal-cancel">${cancelText}</button>` : '';

    // Crear modal
    overlay.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-modal-icon">${icon}</div>
            <div class="confirm-modal-title">${title}</div>
            <div class="confirm-modal-message">${message}</div>
            <div class="confirm-modal-buttons">
                ${cancelButtonBg}
                <button class="confirm-btn confirm-btn-danger" id="modal-confirm">${confirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    const closeModal = () => {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => overlay.remove(), 150);
    };

    if (cancelText) {
        overlay.querySelector('#modal-cancel').addEventListener('click', () => {
            closeModal();
            onCancel();
        });
    }

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    // Cerrar con click en overlay (fuera del modal)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
            onCancel();
        }
    });
}

// Hacer disponible globalmente para uso desde componentes
window.showConfirmModal = showConfirmModal;
