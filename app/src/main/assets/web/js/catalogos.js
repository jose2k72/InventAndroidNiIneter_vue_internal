/**
 * Catálogos oficiales para NI INETER - Sincronizados con NI.INETER.Core C#
 */

const Catalogos = {
    // Los catálogos GRANDES ahora están en JSONs separados (Profesiones, Documentos, etc.)
    // Se cargarán bajo demanda usando <catalogo-selector>

    // Solo mantenemos los catálogos PEQUEÑOS y de uso frecuente aquí:

    RelacionInformanteParcela: [
        { id: 1, name: "Propietario(a)" }, { id: 2, name: "Poseedor(a)" }, { id: 3, name: "Representante" },
        { id: 4, name: "Particular" }, { id: 5, name: "Otro" }
    ],

    Generos: [
        { id: 0, name: "Masculino" }, { id: 1, name: "Femenino" }
    ],

    EstadosCiviles: [
        { id: 1, name: "Soltero(a)" }, { id: 2, name: "Casado(a)" }, { id: 3, name: "Unión de Hecho" }
    ],

    TiposPersonaJuridica: [
        { id: 1, name: "SOCIEDAD ANONIMA" }, { id: 2, name: "SOCIEDAD COOPERATIVA" },
        { id: 3, name: "SOCIEDAD R LIMITADA" }, { id: 4, name: "OTRAS" }
    ],

    TiposDeEncuesta: [
        { id: 1, name: "Parcela unificada" }, { id: 2, name: "Parcela horizontal" }
    ],

    TiposUso: [
        { id: 1, name: "Privado" }, { id: 2, name: "Publico" }
    ],

    UnidadesMedida: [
        { id: 1, name: "Caballerias" }, { id: 2, name: "Hectareas" }, { id: 3, name: "Metros Cuadrados" },
        { id: 4, name: "Manzana" }, { id: 5, name: "Sin Datos" }, { id: 6, name: "Vrs2" }
    ],

    DerechoParcela: [
        { id: 1, name: "Propietario" }, { id: 2, name: "Poseedor" }
    ],

    OrigenesTierra: [
        { id: 1, name: "Otros" }, { id: 11, name: "Tierras Privadas" }
    ]
};

window.Catalogos = Catalogos;
