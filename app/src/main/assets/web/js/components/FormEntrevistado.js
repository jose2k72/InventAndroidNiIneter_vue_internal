/**
 * Componente FormEntrevistado - Vue 3
 * Formulario para el Entrevistado basado en Person.cs y Entrevistado.cs de C#
 */

const FormEntrevistado = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🎤 Entrevistado / Informante</h2>

            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>

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

                <!-- Especificar Relación (cuando es 'Otro' ID 5) -->
                <div v-if="formData.RelacionConParcelaCatalog == 5" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                    <label :style="{color: errors.RelacionConParcelaOtroText ? 'red' : 'inherit', fontWeight: errors.RelacionConParcelaOtroText ? 'bold' : 'normal'}">Especificar Relación *</label>
                    <input type="text" v-model="formData.RelacionConParcelaOtroText" placeholder="Detalle la relación con la parcela...">
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
            </div>

            <div class="section" v-if="formData.RelacionConParcelaCatalog === 1">
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

        // Nombre visual de profesión (helper UI que persiste en formData)
        const profesionName = Vue.ref(formData._ProfessionName || '');
        const relacionPropietarioName = Vue.ref(formData._RelacionPropietarioName || '');

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        // Catálogos reactivos (Se cargan dinámicamente de /data/)
        const catalogos = Vue.reactive({
            RelacionInformanteParcela: [],
            TipoIdentificacion: [],
            Generos: [],
            EstadoCivil: []
        });

        // Función centralizada para desacoplar catálogos del código
        const cargarCatalogos = async () => {
            const mapeo = {
                RelacionInformanteParcela: 'RelacionInformanteParcela.json',
                TipoIdentificacion: 'TipoIdentificacion.json',
                Generos: 'Genero.json',
                EstadoCivil: 'EstadoCivil.json'
            };

            for (const [key, fileName] of Object.entries(mapeo)) {
                try {
                    let data = null;
                    // Intentar vía Bridge Android (Offline)
                    if (window.Android && window.Android.loadCatalogJson) {
                        const str = window.Android.loadCatalogJson(fileName);
                        if (str) data = JSON.parse(str);
                    }
                    // Fallback a Fetch (Desarrollo / Navegador)
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

        // Cargar en el momento del montaje
        Vue.onMounted(() => {
            cargarCatalogos();
        });

        // Escuchar cambios en Relación con la parcela
        Vue.watch(() => formData.RelacionConParcelaCatalog, (newVal) => {
            if (newVal === 1) { // 1 = Propietario(a)
                formData.RelacionInformantePropietarioCatalog = 0;
                formData._RelacionPropietarioName = '';
                relacionPropietarioName.value = '';
                delete errors.RelacionInformantePropietarioCatalog;
            } else {
                formData.ResidenceMunicipioCatalog = null;
                formData._CodDepto = null;
                formData._DeptoNombre = null;
                formData._MuniNombre = null;
                formData.ResidenceCaserio = '';
                formData.ResidenceBarrioComarca = '';
                formData.ResidenceDireccion = '';
                deptoDisplay.value = null;
                muniDisplay.value = null;
                delete errors.ResidenceMunicipioCatalog;
                delete errors.ResidenceCaserio;
                delete errors.ResidenceBarrioComarca;
                delete errors.ResidenceDireccion;
            }
            if (newVal !== 5) {
                formData.RelacionConParcelaOtroText = '';
                delete errors.RelacionConParcelaOtroText;
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

        Vue.watch(() => formData.Identificacion, (newVal, oldVal) => {
            if (errors.IdentificacionMsg && newVal !== oldVal?.toUpperCase()) {
                delete errors.Identificacion;
                delete errors.IdentificacionMsg;
            }
        });

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

        // Limpieza de errores de ubicación compartida
        Vue.watch(() => formData.ResidenceCaserio, (val) => { if (val?.trim()) { delete errors.ResidenceCaserio; delete errors.ResidenceBarrioComarca; } });
        Vue.watch(() => formData.ResidenceBarrioComarca, (val) => { if (val?.trim()) { delete errors.ResidenceCaserio; delete errors.ResidenceBarrioComarca; } });
        
        Vue.watch(() => formData.FirstName, (newVal, oldVal) => { if (errors.FirstNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.FirstName; delete errors.FirstNameMsg; } });
        Vue.watch(() => formData.SecondName, (newVal, oldVal) => { if (errors.SecondNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.SecondName; delete errors.SecondNameMsg; } });
        Vue.watch(() => formData.FirstSurName, (newVal, oldVal) => { if (errors.FirstSurNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.FirstSurName; delete errors.FirstSurNameMsg; } });
        Vue.watch(() => formData.SecondSurName, (newVal, oldVal) => { if (errors.SecondSurNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.SecondSurName; delete errors.SecondSurNameMsg; } });
        Vue.watch(() => formData.Age, () => { if (errors.AgeMsg) { delete errors.Age; delete errors.AgeMsg; } });

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

        const pedirRelacionPropietarioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'RelacionInformantePropietario',
                    label: 'Buscar Relación...',
                    placeholder: 'Nombre o ID...',
                    onSelect: (val) => {
                        formData.RelacionInformantePropietarioCatalog = parseInt(val.id);    // <- numérico
                        formData._RelacionPropietarioName = val.name;
                        relacionPropietarioName.value = val.name;
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
                        const id = parseInt(val.id);
                        formData.ProfessionCatalog = id;
                        formData._ProfessionName = val.name;
                        profesionName.value = val.name;

                        // Limpiar "Otro" si ya no es el ID 26 (Otro)
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

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            if (!formData.RelacionConParcelaCatalog) {
                errors.RelacionConParcelaCatalog = true;
                errorList.push('Relación con la parcela');
            }
            if (formData.RelacionConParcelaCatalog == 5 && !formData.RelacionConParcelaOtroText?.trim()) {
                errors.RelacionConParcelaOtroText = true;
                errorList.push('Especificar Relación con la parcela');
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
            if (formData.RelacionConParcelaCatalog === 1) {
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
            relacionPropietarioName,
            pedirRelacionPropietarioGlobal,
            profesionName,
            pedirProfesionGlobal,
            deptoDisplay,
            muniDisplay,
            pedirMunicipioGlobal,
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
window.app.component('form-entrevistado', FormEntrevistado);
