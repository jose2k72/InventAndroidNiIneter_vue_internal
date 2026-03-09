/**
 * clonadorService.js - Lógica de clonación de datos entre diferentes tipos de registros
 */

window.ClonadorService = {
    /**
     * Campos comunes que se comparten entre Propietario Natural y Entrevistado
     * (Opcional: Si se pasa vacío, el clonador usará inspección dinámica)
     */
    CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO: [],

    /**
     * Clona datos de un objeto de origen hacia un modelo de destino
     * Si 'campos' está vacío, realiza una copia por intersección (estilo Reflection)
     * @param {Object} fromData - Datos de origen
     * @param {Object} toModel - Instancia del modelo de destino
     * @param {Array} campos - Opcional. Lista específica de campos a clonar.
     */
    clonarDatos: function (fromData, toModel, campos = []) {
        if (!fromData || !toModel) return;

        // Si no se especifican campos, inspeccionamos las llaves del destino (Reflection)
        const listaFinal = (campos.length > 0) ? campos : Object.keys(toModel);

        // Exclusiones de sistema: Solo protegemos el Type para no cambiar la 
        // identidad del DTO destino durante la clonación. Los metadatos de 
        // auditoría (Fecha, IDs) se copian y pueden ser ajustados por el contexto final.
        const exclusiones = ['Type'];

        listaFinal.forEach(campo => {
            if (!exclusiones.includes(campo) && fromData[campo] !== undefined) {
                // Copia efectiva si el campo existe en el origen
                toModel[campo] = fromData[campo];
            }
        });
    },

    /**
     * Clona metadatos espaciales y de auditoría
     * @param {Object} toModel - Instancia del modelo de destino
     * @param {Object} meta - lat, lng, x, y, loc, enc, fecha, idObject
     */
    clonarMetadatos: function (toModel, meta) {
        if (!toModel || !meta) return;

        toModel.Fecha = meta.fecha;
        toModel.Encuestador = meta.enc;
        toModel.IdObject = meta.idObject;
        toModel.Localizacion = meta.loc;
        if (meta.lat !== undefined && meta.lng !== undefined) {
            toModel.LatLng = { Lat: meta.lat, Lng: meta.lng };
        }
        if (meta.x !== undefined && meta.y !== undefined) {
            // Estandarización CADIC: Usar x/y (minúsculas)
            toModel.LocalProj = { x: meta.x, y: meta.y };
        }
    }
};
