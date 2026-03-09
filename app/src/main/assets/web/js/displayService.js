/**
 * displayService.js - Utilidades para visualización de etiquetas y nombres de registros
 */

window.DisplayService = {
    /**
     * Devuelve el nombre resumido de un tipo de formulario (para tablas)
     */
    getShortName: function (type) {
        const names = {
            'Ficha': 'ENCUESTA',
            'SujetoNatural': 'PROP. NATURAL',
            'SujetoJuridico': 'PROP. JURÍDICA',
            'Entrevistado': 'ENTREVIST.',
            'Familiares': 'FAMILIA'
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
                return data.NombreFinca || localizacionDefault || '-';

            case 'Familiares':
                return `Integrantes: ${data.Familiares?.length || 0}`;

            case 'SujetoJuridico':
                return data.RazonSocial || '-';

            case 'SujetoNatural':
                const fn = data.FirstName || '';
                const sn = data.SecondName ? data.SecondName.charAt(0).toUpperCase() + '.' : '';
                const ln = data.FirstSurName || '';
                let name = `${fn} ${sn} ${ln}`.trim() || '-';

                // Mostrar Derecho o Relación
                if (data.DerehoParcelaCatalog === 1) {
                    name += ' - [PROP.]';
                } else if (data._RelacionPropietarioName) {
                    name += ` - [${data._RelacionPropietarioName.toUpperCase()}]`;
                }
                return name;

            case 'Entrevistado':
                const first = data.FirstName || '';
                const second = data.SecondName ? data.SecondName.charAt(0).toUpperCase() + '.' : '';
                const last = data.FirstSurName || '';
                return `${first} ${second} ${last}`.trim() || '-';

            default:
                return data.CodigoCamino || '-';
        }
    }
};
