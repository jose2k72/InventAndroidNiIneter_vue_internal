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
                        <input type="text" v-model="formData.Identificacion" @blur="validarIdentificacion" :placeholder="placeholderIdentificacion">
                        <small v-if="errors.IdentificacionMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.IdentificacionMsg }}</small>
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
                        <input type="text" v-model="formData.FirstName" placeholder="Ej: Juan" @blur="validarNombre('FirstName')">
                        <small v-if="errors.FirstNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.FirstNameMsg }}</small>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.SecondName ? 'red' : 'inherit', fontWeight: errors.SecondName ? 'bold' : 'normal'}">Segundo Nombre</label>
                        <input type="text" v-model="formData.SecondName" placeholder="Ej: Antonio" @blur="validarNombre('SecondName')">
                        <small v-if="errors.SecondNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.SecondNameMsg }}</small>
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstSurName ? 'red' : 'inherit', fontWeight: errors.FirstSurName ? 'bold' : 'normal'}">Primer Apellido *</label>
                        <input type="text" v-model="formData.FirstSurName" placeholder="Ej: Pérez" @blur="validarNombre('FirstSurName')">
                        <small v-if="errors.FirstSurNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.FirstSurNameMsg }}</small>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.SecondSurName ? 'red' : 'inherit', fontWeight: errors.SecondSurName ? 'bold' : 'normal'}">Segundo Apellido</label>
                        <input type="text" v-model="formData.SecondSurName" placeholder="Ej: García" @blur="validarNombre('SecondSurName')">
                        <small v-if="errors.SecondSurNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.SecondSurNameMsg }}</small>
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
                        <input type="number" v-model.number="formData.Age" min="1" max="99" @blur="validarEdad">
                        <small v-if="errors.AgeMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.AgeMsg }}</small>
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0;">🏠 Residencia</h3>
                    <button type="button" class="btn-detect-dir" @click="detectarDireccion">
                        <span>🔍 Autodetectar Residencia</span>
                    </button>
                </div>

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

        // Limpiar "Otro" si se cambia el tipo de identificación y revalidar
        Vue.watch(() => formData.TipoIdentificacionCatalog, (newVal) => {
            if (newVal != 6) {
                formData.TipoIdentificacionOtroText = '';
                delete errors.TipoIdentificacionOtroText;
            }
            if (formData.Identificacion?.trim()) {
                validarIdentificacion();
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
        
        Vue.watch(() => formData.FirstName, (newVal, oldVal) => { if (errors.FirstNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.FirstName; delete errors.FirstNameMsg; } });
        Vue.watch(() => formData.SecondName, (newVal, oldVal) => { if (errors.SecondNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.SecondName; delete errors.SecondNameMsg; } });
        Vue.watch(() => formData.FirstSurName, (newVal, oldVal) => { if (errors.FirstSurNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.FirstSurName; delete errors.FirstSurNameMsg; } });
        Vue.watch(() => formData.SecondSurName, (newVal, oldVal) => { if (errors.SecondSurNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.SecondSurName; delete errors.SecondSurNameMsg; } });
        Vue.watch(() => formData.Age, () => { if (errors.AgeMsg) { delete errors.Age; delete errors.AgeMsg; } });
        Vue.watch(() => formData.Identificacion, (newVal, oldVal) => {
            if (errors.IdentificacionMsg && newVal !== oldVal?.toUpperCase()) {
                delete errors.Identificacion;
                delete errors.IdentificacionMsg;
            }
        });

        const validarEdad = () => {
            if (formData.Age === null || formData.Age === undefined || formData.Age === '') {
                delete errors.AgeMsg;
                return true; 
            }
            if (formData.Age <= 0 || formData.Age > 99) {
                errors.Age = true;
                errors.AgeMsg = 'Debe ser > 0 y máx 2 dígitos';
                return false;
            } else {
                delete errors.Age;
                delete errors.AgeMsg;
                return true;
            }
        };

        const validarNombre = (campo) => {
            let valor = formData[campo];
            if (!valor?.trim()) {
                delete errors[campo + 'Msg'];
                return true; 
            }
            
            valor = valor.trim().toUpperCase();
            formData[campo] = valor;

            const regex = /^[A-ZÁÉÍÓÚÑ\s]+$/;
            if (!regex.test(valor)) {
                errors[campo] = true;
                errors[campo + 'Msg'] = 'Formato inválido (Solo letras)';
                return false;
            } else {
                delete errors[campo];
                delete errors[campo + 'Msg'];
                return true;
            }
        };

        const placeholderIdentificacion = Vue.computed(() => {
            const tipo = formData.TipoIdentificacionCatalog;
            if (tipo == 1) return 'Ej: 000-000000-0000A'; // Cédula
            if (tipo == 2) return 'Ej: 000000000000 (Solo números)'; // Residencia
            if (tipo == 4) return 'Ej: A0000000000000'; // RUC
            return 'Escriba su identificación...'; // Pasaporte, Notario, Otro
        });

        const validarIdentificacion = () => {
            if (!formData.Identificacion?.trim()) {
                delete errors.IdentificacionMsg;
                return true; 
            }

            const tipo = formData.TipoIdentificacionCatalog;
            // Auto-conversión a mayúsculas
            let valor = formData.Identificacion.trim().toUpperCase();
            formData.Identificacion = valor;

            let esValido = true;
            let mensaje = '';

            if (!tipo) return true; 

            if (tipo == 1) { 
                // Cédula: Quitar guiones temporales y evaluar
                const valorSinGuiones = valor.replace(/-/g, '');
                if (/^\d{13}[A-Z]$/.test(valorSinGuiones)) {
                    esValido = true;
                    // Auto-formatear poniendo los guiones
                    formData.Identificacion = valorSinGuiones.replace(/^(\d{3})(\d{6})(\d{4}[A-Z])$/, '$1-$2-$3');
                } else {
                    esValido = false;
                    mensaje = 'Cédula inválida (14 caracteres alfanuméricos requeridos)';
                }
            } else if (tipo == 2) { 
                // Residencia: 12 números exactos
                esValido = /^\d{12}$/.test(valor); 
                mensaje = 'Residencia inválida (Debe tener exactamente 12 números)';
            } else if (tipo == 4) { 
                // RUC: 1 Letra + 12 dígitos
                esValido = /^[A-Z]\d{12}$/.test(valor); 
                mensaje = 'RUC inválido (1 letra seguida de 12 números)';
            } else { 
                // Otros
                esValido = /^[A-Z0-9\-]+$/.test(valor);
                mensaje = 'Formato inválido (Solo letras y números)';
            }

            if (!esValido) {
                errors.Identificacion = true;
                errors.IdentificacionMsg = mensaje;
            } else {
                delete errors.Identificacion;
                delete errors.IdentificacionMsg;
            }
            return esValido;
        };

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
            } else if (!validarIdentificacion()) {
                errorList.push('Formato de Identificación Inválido');
            }
            if (!formData.FirstName?.trim()) {
                errors.FirstName = true;
                errorList.push('Primer Nombre');
            } else if (!validarNombre('FirstName')) {
                errorList.push('Formato Primer Nombre');
            }
            if (formData.SecondName?.trim() && !validarNombre('SecondName')) {
                errorList.push('Formato Segundo Nombre');
            }
            if (!formData.FirstSurName?.trim()) {
                errors.FirstSurName = true;
                errorList.push('Primer Apellido');
            } else if (!validarNombre('FirstSurName')) {
                errorList.push('Formato Primer Apellido');
            }
            if (formData.SecondSurName?.trim() && !validarNombre('SecondSurName')) {
                errorList.push('Formato Segundo Apellido');
            }
            if (!formData.GenderCatalog) {
                errors.GenderCatalog = true;
                errorList.push('Género');
            }
            if (formData.Age === null || formData.Age === undefined || formData.Age === '') {
                errors.Age = true;
                errorList.push('Edad');
            } else if (!validarEdad()) {
                errorList.push('Edad Inválida');
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

        const dirMap = {
            'N': 'Norte', 'S': 'Sur', 'E': 'Este', 'O': 'Oeste',
            'NE': 'Noreste', 'NO': 'Noroeste', 'SE': 'Sureste', 'SO': 'Suroeste'
        };

        const copiarResidencia = (d) => {
            if (d.Direccion) formData.ResidenceDireccion = d.Direccion;
            if (d.Caserio) formData.ResidenceCaserio = d.Caserio;
            if (d.BarrioComarca) formData.ResidenceBarrioComarca = d.BarrioComarca;
            if (d.MunicipioCatalog) {
                formData.ResidenceMunicipioCatalog = d.MunicipioCatalog;
                formData._CodDepto = d._CodDepto || null;
                formData._DeptoNombre = d._DeptoNombre || null;
                formData._MuniNombre = d._MuniNombre || null;
                
                deptoDisplay.value = d._DeptoNombre ? { cod: d._CodDepto || '', nombre: d._DeptoNombre } : null;
                muniDisplay.value = d._MuniNombre ? { cod: String(d.MunicipioCatalog).slice(-2), nombre: d._MuniNombre } : null;
            }
        };

        const detectarDireccion = () => {
            const targetIdObject = (typeof Android !== 'undefined' && Android.getIdObject) 
                ? Android.getIdObject() 
                : (typeof vueAppContext !== 'undefined' && vueAppContext.listData ? vueAppContext.listData.value.find(item => item.Data?.Type === 'Ficha')?.Data?.IdObject : null);

            if (typeof Android !== 'undefined' && Android.getDataInAdjacentPolygons && targetIdObject) {
                try {
                    const rawJson = Android.getDataInAdjacentPolygons(targetIdObject);
                    const adyacentes = JSON.parse(rawJson || "[]");
                    
                    const fichasVecinas = adyacentes
                        .filter(item => {
                            const d = item.Data;
                            return d && d.Type === 'Ficha' && (d.Direccion?.trim() || d.Caserio?.trim() || d.BarrioComarca?.trim());
                        })
                        .map(item => ({
                            data: item.Data,
                            localizacion: item.LocalizacionPredio,
                            direccionRelativa: item.DireccionRelativa
                        }));
                    
                    if (fichasVecinas.length === 0) {
                        Android.showAlert('⚠️ No se encontraron encuestas colindantes con datos de dirección.');
                    } else {
                        let listHtml = '<div class="detect-options-list">';
                        fichasVecinas.forEach((item, idx) => {
                            const d = item.data;
                            const dirFriendly = dirMap[item.direccionRelativa] || item.direccionRelativa;
                            const desc = `${d.Direccion || ''} (${d.Caserio || ''} - ${d.BarrioComarca || ''})`.trim();
                            
                            listHtml += `
                                <button type="button" class="detect-option-item" onclick="window._tempSelectFicha(${idx})">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <strong style="color: #6200EE; font-size: 0.95rem;">📍 Al ${dirFriendly} (${item.localizacion})</strong>
                                    </div>
                                    <span style="font-size: 0.85em; color: #444; line-height: 1.4; white-space: normal; display: block;">
                                        ${d.NombreFinca ? `<strong>Finca:</strong> ${d.NombreFinca}<br>` : ''}
                                        ${desc}
                                    </span>
                                </button>
                            `;
                        });
                        listHtml += '</div>';

                        window._tempSelectFicha = (idx) => {
                            copiarResidencia(fichasVecinas[idx].data);
                            const overlay = document.querySelector('.confirm-modal-overlay');
                            if (overlay) overlay.remove();
                            delete window._tempSelectFicha;
                            Android.showAlert('✅ Dirección de residencia copiada.');
                        };

                        window.showConfirmModal({
                            icon: '🔍',
                            title: 'Elegir Ficha Vecina Colindante',
                            message: listHtml,
                            confirmText: '',
                            cancelText: 'Cancelar',
                            onCancel: () => {
                                delete window._tempSelectFicha;
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error al autodetectar dirección:', e);
                }
            } else {
                alert('La detección de dirección solo está disponible en la tablet con datos colindantes.');
            }
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
            placeholderIdentificacion,
            validarIdentificacion,
            validarNombre,
            validarEdad,
            save,
            detectarDireccion
        };
    }
};

// Registrar componente
window.app.component('form-sujeto-natural', FormSujetoNatural);

// Inyección dinámica de estilos (compartida con ID único)
if (!document.getElementById('style-detect-dir')) {
    const style = document.createElement('style');
    style.id = 'style-detect-dir';
    style.innerHTML = `
        .btn-detect-dir {
            background-color: #f3e5f5;
            color: #6200EE;
            border: 1px solid #6200EE;
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 0.85rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .btn-detect-dir:hover {
            background-color: #6200EE;
            color: white;
        }
        .detect-options-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 15px;
            max-height: 250px;
            overflow-y: auto;
            padding-right: 5px;
        }
        .detect-option-item {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: left;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
            display: block;
        }
        .detect-option-item:hover {
            border-color: #6200EE;
            background-color: #f3e5f5;
        }
        .confirm-modal-message:has(.detect-options-list) + .confirm-modal-buttons #modal-confirm {
            display: none !important;
        }
        .confirm-modal-message:has(.detect-options-list) + .confirm-modal-buttons {
            justify-content: center !important;
        }
    `;
    document.head.appendChild(style);
}
