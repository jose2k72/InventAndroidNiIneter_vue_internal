/**
 * Componente FormEntrevistado - Vue 3
 * Formulario para el Entrevistado basado en Person.cs y Entrevistado.cs de C#
 */

const FormEntrevistado = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🎤 Entrevistado / Informante</h2>

            <div class="section">
                <h3>📋 Relación</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.RelacionConParcelaCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionConParcelaCatalog ? 'bold' : 'normal'}">Relación con la parcela *</label>
                        <select v-model.number="formData.RelacionConParcelaCatalog">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.RelacionInformanteParcela" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.RelacionInformantePropietarioCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionInformantePropietarioCatalog ? 'bold' : 'normal'}">Relación con el propietario *</label>
                        <!-- Selector que llama a la vista principal -->
                        <div class="selector-display" 
                             @click="formData.RelacionConParcelaCatalog !== 1 && pedirRelacionPropietarioGlobal()" 
                             :style="{
                                 borderColor: errors.RelacionInformantePropietarioCatalog ? '#d32f2f' : '#ccc',
                                 backgroundColor: formData.RelacionConParcelaCatalog === 1 ? '#f5f5f5' : 'white',
                                 opacity: formData.RelacionConParcelaCatalog === 1 ? 0.6 : 1,
                                 cursor: formData.RelacionConParcelaCatalog === 1 ? 'not-allowed' : 'pointer'
                             }">
                            <span v-if="formData.RelacionConParcelaCatalog === 1" style="color: #9e9e9e;">No aplica (es Propietario)</span>
                            <span v-else-if="relacionPropietarioName" style="color: #1565C0; font-weight: 600;">{{ relacionPropietarioName }}</span>
                            <span v-else style="color: #757575;">Seleccione relación...</span>
                            <span v-if="formData.RelacionConParcelaCatalog !== 1" style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                        </div>
                    </div>
                </div>
            </div>
            
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
        const relacionPropietarioName = Vue.ref(formData._RelacionPropietarioName || '');

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        const catalogos = {
            RelacionInformanteParcela: [
                { id: 1, nombre: 'Propietario(a)' },
                { id: 2, nombre: 'Poseedor(a)' },
                { id: 3, nombre: 'Representante' },
                { id: 4, nombre: 'Particular' },
                { id: 5, nombre: 'Otro' }
            ],
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

        // Escuchar cambios en Relación con la parcela
        Vue.watch(() => formData.RelacionConParcelaCatalog, (newVal) => {
            if (newVal === 1) { // 1 = Propietario(a)
                formData.RelacionInformantePropietarioCatalog = 0;
                formData._RelacionPropietarioName = '';
                relacionPropietarioName.value = '';
                delete errors.RelacionInformantePropietarioCatalog;
            }
        });

        const pedirRelacionPropietarioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'RelacionInformantePropietario',
                    label: 'Buscar Relación...',
                    placeholder: 'Nombre o ID...',
                    onSelect: (val) => {
                        formData.RelacionInformantePropietarioCatalog = val.id;    // <- campo DTO
                        formData._RelacionPropietarioName = val.name; // <- helper UI
                        relacionPropietarioName.value = val.name;         // <- actualiza vista local
                    }
                });
            } else {
                console.error("❌ Contexto global vueAppContext.openCatalog no encontrado.");
            }
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

            if (!formData.RelacionConParcelaCatalog) {
                errors.RelacionConParcelaCatalog = true;
                errorList.push('Relación con la parcela');
            }
            // Solo validar relación con propietario si el informante NO es el propietario de la parcela
            if (formData.RelacionConParcelaCatalog !== 1 && !formData.RelacionInformantePropietarioCatalog) {
                errors.RelacionInformantePropietarioCatalog = true;
                errorList.push('Relación con el propietario');
            }
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
            relacionPropietarioName,
            pedirRelacionPropietarioGlobal,
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
window.app.component('form-entrevistado', FormEntrevistado);
