/**
 * Componente FormPropietarioNatural - Vue 3
 * Formulario para el Propietario (Persona Natural) basado en Person.cs de C#
 */

const FormPropietarioNatural = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>👤 Propietario (Persona Natural)</h2>
            
            <div class="section">
                <h3>🆔 Identificación</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.TipoIdentificacionCatalog ? 'red' : 'inherit', fontWeight: errors.TipoIdentificacionCatalog ? 'bold' : 'normal'}">Tipo de Identificación *</label>
                        <select v-model.number="formData.TipoIdentificacionCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.TipoIdentificacion" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Identificacion ? 'red' : 'inherit', fontWeight: errors.Identificacion ? 'bold' : 'normal'}">No. Identificación *</label>
                        <input type="text" v-model="formData.Identificacion" placeholder="Ej: 001-000000-0000A">
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>📝 Datos Personales</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstName ? 'red' : 'inherit', fontWeight: errors.FirstName ? 'bold' : 'normal'}">Primer Nombre *</label>
                        <input type="text" v-model="formData.FirstName" placeholder="Ej: Juan">
                    </div>
                    <div class="form-group">
                        <label>Segundo Nombre</label>
                        <input type="text" v-model="formData.SecondName" placeholder="Ej: Antonio">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstSurName ? 'red' : 'inherit', fontWeight: errors.FirstSurName ? 'bold' : 'normal'}">Primer Apellido *</label>
                        <input type="text" v-model="formData.FirstSurName" placeholder="Ej: Pérez">
                    </div>
                    <div class="form-group">
                        <label>Segundo Apellido</label>
                        <input type="text" v-model="formData.SecondSurName" placeholder="Ej: García">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.GenderCatalog ? 'red' : 'inherit', fontWeight: errors.GenderCatalog ? 'bold' : 'normal'}">Género *</label>
                        <select v-model.number="formData.GenderCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.Generos" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Age ? 'red' : 'inherit', fontWeight: errors.Age ? 'bold' : 'normal'}">Edad *</label>
                        <input type="number" v-model.number="formData.Age" min="0">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.CivilStateCatalog ? 'red' : 'inherit', fontWeight: errors.CivilStateCatalog ? 'bold' : 'normal'}">Estado Civil *</label>
                        <select v-model.number="formData.CivilStateCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.EstadoCivil" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                       <label :style="{color: errors.ProfessionCatalog ? 'red' : 'inherit', fontWeight: errors.ProfessionCatalog ? 'bold' : 'normal'}">Profesión u Oficio *</label>
                       <!-- Selector que llama a la vista principal -->
                       <div class="selector-display" @click="pedirProfesionGlobal">
                           <span v-if="profesionName" style="color: #1565C0; font-weight: 600;">{{ profesionName }}</span>
                           <span v-else style="color: #757575;">Seleccione una profesión...</span>
                           <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                       </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>🏠 Residencia</h3>

                <!-- Municipio: selector visual de dos niveles -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceMunicipioCatalog ? 'red' : 'inherit', fontWeight: errors.ResidenceMunicipioCatalog ? 'bold' : 'normal'}">Municipio de Residencia *</label>

                    <!-- Trigger para abrir el selector -->
                    <div class="selector-display" @click="pedirMunicipioGlobal" style="margin-bottom: 6px;">
                        <span v-if="muniDisplay" style="color: #1565C0; font-weight: 600;">Cambiar...</span>
                        <span v-else style="color: #757575;">Seleccione departamento / municipio...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">📍</span>
                    </div>

                    <!-- Visualización del departamento seleccionado (readonly) -->
                    <div v-if="deptoDisplay" style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px 12px;
                        background: #e3f2fd;
                        border: 1px solid #90caf9;
                        border-radius: 6px;
                        margin-bottom: 6px;
                        font-size: 14px;
                    ">
                        <span style="font-weight: bold; color: #1565C0; min-width: 32px;">{{ deptoDisplay.cod }}</span>
                        <span style="color: #333;">{{ deptoDisplay.nombre }}</span>
                    </div>

                    <!-- Visualización del municipio seleccionado (readonly) -->
                    <div v-if="muniDisplay" style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px 12px;
                        background: #e8f5e9;
                        border: 1px solid #a5d6a7;
                        border-radius: 6px;
                        font-size: 14px;
                    ">
                        <span style="font-weight: bold; color: #2e7d32; min-width: 32px;">{{ muniDisplay.cod }}</span>
                        <span style="color: #333;">{{ muniDisplay.nombre }}</span>
                    </div>
                </div>

                <!-- Comarca en una sola línea -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceComarca ? 'red' : 'inherit', fontWeight: errors.ResidenceComarca ? 'bold' : 'normal'}">Comarca *</label>
                    <input type="text" v-model="formData.ResidenceComarca">
                </div>

                <!-- Barrio / Caserío en una sola línea -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceBarrio ? 'red' : 'inherit', fontWeight: errors.ResidenceBarrio ? 'bold' : 'normal'}">Barrio / Caserío *</label>
                    <input type="text" v-model="formData.ResidenceBarrio">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.ResidenceDireccion ? 'red' : 'inherit', fontWeight: errors.ResidenceDireccion ? 'bold' : 'normal'}">Dirección exacta *</label>
                    <textarea v-model="formData.ResidenceDireccion" rows="2"></textarea>
                </div>
            </div>

            <div class="btn-group">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        // IMPORTANTE: No usar spread — necesitamos el mismo objeto de app.js para que
        // los cambios del callback (desde SelectCatalog) persistan al recrear el componente.
        const formData = Vue.reactive(props.data);
        const errors = Vue.reactive({});

        // Variables para nombres visuales de Municipio
        // Los _helper persisten en formData (que es el objeto de app.js)
        const deptoDisplay = Vue.ref(
            formData._DeptoNombre
                ? { cod: formData._CodDepto, nombre: formData._DeptoNombre }
                : null
        );
        const muniDisplay = Vue.ref(
            formData._MuniNombre
                ? { cod: formData.ResidenceMunicipioCatalog ? String(formData.ResidenceMunicipioCatalog).slice(-2) : '', nombre: formData._MuniNombre }
                : null
        );

        // Llamada al selector de municipio (dos niveles)
        const pedirMunicipioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openMunicipio === 'function') {
                vueAppContext.openMunicipio({
                    onSelect: (resultado) => {
                        // DTO: código completo del municipio
                        formData.ResidenceMunicipioCatalog = resultado.codMuni;
                        // Helpers UI: persisten en el objeto de app.js
                        formData._CodDepto = resultado.codDepto;
                        formData._DeptoNombre = resultado.departamento;
                        formData._MuniNombre = resultado.municipio;
                        // Actualizar visualización local
                        deptoDisplay.value = { cod: resultado.codDepto, nombre: resultado.departamento };
                        muniDisplay.value = { cod: resultado.codMuni.slice(-2), nombre: resultado.municipio };
                    }
                });
            } else {
                console.error('❌ vueAppContext.openMunicipio no encontrado.');
            }
        };

        // Nombre visual de profesión (helper UI que persiste en formData)
        const profesionName = Vue.ref(formData._ProfessionName || '');

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        const catalogos = {
            TipoIdentificacion: [
                { id: 1, nombre: 'Cédula de identidad', codigo: 'CI' },
                { id: 2, nombre: 'Cédula de Residencia', codigo: 'CR' },
                { id: 3, nombre: 'Pasaporte', codigo: 'PP' },
                { id: 4, nombre: 'Numero RUC', codigo: 'RUC' },
                { id: 5, nombre: 'Carnet de Notario', codigo: 'CN' },
                { id: 6, nombre: 'Otro', codigo: 'OT' }
            ],
            Generos: [
                { id: 1, nombre: 'Femenino' },
                { id: 2, nombre: 'Masculino' }
            ],
            EstadoCivil: [
                { id: 1, nombre: 'Soltero(a)' },
                { id: 2, nombre: 'Casado(a)' },
                { id: 3, nombre: 'Union de Hecho' }
            ]
        };

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        const pedirProfesionGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'Profesion',
                    label: 'Buscar Profesión...',
                    placeholder: 'Nombre o ID...',
                    onSelect: (val) => {
                        formData.ProfessionCatalog = val.id;    // <- campo DTO (va al backend)
                        formData._ProfessionName = val.name; // <- helper UI (persiste en app.js)
                        profesionName.value = val.name;         // <- actualiza el texto visible ahora
                    }
                });
            } else {
                console.error("❌ Contexto global vueAppContext.openCatalog no encontrado.");
            }
        };

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            if (!formData.TipoIdentificacionCatalog) {
                errors.TipoIdentificacionCatalog = true;
                errorList.push('Tipo de Identificación');
            }
            if (!formData.Identificacion?.trim()) {
                errors.Identificacion = true;
                errorList.push('No. Identificación');
            }
            if (!formData.FirstName?.trim()) {
                errors.FirstName = true;
                errorList.push('Primer Nombre');
            }
            if (!formData.FirstSurName?.trim()) {
                errors.FirstSurName = true;
                errorList.push('Primer Apellido');
            }
            if (!formData.GenderCatalog) {
                errors.GenderCatalog = true;
                errorList.push('Género');
            }
            if (formData.Age === null || formData.Age === undefined || formData.Age === '') {
                errors.Age = true;
                errorList.push('Edad');
            }
            if (!formData.CivilStateCatalog) {
                errors.CivilStateCatalog = true;
                errorList.push('Estado Civil');
            }
            if (!formData.ProfessionCatalog) {
                errors.ProfessionCatalog = true;
                errorList.push('Profesión');
            }
            if (!formData.ResidenceMunicipioCatalog) {
                errors.ResidenceMunicipioCatalog = true;
                errorList.push('Municipio (ID catalog)');
            }
            if (!formData.ResidenceComarca?.trim()) {
                errors.ResidenceComarca = true;
                errorList.push('Comarca');
            }
            if (!formData.ResidenceBarrio?.trim()) {
                errors.ResidenceBarrio = true;
                errorList.push('Barrio');
            }
            if (!formData.ResidenceDireccion?.trim()) {
                errors.ResidenceDireccion = true;
                errorList.push('Dirección');
            }

            if (errorList.length > 0) {
                const msg = '⚠️ Faltan datos obligatorios. Por favor, revise los campos marcados en rojo.';
                if (typeof Android !== 'undefined' && Android.showAlert) {
                    Android.showAlert(msg);
                } else {
                    alert(msg);
                }
                return;
            }

            emit('save', Vue.toRaw(formData));
        };

        return {
            formData,
            errors,
            catalogos,
            profesionName,
            pedirProfesionGlobal,
            deptoDisplay,
            muniDisplay,
            pedirMunicipioGlobal,
            save
        };
    }
};

// Registrar componente
window.app.component('form-propietario-natural', FormPropietarioNatural);
