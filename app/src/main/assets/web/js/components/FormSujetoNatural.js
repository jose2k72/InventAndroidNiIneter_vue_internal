/**
 * Componente FormPropietarioNatural - Vue 3
 * Formulario para el Propietario (Persona Natural) basado en Person.cs de C#
 */

const FormSujetoNatural = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>👤 Propietario Natural / Poseedor</h2>
            
            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
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
                        <input type="text" v-model="formData.Identificacion">
                    </div>
                </div>

                <!-- Especificar Tipo Identificación (cuando es 'Otro' ID 6) -->
                <div v-if="formData.TipoIdentificacionCatalog == 6" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                    <label :style="{color: errors.TipoIdentificacionOtroText ? 'red' : 'inherit', fontWeight: errors.TipoIdentificacionOtroText ? 'bold' : 'normal'}">Especifique Tipo de Identificación *</label>
                    <input type="text" v-model="formData.TipoIdentificacionOtroText" placeholder="Detalle el tipo de identificación...">
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

                <!-- Especificar Profesión (cuando es 'Otro' ID 26) -->
                <div v-if="formData.ProfessionCatalog == 26" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                    <label :style="{color: errors.ProfessionOtroText ? 'red' : 'inherit', fontWeight: errors.ProfessionOtroText ? 'bold' : 'normal'}">Especificar Profesión *</label>
                    <input type="text" v-model="formData.ProfessionOtroText" placeholder="Detalle la profesión u oficio...">
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                       <label>Perfil del Propietario</label>
                       <div class="selector-display" @click="pedirPerfilPropietarioGlobal">
                           <span v-if="perfilPropietarioName" style="color: #1565C0; font-weight: 600;">{{ perfilPropietarioName }}</span>
                           <span v-else style="color: #757575;">Seleccione un perfil...</span>
                           <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                       </div>
                    </div>
                    <div v-if="formData.PerfilPropietarioCatalog" class="form-group">
                        <label :style="{color: errors.PerfilPropietarioCarnet ? 'red' : 'inherit', fontWeight: errors.PerfilPropietarioCarnet ? 'bold' : 'normal'}">Carnet del Perfil *</label>
                        <input type="text" v-model="formData.PerfilPropietarioCarnet" placeholder="No. de Carnet..." :style="{borderColor: errors.PerfilPropietarioCarnet ? '#d32f2f' : '#ccc'}">
                    </div>
                </div>

                <div v-if="formData.PerfilPropietarioCatalog == 7" class="form-group" style="margin-top: 10px;">
                    <label :style="{color: errors.PerfilPropietarioOtroText ? 'red' : 'inherit', fontWeight: errors.PerfilPropietarioOtroText ? 'bold' : 'normal'}">Especifique Perfil *</label>
                    <input type="text" v-model="formData.PerfilPropietarioOtroText" placeholder="Detalle el perfil..." :style="{borderColor: errors.PerfilPropietarioOtroText ? '#d32f2f' : '#ccc'}">
                </div>
            </div>

            <div class="section">
                <h3>⚖️ Derecho sobre la Parcela</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.DerehoParcelaCatalog ? 'red' : 'inherit', fontWeight: errors.DerehoParcelaCatalog ? 'bold' : 'normal'}">Derecho Parcelario *</label>
                        <select v-model.number="formData.DerehoParcelaCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.TipoDerecho" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.NoPersonasSimilarDerecho ? 'red' : 'inherit', fontWeight: errors.NoPersonasSimilarDerecho ? 'bold' : 'normal'}">Número de personas con derecho similar</label>
                        <input type="number" v-model.number="formData.NoPersonasSimilarDerecho" min="0">
                    </div>
                </div>

                <!-- Vínculo con Propietario (Se muestra si NO es Propietario ID 1) -->
                <div v-if="formData.DerehoParcelaCatalog && formData.DerehoParcelaCatalog !== 1" class="form-group sub-section" style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                    <label :style="{color: errors.RelacionConPropietarioCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionConPropietarioCatalog ? 'bold' : 'normal'}">Relación / Vínculo con el Propietario *</label>
                    <div class="selector-display" @click="pedirRelacionPropietarioGlobal">
                        <span v-if="relacionPropietarioName" style="color: #1565C0; font-weight: 600;">{{ relacionPropietarioName }}</span>
                        <span v-else style="color: #757575;">Defina el vínculo (Inquilino, Hijo, etc.)...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
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

                    <!-- Visualización del departamento (readonly) -->
                    <div v-if="deptoDisplay" class="display-box display-box-depto">
                        <span class="cod">{{ deptoDisplay.cod }}</span>
                        <span>{{ deptoDisplay.nombre }}</span>
                    </div>

                    <!-- Visualización del municipio (readonly) -->
                    <div v-if="muniDisplay" class="display-box display-box-muni">
                        <span class="cod">{{ muniDisplay.cod }}</span>
                        <span>{{ muniDisplay.nombre }}</span>
                    </div>
                </div>

                <!-- Caserío en una sola línea -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceCaserio ? 'red' : 'inherit', fontWeight: errors.ResidenceCaserio ? 'bold' : 'normal'}">Caserío</label>
                    <input type="text" v-model="formData.ResidenceCaserio">
                </div>

                <!-- Barrio/Comarca en una sola línea -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceBarrioComarca ? 'red' : 'inherit', fontWeight: errors.ResidenceBarrioComarca ? 'bold' : 'normal'}">Barrio/Comarca</label>
                    <input type="text" v-model="formData.ResidenceBarrioComarca">
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

        // Nombre visual de profesión y perfil (helpers UI)
        const profesionName = Vue.ref(formData._ProfessionName || '');
        const perfilPropietarioName = Vue.ref(formData._PerfilPropietarioName || '');
        const relacionPropietarioName = Vue.ref(formData._RelacionPropietarioName || '');

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        // Catálogos reactivos (Se cargan dinámicamente de /data/)
        const catalogos = Vue.reactive({
            TipoIdentificacion: [],
            Generos: [],
            EstadoCivil: [],
            TipoDerecho: []
        });

        // Función para desacoplar catálogos
        const cargarCatalogos = async () => {
            const mapeo = {
                TipoIdentificacion: 'TipoIdentificacion.json',
                Generos: 'Genero.json',
                EstadoCivil: 'EstadoCivil.json',
                TipoDerecho: 'TipoDerecho.json'
            };

            for (const [key, fileName] of Object.entries(mapeo)) {
                try {
                    let data = null;
                    if (window.Android && window.Android.loadCatalogJson) {
                        const str = window.Android.loadCatalogJson(fileName);
                        if (str) data = JSON.parse(str);
                    }
                    if (!data) {
                        const response = await fetch('data/' + fileName);
                        if (response.ok) data = await response.json();
                    }

                    if (data) {
                        // Inyectar y normalizar IDs numéricos para v-model.number
                        catalogos[key] = data.map(item => ({
                            ...item,
                            id: isNaN(parseInt(item.id)) ? item.id : parseInt(item.id)
                        }));
                    }
                } catch (e) {
                    console.error(`❌ Error al desacoplar catálogo ${fileName}:`, e);
                }
            }
        };

        Vue.onMounted(() => {
            cargarCatalogos();
        });

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        const pedirProfesionGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'Profesion',
                    label: 'Buscar Profesión...',
                    placeholder: 'Nombre o ID...',
                    onSelect: (val) => {
                        const id = parseInt(val.id);
                        formData.ProfessionCatalog = id;    // <- Asegurar tipo número
                        formData._ProfessionName = val.name;
                        profesionName.value = val.name;

                        if (id !== 26) {
                            formData.ProfessionOtroText = '';
                            delete errors.ProfessionOtroText;
                        }
                    }
                });
            } else {
                console.error("❌ Contexto global vueAppContext.openCatalog no encontrado.");
            }
        };

        const pedirRelacionPropietarioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'RelacionInformantePropietario',
                    label: 'Relación con el Propietario...',
                    onSelect: (val) => {
                        formData.RelacionConPropietarioCatalog = parseInt(val.id);
                        formData._RelacionPropietarioName = val.name;
                        relacionPropietarioName.value = val.name;
                    }
                });
            }
        };

        const pedirPerfilPropietarioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'PerfilPropietario',
                    label: 'Perfil del Propietario...',
                    onSelect: (val) => {
                        const id = parseInt(val.id);
                        formData.PerfilPropietarioCatalog = id;
                        formData._PerfilPropietarioName = val.name;
                        perfilPropietarioName.value = val.name;

                        if (id !== 7) {
                            formData.PerfilPropietarioOtroText = '';
                            delete errors.PerfilPropietarioOtroText;
                        }
                    }
                });
            } else {
                console.error("❌ Contexto global vueAppContext.openCatalog no encontrado.");
            }
        };

        Vue.watch(() => formData.ProfessionCatalog, (newVal) => {
            if (newVal !== 26) {
                formData.ProfessionOtroText = '';
                delete errors.ProfessionOtroText;
            }
        });

        // Limpiar "Otro" si se cambia el tipo de identificación
        Vue.watch(() => formData.TipoIdentificacionCatalog, (newVal) => {
            if (newVal != 6) {
                formData.TipoIdentificacionOtroText = '';
                delete errors.TipoIdentificacionOtroText;
            }
        });

        Vue.watch(() => formData.DerehoParcelaCatalog, (newVal) => {
            if (newVal === 1) {
                formData.RelacionConPropietarioCatalog = 0;
                formData._RelacionPropietarioName = '';
                relacionPropietarioName.value = '';
                delete errors.RelacionConPropietarioCatalog;
            }
        });

        Vue.watch(() => formData.PerfilPropietarioCatalog, (newVal) => {
            if (!newVal) {
                formData.PerfilPropietarioOtroText = '';
                formData.PerfilPropietarioCarnet = '';
                delete errors.PerfilPropietarioOtroText;
                delete errors.PerfilPropietarioCarnet;
            } else if (newVal !== 7) {
                formData.PerfilPropietarioOtroText = '';
                delete errors.PerfilPropietarioOtroText;
            }
        });

        // Limpieza de errores al escribir
        Vue.watch(() => formData.PerfilPropietarioOtroText, (val) => { if (val?.trim()) delete errors.PerfilPropietarioOtroText; });
        Vue.watch(() => formData.PerfilPropietarioCarnet, (val) => { if (val?.trim()) delete errors.PerfilPropietarioCarnet; });
        Vue.watch(() => formData.ResidenceCaserio, (val) => { if (val?.trim()) { delete errors.ResidenceCaserio; delete errors.ResidenceBarrioComarca; } });
        Vue.watch(() => formData.ResidenceBarrioComarca, (val) => { if (val?.trim()) { delete errors.ResidenceCaserio; delete errors.ResidenceBarrioComarca; } });

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            if (!formData.TipoIdentificacionCatalog) {
                errors.TipoIdentificacionCatalog = true;
                errorList.push('Tipo de Identificación');
            }
            if (formData.TipoIdentificacionCatalog == 6 && !formData.TipoIdentificacionOtroText?.trim()) {
                errors.TipoIdentificacionOtroText = true;
                errorList.push('Especificar Tipo de Identificación');
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
            if (formData.Age === null || formData.Age === undefined || formData.Age === '' || formData.Age < 0) {
                errors.Age = true;
                errorList.push('Edad (debe ser >= 0)');
            }
            if (!formData.CivilStateCatalog) {
                errors.CivilStateCatalog = true;
                errorList.push('Estado Civil');
            }
            if (!formData.ProfessionCatalog) {
                errors.ProfessionCatalog = true;
                errorList.push('Profesión');
            }
            if (formData.ProfessionCatalog == 26 && !formData.ProfessionOtroText?.trim()) {
                errors.ProfessionOtroText = true;
                errorList.push('Especificar Profesión');
            }
            if (formData.PerfilPropietarioCatalog) {
                if (!formData.PerfilPropietarioCarnet?.trim()) {
                    errors.PerfilPropietarioCarnet = true;
                    errorList.push('Carnet del Perfil');
                }
                if (formData.PerfilPropietarioCatalog == 7 && !formData.PerfilPropietarioOtroText?.trim()) {
                    errors.PerfilPropietarioOtroText = true;
                    errorList.push('Especificar Perfil');
                }
            }
            if (!formData.ResidenceMunicipioCatalog) {
                errors.ResidenceMunicipioCatalog = true;
                errorList.push('Municipio (ID catalog)');
            }
            if (!formData.ResidenceCaserio?.trim() && !formData.ResidenceBarrioComarca?.trim()) {
                errors.ResidenceCaserio = true;
                errors.ResidenceBarrioComarca = true;
                errorList.push('Caserío o Barrio/Comarca');
            }
            if (!formData.ResidenceDireccion?.trim()) {
                errors.ResidenceDireccion = true;
                errorList.push('Dirección');
            }

            // Validaciones de Derecho y Tenencia
            if (!formData.DerehoParcelaCatalog) {
                errors.DerehoParcelaCatalog = true;
                errorList.push('Derecho Parcelario');
            }
            if (formData.NoPersonasSimilarDerecho < 0) {
                errors.NoPersonasSimilarDerecho = true;
                errorList.push('Número de personas con derecho similar (mínimo 0)');
            }
            if (formData.DerehoParcelaCatalog && formData.DerehoParcelaCatalog !== 1) {
                if (!formData.RelacionConPropietarioCatalog || formData.RelacionConPropietarioCatalog == 0) {
                    errors.RelacionConPropietarioCatalog = true;
                    errorList.push('Relación con el Propietario');
                }
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
            perfilPropietarioName,
            pedirPerfilPropietarioGlobal,
            deptoDisplay,
            muniDisplay,
            pedirMunicipioGlobal,
            relacionPropietarioName,
            pedirRelacionPropietarioGlobal,
            save
        };
    }
};

// Registrar componente
window.app.component('form-sujeto-natural', FormSujetoNatural);
