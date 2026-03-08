/**
 * clonadorService.js - Lógica de clonación de datos entre diferentes tipos de registros
 */

window.ClonadorService = {
    /**
     * Campos comunes que se comparten entre Propietario Natural y Entrevistado
     */
    CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO: [
        'TipoIdentificacionCatalog', 'Identificacion',
        'FirstName', 'SecondName', 'FirstSurName', 'SecondSurName',
        'GenderCatalog', 'Age', 'CivilStateCatalog', 'ProfessionCatalog', 'ProfessionOtroText',
        'ResidenceMunicipioCatalog', 'ResidenceComarca', 'ResidenceBarrio', 'ResidenceDireccion',
        '_ProfessionName', '_CodDepto', '_DeptoNombre', '_MuniNombre'
    ],

    /**
     * Clona datos de un objeto de origen hacia un modelo de destino
     * @param {Object} fromData - Datos de origen
     * @param {Object} toModel - Instancia del modelo de destino
     * @param {Array} campos - Lista de campos a clonar
     */
    clonarDatos: function (fromData, toModel, campos) {
        if (!fromData || !toModel || !campos) return;

        campos.forEach(campo => {
            if (fromData[campo] !== undefined) {
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
            toModel.LocalProj = { East: meta.x, North: meta.y };
        }
    }
};
