/**
 * Componente FormAcera - Vue 3
 * Formulario de evaluación de aceras con cálculos automáticos
 */

const FormAcera = {
    template: `
        <div class="form-container">
            <style>
                .text-error { color: red !important; font-weight: bold; }
            </style>
            <h2>📋 Formulario Acera</h2>
            
            <!-- Información de ubicación -->
            <div class="section">
                <h3>📍 Ubicación</h3>
                
                <div class="form-group">
                    <label>Localización</label>
                    <input type="text" :value="formData.Localizacion" readonly class="input-readonly">
                </div>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>CRTM05 Este</label>
                        <input type="number" :value="formData.LocalProj_East" readonly class="input-readonly">
                    </div>
                    <div class="form-group">
                        <label>CRTM05 Norte</label>
                        <input type="number" :value="formData.LocalProj_North" readonly class="input-readonly">
                    </div>
                </div>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>Latitud</label>
                        <input type="number" :value="formData.LatLng_Lat" readonly class="input-readonly">
                    </div>
                    <div class="form-group">
                        <label>Longitud</label>
                        <input type="number" :value="formData.LatLng_Lng" readonly class="input-readonly">
                    </div>
                </div>
            </div>
            
            <!-- Datos generales -->
            <div class="section">
                <h3>📝 Datos Generales</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.CodigoCamino ? 'red' : 'inherit', fontWeight: errors.CodigoCamino ? 'bold' : 'normal'}">Código de Camino *</label>
                    <input type="text" v-model="formData.CodigoCamino" readonly class="input-readonly">
                </div>
                
                <!-- NumBoleta oculto (relleno automático) -->
                <input type="hidden" v-model="formData.NumBoleta">
                
                <div class="form-group">
                    <label :style="{color: errors.Distrito ? 'red' : 'inherit', fontWeight: errors.Distrito ? 'bold' : 'normal'}">Distrito *</label>
                    <select v-model="formData.Distrito">
                        <option value="">Seleccione una opción</option>
                        <option value="1">1. GUADALUPE</option>
                        <option value="2">2. SAN FRANCISCO</option>
                        <option value="3">3. CALLE BLANCOS</option>
                        <option value="4">4. MATA DE PLATANO</option>
                        <option value="5">5. IPIS</option>
                        <option value="6">6. RANCHO REDONDO</option>
                        <option value="7">7. PURRAL</option>
                    </select>
                </div>
            </div>
            
            <!-- Dimensiones -->
            <div class="section">
                <h3>📐 Dimensiones del Tramo</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.Longitud ? 'red' : 'inherit', fontWeight: errors.Longitud ? 'bold' : 'normal'}">Longitud (m) *</label>
                        <input type="number" step="0.01" v-model.number="formData.Longitud" 
                               @input="calcularArea" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Ancho ? 'red' : 'inherit', fontWeight: errors.Ancho ? 'bold' : 'normal'}">Ancho (m) *</label>
                        <input type="number" step="0.01" v-model.number="formData.Ancho" 
                               @input="calcularArea" placeholder="0.00">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Área (m²)</label>
                    <input type="number" :value="formData.Area" readonly class="input-readonly">
                </div>
            </div>
            
            <!-- Evaluación Estructural -->
            <div class="section">
                <h3>🔧 Evaluación Estructural</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.EstructGrietas ? 'red' : 'inherit', fontWeight: errors.EstructGrietas ? 'bold' : 'normal'}">Deterioro por grietas y aberturas *</label>
                    <select v-model="formData.EstructGrietas" @change="calcularTotalEstruct">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Grieta no afecta la circulación</option>
                        <option value="3">Grieta 10mm - 25mm</option>
                        <option value="5">Grieta > 25mm</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.EstructHuecos ? 'red' : 'inherit', fontWeight: errors.EstructHuecos ? 'bold' : 'normal'}">Presencia de huecos *</label>
                    <select v-model="formData.EstructHuecos" @change="calcularTotalEstruct">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Diámetro < 10cm y profundidad < 10mm</option>
                        <option value="2">Diámetro 10cm - 30cm o profundidad 10mm - 30mm</option>
                        <option value="3">Diámetro > 30cm o profundidad > 30mm</option>
                        <option value="5">Diámetro > 30cm y profundidad > 30mm</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.EstructDesnud ? 'red' : 'inherit', fontWeight: errors.EstructDesnud ? 'bold' : 'normal'}">Desnudamiento de superficie *</label>
                    <select v-model="formData.EstructDesnud" @change="calcularTotalEstruct">
                        <option value="">Seleccione una opción</option>
                        <option value="0">No afecta la circulación</option>
                        <option value="4">Moderado, deterioro superficie</option>
                        <option value="5">Severo, agregado suelto</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.EstructEscalon ? 'red' : 'inherit', fontWeight: errors.EstructEscalon ? 'bold' : 'normal'}">Escalonamiento de losas *</label>
                    <select v-model="formData.EstructEscalon" @change="calcularTotalEstruct">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Escalonamiento < 2cm</option>
                        <option value="4">Escalonamiento 2cm - 5cm</option>
                        <option value="7">Escalonamiento > 5cm</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.EstructDrenaje ? 'red' : 'inherit', fontWeight: errors.EstructDrenaje ? 'bold' : 'normal'}">Acumulación de agua/drenaje *</label>
                    <select v-model="formData.EstructDrenaje" @change="calcularTotalEstruct">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Charco o sedimento < 10cm</option>
                        <option value="2">Charco o sedimento 10cm - 30cm</option>
                        <option value="3">Charco o sedimento > 30cm</option>
                    </select>
                </div>
                
                <div class="total-row">
                    <span class="label">Total Estructural:</span>
                    <span class="value">{{ formData.TotalEstruct }}</span>
                </div>
            </div>
            
            <!-- Evaluación Funcional -->
            <div class="section">
                <h3>⚙️ Evaluación Funcional</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.FuncPendTransv ? 'red' : 'inherit', fontWeight: errors.FuncPendTransv ? 'bold' : 'normal'}">Pendiente transversal *</label>
                    <select v-model="formData.FuncPendTransv" @change="calcularTotalFunc">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Pendiente < 2%</option>
                        <option value="2">Pendiente 2% - 3%</option>
                        <option value="4">Pendiente 3% - 5%</option>
                        <option value="5">Pendiente > 5%</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.FuncPendLong ? 'red' : 'inherit', fontWeight: errors.FuncPendLong ? 'bold' : 'normal'}">Pendiente longitudinal *</label>
                    <select v-model="formData.FuncPendLong" @change="calcularTotalFunc">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Pendiente < 2%</option>
                        <option value="0">Pendiente 2% - 5%</option>
                        <option value="2">Pendiente 5% - 8%</option>
                        <option value="5">Pendiente > 8%</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.FuncAnchoLibre ? 'red' : 'inherit', fontWeight: errors.FuncAnchoLibre ? 'bold' : 'normal'}">Ancho libre *</label>
                    <select v-model="formData.FuncAnchoLibre" @change="calcularTotalFunc">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Ancho entre 1.5m - 1.8m</option>
                        <option value="4">Ancho entre 1.2m - 1.5m</option>
                        <option value="5">Ancho < 1.2m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.FuncObstrucion ? 'red' : 'inherit', fontWeight: errors.FuncObstrucion ? 'bold' : 'normal'}">Obstrucciones *</label>
                    <select v-model="formData.FuncObstrucion" @change="calcularTotalFunc">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Ancho reducido a 1.8m</option>
                        <option value="2">Ancho reducido a 1.5m</option>
                        <option value="3">Ancho reducido < 1.5m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.FuncAccesibilidad ? 'red' : 'inherit', fontWeight: errors.FuncAccesibilidad ? 'bold' : 'normal'}">Accesibilidad (rampas, guías) *</label>
                    <select v-model="formData.FuncAccesibilidad" @change="calcularTotalFunc">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Existen, no cumplen especificaciones</option>
                        <option value="3">Faltan algunas en el tramo</option>
                        <option value="5">No existen en el tramo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.FuncRejillas ? 'red' : 'inherit', fontWeight: errors.FuncRejillas ? 'bold' : 'normal'}">Tapas y rejillas *</label>
                    <select v-model="formData.FuncRejillas" @change="calcularTotalFunc">
                        <option value="">Seleccione una opción</option>
                        <option value="0">Buena condición, no afectan circulación</option>
                        <option value="1">Regular condición, abertura 5cm - 8cm</option>
                        <option value="2">Faltan algunas, abertura > 8cm</option>
                    </select>
                </div>
                
                <div class="total-row">
                    <span class="label">Total Funcional:</span>
                    <span class="value">{{ formData.TotalFunc.toFixed(2) }}</span>
                </div>
            </div>
            
            <!-- Factor de Actividad -->
            <div class="section">
                <h3>🏃 Factor de Actividad</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxEscuelas ? 'red' : 'inherit', fontWeight: errors.ActividadProxEscuelas ? 'bold' : 'normal'}">Proximidad a escuelas *</label>
                    <select v-model="formData.ActividadProxEscuelas" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 2000m</option>
                        <option value="3">1000m - 2000m</option>
                        <option value="6">500m - 1000m</option>
                        <option value="10">< 500m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxServGob ? 'red' : 'inherit', fontWeight: errors.ActividadProxServGob ? 'bold' : 'normal'}">Proximidad a servicios del gobierno *</label>
                    <select v-model="formData.ActividadProxServGob" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 500m</option>
                        <option value="10">< 500m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxTerminalBus ? 'red' : 'inherit', fontWeight: errors.ActividadProxTerminalBus ? 'bold' : 'normal'}">Proximidad a terminales de bus *</label>
                    <select v-model="formData.ActividadProxTerminalBus" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 500m</option>
                        <option value="5">300m - 500m</option>
                        <option value="10">< 300m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxCentroRecreacion ? 'red' : 'inherit', fontWeight: errors.ActividadProxCentroRecreacion ? 'bold' : 'normal'}">Proximidad a parques/recreación *</label>
                    <select v-model="formData.ActividadProxCentroRecreacion" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 1000m</option>
                        <option value="3">500m - 1000m</option>
                        <option value="5">< 500m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxHospital ? 'red' : 'inherit', fontWeight: errors.ActividadProxHospital ? 'bold' : 'normal'}">Proximidad a hospitales *</label>
                    <select v-model="formData.ActividadProxHospital" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 1000m</option>
                        <option value="3">500m - 1000m</option>
                        <option value="5">< 500m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxGenTransito ? 'red' : 'inherit', fontWeight: errors.ActividadProxGenTransito ? 'bold' : 'normal'}">Generadores de tránsito peatonal *</label>
                    <select v-model="formData.ActividadProxGenTransito" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 500m</option>
                        <option value="5">< 500m</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label :style="{color: errors.ActividadProxAltaPoblacion ? 'red' : 'inherit', fontWeight: errors.ActividadProxAltaPoblacion ? 'bold' : 'normal'}">Zonas de alta población *</label>
                    <select v-model="formData.ActividadProxAltaPoblacion" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="0">> 500m</option>
                        <option value="5">< 500m</option>
                    </select>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.ClasificacionVial ? 'red' : 'inherit', fontWeight: errors.ClasificacionVial ? 'bold' : 'normal'}">Clasificación vial *</label>
                    <select v-model="formData.ClasificacionVial" @change="calcularTotalActividad">
                        <option value="">Seleccione una opción</option>
                        <option value="5">Terciario / Vol. Peat. Bajo</option>
                        <option value="7">Secundario / Vol. Peat. Medio</option>
                        <option value="10">Primario / Vol. Peat. Alto</option>
                    </select>
                </div>
                
                <div class="total-row">
                    <span class="label">Total Actividad:</span>
                    <span class="value">{{ formData.TotalActividad.toFixed(2) }}</span>
                </div>
            </div>
            
            <!-- Índice de Condición -->
            <div class="result-box">
                <div class="label">Índice de Condición de Aceras</div>
                <div class="value">{{ formData.IndiceCondicionAceras.toFixed(2) }}</div>
            </div>
            
            <!-- Datos adicionales -->
            <div class="section">
                <h3>📋 Datos Adicionales</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.CondicionMeteorol ? 'red' : 'inherit', fontWeight: errors.CondicionMeteorol ? 'bold' : 'normal'}">Condición Meteorológica *</label>
                    <select v-model="formData.CondicionMeteorol">
                        <option value="">Seleccione una opción</option>
                        <option value="1">Despejado</option>
                        <option value="2">Nublado</option>
                        <option value="3">Lluvioso</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.Observaciones" rows="3" 
                              placeholder="Ingrese observaciones adicionales..."></textarea>
                </div>
            </div>
            
            <!-- Fotografías -->
            <button type="button" class="btn btn-camera" @click="capturarFoto">
                📷 CAPTURAR FOTO
            </button>
            
            <!-- Lista de fotos capturadas -->
            <div v-if="fotos && fotos.length > 0" class="section">
                <h3>📸 Fotografías ({{ fotos.length }})</h3>
                <div class="photos-grid">
                    <div v-for="(foto, index) in fotos" :key="index" class="photo-item">
                        <img :src="foto.data || 'placeholder.jpg'" 
                             :alt="'Foto ' + (index + 1)"
                             class="photo-thumbnail">
                        <div class="photo-info">
                            <span class="photo-name">{{ foto.name }}</span>
                            <button type="button" 
                                    class="btn btn-delete" 
                                    @click="eliminarFoto(foto.name)"
                                    title="Eliminar foto">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Botones de acción -->
            <div class="btn-group">
                <button type="button" class="btn btn-success" @click="guardar">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
        </div>
    `,

    props: {
        data: { type: Object, required: true },
        localizacion: { type: String, default: '' },
        latLng: { type: Object, default: () => ({ lat: 0, lng: 0 }) },
        localProj: { type: Object, default: () => ({ east: 0, north: 0 }) },
        fotos: { type: Array, default: () => [] }
    },

    emits: ['save', 'cancel', 'camera'],

    setup(props, { emit }) {
        const formData = Vue.reactive({
            ...props.data,
            Localizacion: props.localizacion,
            LocalProj_East: props.localProj.east,
            LocalProj_North: props.localProj.north,
            LatLng_Lat: props.latLng.lat,
            LatLng_Lng: props.latLng.lng
        });

        // Estado de errores de validación
        const errors = Vue.reactive({});

        // Watch: Sincronizar campo Imagenes cuando cambian las fotos
        Vue.watch(() => props.fotos, (newFotos) => {
            const nombres = newFotos.map(f => f.name).join(',');
            formData.Imagenes = nombres;
            console.log('🔄 FormAcera: Campo Imagenes actualizado:', formData.Imagenes);
        }, { deep: true });

        // Calcular área
        const calcularArea = () => {
            const long = formData.Longitud || 0;
            const ancho = formData.Ancho || 0;
            formData.Area = long * ancho;
            calcularTotalFunc();
        };

        // Calcular total estructural
        const calcularTotalEstruct = () => {
            const fields = ['EstructGrietas', 'EstructHuecos', 'EstructDesnud', 'EstructEscalon', 'EstructDrenaje'];
            formData.TotalEstruct = fields.reduce((sum, field) => {
                return sum + (parseInt(formData[field]) || 0);
            }, 0);
            calcularIndice();
        };

        // Calcular total funcional
        const calcularTotalFunc = () => {
            const fields = ['FuncPendTransv', 'FuncPendLong', 'FuncAnchoLibre', 'FuncObstrucion', 'FuncAccesibilidad', 'FuncRejillas'];
            const sum = fields.reduce((total, field) => {
                return total + (parseInt(formData[field]) || 0);
            }, 0);

            const longitud = formData.Longitud || 1;
            formData.TotalFunc = longitud > 0 ? (sum / longitud) * 15 : 0;
            calcularIndice();
        };

        // Calcular total actividad
        const calcularTotalActividad = () => {
            const fields = ['ActividadProxEscuelas', 'ActividadProxServGob', 'ActividadProxTerminalBus',
                'ActividadProxCentroRecreacion', 'ActividadProxHospital', 'ActividadProxGenTransito',
                'ActividadProxAltaPoblacion', 'ClasificacionVial'];
            const sum = fields.reduce((total, field) => {
                return total + (parseInt(formData[field]) || 0);
            }, 0);

            formData.TotalActividad = 1 + (sum / 60);
            calcularIndice();
        };

        // Calcular índice de condición
        const calcularIndice = () => {
            formData.IndiceCondicionAceras = 100 - (formData.TotalActividad * (formData.TotalEstruct + formData.TotalFunc));
        };

        // Validar formulario
        const validar = () => {
            const required = ['CodigoCamino', 'NumBoleta', 'Distrito', 'Longitud', 'Ancho',
                'EstructGrietas', 'EstructHuecos', 'EstructDesnud', 'EstructEscalon', 'EstructDrenaje',
                'FuncPendTransv', 'FuncPendLong', 'FuncAnchoLibre', 'FuncObstrucion', 'FuncAccesibilidad', 'FuncRejillas',
                'ActividadProxEscuelas', 'ActividadProxServGob', 'ActividadProxTerminalBus',
                'ActividadProxCentroRecreacion', 'ActividadProxHospital', 'ActividadProxGenTransito',
                'ActividadProxAltaPoblacion', 'ClasificacionVial', 'CondicionMeteorol'];

            let isValid = true;

            // Reiniciar errores
            Object.keys(errors).forEach(key => errors[key] = false);

            for (const field of required) {
                const value = formData[field];
                if (value === '' || value === null || value === undefined) {
                    errors[field] = true; // Marcar error visual
                    console.warn(`⚠️ Campo requerido faltante: ${field}`);
                    isValid = false;
                }
            }

            // Validaciones numéricas específicas
            if (formData.Longitud <= 0) { errors.Longitud = true; isValid = false; }
            if (formData.Ancho <= 0) { errors.Ancho = true; isValid = false; }

            if (!isValid) {
                if (typeof Android !== 'undefined') {
                    Android.showAlert('Hay campos obligatorios sin completar (marcados en rojo)');
                }
                return false;
            }

            return true;
        };

        // Guardar
        const guardar = () => {
            if (validar()) {
                console.log('💾 FormAcera: Guardando datos completos:', formData);
                emit('save', { ...formData });
            }
        };


        // Capturar foto con prefijo inteligente
        const capturarFoto = () => {
            // 1. Validar Localización
            if (!formData.Localizacion || !formData.Localizacion.trim()) {
                const msg = '⚠️ Debe tener una Localización válida para tomar fotos.';
                if (typeof Android !== 'undefined') Android.showAlert(msg);
                else alert(msg);
                return; // Detener
            }

            // 2. Validar Código de Camino
            // if (!formData.CodigoCamino || !formData.CodigoCamino.trim()) {
            //     const msg = '⚠️ Debe tener un Código de Camino válido para tomar fotos.';
            //     if (typeof Android !== 'undefined') Android.showAlert(msg);
            //     else alert(msg);
            //     return; // Detener
            // }

            // Construir prefijo: "Localizacion_CodigoCamino"
            let partes = [];
            partes.push(formData.Localizacion.trim());
            //partes.push(formData.CodigoCamino.trim());

            const prefijo = partes.join('_');

            // Llamar a Android
            if (typeof Android !== 'undefined' && typeof Android.Camera === 'function') {
                console.log("📸 FormAcera: Calling Camera with prefix:", prefijo);
                Android.Camera(prefijo);
            } else {
                // Fallback (desarrollo)
                emit('camera');
            }
        };

        // Eliminar foto con confirmación visual
        const eliminarFoto = (filename) => {
            window.showConfirmModal({
                icon: '📷',
                title: '¿Eliminar foto?',
                message: 'Esta foto será eliminada permanentemente.',
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                onConfirm: () => {
                    if (typeof window.deletePhoto === 'function') {
                        window.deletePhoto(filename);
                    }
                }
            });
        };

        return {
            formData,
            calcularArea,
            calcularTotalEstruct,
            calcularTotalFunc,
            calcularTotalActividad,
            guardar,
            capturarFoto,
            guardar,
            capturarFoto,
            eliminarFoto,
            errors // Exponer errores al template
        };
    }
};

// Registrar componente globalmente
app.component('form-acera', FormAcera);
