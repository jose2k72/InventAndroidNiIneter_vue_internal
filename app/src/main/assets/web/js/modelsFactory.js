/**
 * modelsFactory.js - Fábrica centralizada de modelos de datos para INETER CADIC
 * Centraliza la estructura de los objetos JSON para asegurar consistencia con la BD.
 */

window.ModelsFactory = {

    /**
     * Crea un modelo vacío de Ficha (Encuesta Catastral)
     * @param {Object} ctx - Contexto de auditoría
     * @param {Object} mapData - Opcional. Datos interceptados del mapa {area, muni, sector}
     */
    createFicha: (ctx, mapData) => ({
        Type: 'Ficha',
        NoEncuesta: '',
        Consecutivo: 0,
        IdPropiedad: window.generateUUID ? window.generateUUID() : '',
        MunicipioCatalog: mapData?.muni || null,
        IdSector: mapData?.sector || '',
        ParcelaCatastrada: '',
        ParcelaSegregada: '',
        TipoEncuestaCatalog: 1, // 1 = Parcela Unificada
        NombreFinca: '',
        OrigenTierraCatalog: null,
        OrigenTierraOtroText: '',
        ResenaHistorica: '',
        Direccion: '',
        Caserio: '',
        BarrioComarca: '',
        Manzana: mapData?.manzana || '',
        NumeroLote: mapData?.lote || '',
        TipoUsoCatalog: 1, // 1 = Privado
        DescripcionUsoCatalog: null,
        DescripcionUsoOtroText: '',
        AreaEstimada: mapData?.area || null,
        UnidadMedidaAreaEstimadaCatalog: mapData?.area ? 3 : null, // 3 = Metros Cuadrados
        ServidumbreAguaCatalog: null,
        ServidumbreAguaOtroText: '',
        ServidumbrePaseCatalog: null,
        ServidumbrePaseOtroText: '',
        ServidumbreOtroCatalog: null,
        ServidumbreOtroOtroText: '',
        PresentaDocumentos: false,
        Documentos: [],
        AreaTitulada: null,
        UnidadMedidaAreaTituladaCatalog: null,
        _isFromMap: !!mapData,
        TieneDatosRegistrales: false,
        FechaAdquisicion: null,
        FechaRegistro: null,
        NoFinca_NAP: '',
        Tomo: '',
        Folio: '',
        Asiento: '',
        ClaseConflictoCatalog: null,
        TieneConflicto: false,
        ClaseConflictoOtroText: '',
        GestionConflictoCatalog: null,
        GestionConflictoOtroText: '',
        ObservacionesGenerales: '',

        // Contexto y Auditoría
        Localizacion: ctx?.loc || '',
        Fecha: ctx?.fecha || null,
        Encuestador: ctx?.enc || null,
        IdObject: ctx?.idObject || 0,
        LatLng: { Lat: ctx?.lat || 0, Lng: ctx?.lng || 0 },
        LocalProj: { x: ctx?.x || 0, y: ctx?.y || 0 },
        Imagenes: '',
        FotoFrente: '',

        // Helpers UI
        _MuniNombre: '', _DeptoNombre: '', _CodDepto: '',
        _ParentescoName: '', _ConflictoName: '', _GestionConflictoName: '',
        _OrigenTierraName: ''
    }),

    /**
     * Modelo base privado que representa Person.cs
     * Compartido por SujetoNatural y Entrevistado
     */
    _basePerson: (ctx) => ({
        FirstName: '', SecondName: '', FirstSurName: '', SecondSurName: '',
        TipoIdentificacionCatalog: null,
        TipoIdentificacionOtroText: '',
        Identificacion: '',
        GenderCatalog: null,
        Age: null,
        CivilStateCatalog: null,
        ProfessionCatalog: 0,
        ProfessionOtroText: '',
        ResidenceMunicipioCatalog: '', // string en C# (Código compuesto)
        ResidenceDireccion: '',
        ResidenceCaserio: '',
        ResidenceBarrioComarca: '',

        // Contexto y Auditoría (ADN Común de App)
        Localizacion: ctx?.loc || '',
        Fecha: ctx?.fecha || null,
        Encuestador: ctx?.enc || null,
        IdObject: ctx?.idObject || 0,
        LatLng: { Lat: ctx?.lat || 0, Lng: ctx?.lng || 0 },
        LocalProj: { x: ctx?.x || 0, y: ctx?.y || 0 },
        Imagenes: '',

        // Helpers UI (No viajan en DTO puro, pero mantienen la UI viva)
        _ProfessionName: '', _DeptoNombre: '', _MuniNombre: '', _CodDepto: ''
    }),

    /**
     * Crea un modelo de Sujeto Natural (Persona Natural / Poseedor)
     * Basado en SujetoNatural.cs : Person
     */
    createSujetoNatural: function (ctx) {
        return {
            ...this._basePerson(ctx),
            Type: 'SujetoNatural',
            // Específicos de SujetoNatural.cs
            PerfilPropietarioCatalog: null,
            PerfilPropietarioOtroText: '',
            PerfilPropietarioCarnet: '',
            DerehoParcelaCatalog: null, // Nota: typo 'Dereho' heredado del DTO
            NoPersonasSimilarDerecho: 0,
            RelacionConPropietarioCatalog: 0,
            _RelacionPropietarioName: '',
            _PerfilPropietarioName: ''
        };
    },

    /**
     * Crea un modelo de Entrevistado
     * Basado en Entrevistado.cs : Person
     */
    createEntrevistado: function (ctx) {
        return {
            ...this._basePerson(ctx),
            Type: 'Entrevistado',
            // Específicos de Entrevistado.cs
            RelacionConParcelaCatalog: null,
            RelacionConParcelaOtroText: '',
            RelacionInformantePropietarioCatalog: 0,
            _RelacionPropietarioName: '',
            // Firma del entrevistado
            ConFirma: true,        // true = firma requerida (por defecto)
            RazonNoFirma: '',      // Código del motivo si ConFirma = false: NQF, NSF, IFF, OTRO
            RazonNoFirmaOtro: ''   // Texto libre si RazonNoFirma === 'OTRO'
        };
    },

    /**
     * Crea un modelo de Sujeto Jurídico (Empresa / Institución)
     * Basado en SujetoJuridico.cs
     */
    createSujetoJuridico: function (ctx) {
        return {
            Type: 'SujetoJuridico',
            DerehoParcelaCatalog: 1, // 1 = Propietario (por defecto). Nota: typo 'Dereho' heredado del DTO
            Identificacion: '',
            RazonSocial: '',
            MuestraDatosRegistrales: false,
            RegistradaEn: '',
            FechaRegistro: null,
            TipoPersonaJuridicaCatalog: null,
            TipoPersonaJuridicaOtroText: '',
            NroSocios: 0,
            NroSocias: 0,
            Colectivo: '',
            Denominacion: '',
            MuestraDatosDeMiembros: false,
            NroMiembros: 0,

            // Contexto y Auditoría
            Localizacion: ctx?.loc || '',
            Fecha: ctx?.fecha || null,
            Encuestador: ctx?.enc || null,
            IdObject: ctx?.idObject || 0,
            LatLng: { Lat: ctx?.lat || 0, Lng: ctx?.lng || 0 },
            LocalProj: { x: ctx?.x || 0, y: ctx?.y || 0 },
            Imagenes: '',

            // Helpers UI
            _TipoPersonaJuridicaName: ''
        };
    },

    /**
     * Crea un modelo de Composición Familiar
     */
    createFamiliares: (ctx) => ({
        Type: 'Familiares',
        Familiares: [],

        // Contexto
        Localizacion: ctx?.loc || '',
        Fecha: ctx?.fecha || null,
        Encuestador: ctx?.enc || null,
        IdObject: ctx?.idObject || 0,
        LatLng: { Lat: ctx?.lat || 0, Lng: ctx?.lng || 0 },
        LocalProj: { x: ctx?.x || 0, y: ctx?.y || 0 },
        Imagenes: ''
    }),

    /**
     * Crea un modelo de Acera (Legacy)
     */
    createAcera: (lat, lng, x, y) => ({
        Type: 'Acera',
        Distrito: '',
        CodigoCamino: '',
        NumBoleta: 'GEN-' + Date.now(),
        Longitud: 0, Ancho: 0, Area: 0,
        EstructGrietas: '', EstructHuecos: '', EstructDesnud: '', EstructEscalon: '', EstructDrenaje: '', TotalEstruct: 0,
        FuncPendTransv: '', FuncPendLong: '', FuncAnchoLibre: '', FuncObstrucion: '', FuncAccesibilidad: '', FuncRejillas: '', TotalFunc: 0,
        ActividadProxEscuelas: '', ActividadProxServGob: '', ActividadProxTerminalBus: '', ActividadProxCentroRecreacion: '', ActividadProxHospital: '', ActividadProxGenTransito: '', ActividadProxAltaPoblacion: '', TotalActividad: 0,
        IndiceCondicionAceras: 0,
        ClasificacionVial: '',
        Observaciones: '',
        LatLng: { Lat: lat, Lng: lng },
        LocalProj: { x: x, y: y },
        CondicionMeteorol: '',
        Fecha: null, Encuestador: null, Imagenes: '', IdObject: 0, Localizacion: ''
    }),

    /**
     * Crea un modelo de No Encuestado (Cuando no se pudo realizar la encuesta)
     */
    createNoEncuestado: (ctx) => ({
        Type: 'NoEncuestado',
        Descripcion: '',
        
        // Contexto y Auditoría
        Localizacion: ctx?.loc || '',
        Fecha: ctx?.fecha || new Date().toISOString().split('T')[0],
        Encuestador: ctx?.enc || null,
        IdObject: ctx?.idObject || 0,
        LatLng: { Lat: ctx?.lat || 0, Lng: ctx?.lng || 0 },
        LocalProj: { x: ctx?.x || 0, y: ctx?.y || 0 },
        Imagenes: ''
    }),

    /**
     * Crea un modelo de Unión con Predio (Englobamiento)
     */
    createUnionConPredio: (ctx) => ({
        Type: 'UnionConPredio',
        LocalizacionMaster: '',
        _MasterDireccionRelativa: '', // Ayuda visual (N, S, E, O)
        
        // Contexto y Auditoría
        Localizacion: ctx?.loc || '',
        Fecha: ctx?.fecha || new Date().toISOString().split('T')[0],
        Encuestador: ctx?.enc || null,
        IdObject: ctx?.idObject || 0,
        LatLng: { Lat: ctx?.lat || 0, Lng: ctx?.lng || 0 },
        LocalProj: { x: ctx?.x || 0, y: ctx?.y || 0 },
        Imagenes: ''
    }),

    /**

     * Crea un modelo de Costo (Legacy)
     */
    createCosto: (lat, lng, x, y) => ({
        Type: 'Costo',
        Distrito: '',
        CodigoCamino: '',
        NumBoleta: 'GEN-' + Date.now(),
        NumProcesoCobro: '',
        Preliminares: window.ModelsFactory.createPayLines([
            { descr: 'Preliminares-trazado', unidad: 'ml', precio: 13520 },
            { descr: 'Demoliciones estructuras existentes', unidad: 'm3', precio: 26500 },
            { descr: 'Conformacion de terreno', unidad: 'm3', precio: 28500 },
            { descr: 'Excavaciones Maquinaria', unidad: 'm3', precio: 9895 }
        ]),
        PreliminaresObservaciones: null,
        Tuberias: window.ModelsFactory.createPayLines([
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
        Tragantes: window.ModelsFactory.createPayLines([
            { descr: 'Construccion de tragante H=2m', unidad: 'unidad', precio: 1895665 },
            { descr: 'Construccion de tragante H=1', unidad: 'unidad', precio: 1025554 },
            { descr: 'Colocacion de loseta tactil en aceras en buen estado', unidad: 'ml', precio: 11450 },
            { descr: 'Construccion de rejilla-Tragante', unidad: 'ml', precio: 125422 }
        ]),
        Acera: window.ModelsFactory.createPayLines([
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
        Cordon: window.ModelsFactory.createPayLines([
            { descr: 'Construcción de cordón de caño (acceso vehicular)', unidad: 'ml', precio: 33422 },
            { descr: 'Construcción de cordón de caño sencillo', unidad: 'ml', precio: 35422 },
            { descr: 'Colocación de cuneta D=300mm', unidad: 'ml', precio: 23000 },
            { descr: 'Colocación de cuneta D=400mm', unidad: 'ml', precio: 26400 }
        ]),
        CordonObservaciones: null,
        Complementarias: window.ModelsFactory.createPayLines([
            { descr: 'Reubicación de medidores de agua', unidad: 'unidad', precio: 66522 },
            { descr: 'Reconstrucción de cajas de registro', unidad: 'unidad', precio: 74500 },
            { descr: 'Construcción de muros pequeños máximo 1,0 metros de alto', unidad: 'm2', precio: 114200 },
            { descr: 'Corte taludes', unidad: 'm3', precio: 9895 },
            { descr: 'Construcción de drenajes y desagües pluviales domésticos', unidad: 'ml', precio: 94500 },
            { descr: 'Reparación de previstas domiciliarias afectadas (potable, negras)', unidad: 'unidad', precio: 114500 },
            { descr: 'Construcción de rampas ley 7600', unidad: 'm2', precio: 115420 }
        ]),
        ComplementariasObservaciones: null,
        LatLng: { Lat: lat, Lng: lng },
        LocalProj: { x: x, y: y },
        CondicionMeteorol: null,
        Fecha: null, Encuestador: null, Imagenes: '', IdObject: 0, Localizacion: '', CodigoCamino: null
    }),

    /**
     * Auxiliar para crear líneas de detalles de costos
     */
    createPayLines: (items) => {
        return items.map((item, index) => ({
            Id: index,
            Descr: item.descr,
            Unidad: item.unidad,
            Precio: item.precio,
            Cantidad: 0, Monto: 0, Longitud: 0, Ancho: 0, Area: 0, Volumen: 0
        }));
    }
};
