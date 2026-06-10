/**
 * displayService.js - Utilidades para visualización de etiquetas y nombres de registros
 */

window.DisplayService = {
    /**
     * Devuelve el nombre resumido de un tipo de formulario (para tablas)
     * @param {Object} data - El objeto de datos (.Data)
     */
    getShortName: function (data) {
        if (!data) return '-';

        const type = data.Type;
        if (type === 'SujetoNatural') {
            return data.DerehoParcelaCatalog === 2 ? 'NAT-POSEEDOR' : 'NAT-PROPIETTARIO';
        }

        if (type === 'SujetoJuridico') {
            return data.DerehoParcelaCatalog !== 1 ? 'JUR-POSEEDOR' : 'JUR-PROPIETARIO';
        }

        const names = {
            'Ficha': 'ENCUESTA',
            'Entrevistado': 'ENTREVIST.',
            'Familiares': 'FAMILIA',
            'NoEncuestado': 'NO ENCUEST.',
            'UnionConPredio': 'UNIÓN PREDIO'
        };
        return names[type] || type;
    },

    /**
     * Devuelve la información principal de un registro según su tipo
     * @param {Object} item - El registro (item.Data contiene el modelo)
     * @param {String} localizacionDefault - Fallback en caso de que falte nombre en encuesta
     */
    getDisplayInfo: function (item, localizacionDefault) {
        const data = item.Data;
        if (!data) return '-';

        switch (data.Type) {
            case 'Ficha':
                return data.NoEncuesta || '-';

            case 'Familiares':
                return `Integrantes: ${data.Familiares?.length || 0}`;

            case 'SujetoJuridico':
                return data.RazonSocial || '-';

            case 'SujetoNatural':
            case 'Entrevistado':
                const fn = data.FirstName || '';
                const sn = data.SecondName ? data.SecondName.charAt(0).toUpperCase() + '.' : '';
                const ln = data.FirstSurName || '';
                return `${fn} ${sn} ${ln}`.trim() || '-';

            case 'NoEncuestado':
                return data.Descripcion ? (data.Descripcion.substring(0, 30) + '...') : 'Sin motivo';

            case 'UnionConPredio':
                return `Master: ${data.LocalizacionMaster || '?'}`;

            default:
                return data.CodigoCamino || '-';
        }
    }
};
