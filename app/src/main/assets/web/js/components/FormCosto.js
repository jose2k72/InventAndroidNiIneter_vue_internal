/**
 * Componente FormCosto - Vue 3
 * Formulario de cálculo de costos para cobro
 * ESTRUCTURA EXACTA según legacy app
 */

const FormCosto = {
    template: `
        <div class="form-container">
            <h2>💰 Cálculo de Costo para Cobro</h2>
            
            <!-- Información de ubicación -->
            <div class="section">
                <h3>📍 Ubicación</h3>
                
                <div class="form-group">
                    <label>Localización</label>
                    <input type="text" :value="localizacion" readonly class="input-readonly">
                </div>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>CRTM05 Este</label>
                        <input type="number" :value="localProj.east" readonly class="input-readonly">
                    </div>
                    <div class="form-group">
                        <label>CRTM05 Norte</label>
                        <input type="number" :value="localProj.north" readonly class="input-readonly">
                    </div>
                </div>
            </div>
            
            <!-- Datos generales -->
            <div class="section">
                <h3>📝 Datos Generales</h3>
                
                <div class="form-group">
                    <label>Distrito *</label>
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
                
                <div class="form-group">
                    <label>Código de Camino *</label>
                    <input type="text" v-model="formData.CodigoCamino" readonly class="input-readonly">
                </div>
                
                <!-- NumBoleta oculto -->
                <input type="hidden" v-model="formData.NumBoleta">
                
                <div class="form-group">
                    <label>Número de Proceso de Cobro *</label>
                    <input type="text" v-model="formData.NumProcesoCobro" placeholder="Ingrese número">
                </div>
            </div>
            
            <!-- Obras Preliminares -->
            <div class="section">
                <h3>🔨 Obras Preliminares</h3>
                <pay-lines-table :items="formData.Preliminares"></pay-lines-table>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.PreliminaresObservaciones" rows="2"></textarea>
                </div>
            </div>
            
            <!-- Tuberías -->
            <div class="section">
                <h3>🔧 Colocación de Tubería Pluvial</h3>
                <pay-lines-table :items="formData.Tuberias"></pay-lines-table>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.TuberiasObservaciones" rows="2"></textarea>
                </div>
            </div>
            
            <!-- Tragantes -->
            <div class="section">
                <h3>🚿 Colocación de Tragantes</h3>
                <pay-lines-table :items="formData.Tragantes"></pay-lines-table>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.TragantesObservaciones" rows="2"></textarea>
                </div>
            </div>
            
            <!-- Aceras -->
            <div class="section">
                <h3>🚶 Construcción de Aceras</h3>
                <pay-lines-table :items="formData.Acera"></pay-lines-table>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.AceraObservaciones" rows="2"></textarea>
                </div>
            </div>
            
            <!-- Cordón -->
            <div class="section">
                <h3>🛤️ Construcción de Cordón y Cuneta</h3>
                <pay-lines-table :items="formData.Cordon"></pay-lines-table>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.CordonObservaciones" rows="2"></textarea>
                </div>
            </div>
            
            <!-- Complementarias -->
            <div class="section">
                <h3>➕ Obras Complementarias</h3>
                <pay-lines-table :items="formData.Complementarias"></pay-lines-table>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea v-model="formData.ComplementariasObservaciones" rows="2"></textarea>
                </div>
            </div>
            
            <!-- Total General -->
            <div class="result-box">
                <div class="label">Total General (₡)</div>
                <div class="value">{{ formatCurrency(totalGeneral) }}</div>
            </div>
            
            <!-- Condición Meteorológica -->
            <div class="section">
                <h3>🌤️ Condiciones</h3>
                <div class="form-group">
                    <label>Condición Meteorológica *</label>
                    <select v-model="formData.CondicionMeteorol">
                        <option value="">Seleccione una opción</option>
                        <option value="1">Despejado</option>
                        <option value="2">Nublado</option>
                        <option value="3">Lluvioso</option>
                    </select>
                </div>
            </div>
            
            <!-- Fotografías -->
            <button type="button" class="btn btn-camera" @click="$emit('camera')">
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
        const formData = Vue.reactive({ ...props.data });

        // Watch: Sincronizar campo Imagenes cuando cambian las fotos
        Vue.watch(() => props.fotos, (newFotos) => {
            const nombres = newFotos.map(f => f.name).join(',');
            formData.Imagenes = nombres;
            console.log('🔄 FormCosto: Campo Imagenes actualizado:', formData.Imagenes);
        }, { deep: true });

        // Calcular total general
        const totalGeneral = Vue.computed(() => {
            const sections = ['Preliminares', 'Tuberias', 'Tragantes', 'Acera', 'Cordon', 'Complementarias'];
            return sections.reduce((total, section) => {
                if (formData[section]) {
                    return total + formData[section].reduce((sum, item) => sum + (item.Monto || 0), 0);
                }
                return total;
            }, 0);
        });

        // Formatear moneda
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('es-CR').format(value);
        };

        // Validar
        const validar = () => {
            const required = ['CodigoCamino', 'NumBoleta', 'NumProcesoCobro', 'Distrito', 'CondicionMeteorol'];

            for (const field of required) {
                const value = formData[field];
                if (value === '' || value === null || value === undefined) {
                    if (typeof Android !== 'undefined') {
                        Android.showAlert('Complete todos los campos requeridos (*)');
                    }
                    return false;
                }
            }
            return true;
        };

        // Guardar
        const guardar = () => {
            if (validar()) {
                emit('save', { ...formData });
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
            totalGeneral,
            formatCurrency,
            guardar,
            eliminarFoto
        };
    }
};

// Componente de tabla de líneas de pago
// ESTRUCTURA COMPLETA: Id, Descr, Unidad, Precio, Cantidad, Monto, Longitud, Ancho, Area, Volumen
const PayLinesTable = {
    template: `
        <div class="cost-table-container" style="overflow-x: auto;">
            <table class="cost-table">
                <thead>
                    <tr>
                        <th class="description">Descripción</th>
                        <th>Und</th>
                        <th>Precio (₡)</th>
                        <th>Long.</th>
                        <th>Ancho</th>
                        <th>Área</th>
                        <th>Vol.</th>
                        <th>Cant.</th>
                        <th>Monto (₡)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in items" :key="item.Id">
                        <td class="description">{{ item.Descr }}</td>
                        <td>{{ item.Unidad }}</td>
                        <td>{{ formatNumber(item.Precio) }}</td>
                        <td>
                            <input type="number" v-model.number="item.Longitud" 
                                   @input="calcularCampos(item)" min="0" step="0.01" 
                                   style="width: 60px;">
                        </td>
                        <td>
                            <input type="number" v-model.number="item.Ancho" 
                                   @input="calcularCampos(item)" min="0" step="0.01" 
                                   style="width: 60px;">
                        </td>
                        <td>{{ formatNumber(item.Area) }}</td>
                        <td>
                            <input type="number" v-model.number="item.Volumen" 
                                   @input="calcularMonto(item)" min="0" step="0.01" 
                                   style="width: 60px;">
                        </td>
                        <td>
                            <input type="number" v-model.number="item.Cantidad" 
                                   @input="calcularMonto(item)" min="0" step="0.01" 
                                   style="width: 70px;">
                        </td>
                        <td><strong>{{ formatNumber(item.Monto) }}</strong></td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="8" style="text-align: right; font-weight: bold;">Subtotal:</td>
                        <td style="font-weight: bold;">{{ formatNumber(subtotal) }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `,

    props: {
        items: { type: Array, default: () => [] }
    },

    setup(props) {
        // Calcular Area = Longitud * Ancho
        const calcularCampos = (item) => {
            item.Area = (item.Longitud || 0) * (item.Ancho || 0);
            calcularMonto(item);
        };

        // Calcular Monto = Cantidad * Precio
        const calcularMonto = (item) => {
            item.Monto = (item.Cantidad || 0) * (item.Precio || 0);
        };

        // Calcular subtotal
        const subtotal = Vue.computed(() => {
            return props.items.reduce((sum, item) => sum + (item.Monto || 0), 0);
        });

        // Formatear número
        const formatNumber = (value) => {
            return new Intl.NumberFormat('es-CR').format(value || 0);
        };

        return {
            calcularCampos,
            calcularMonto,
            subtotal,
            formatNumber
        };
    }
};

// Registrar componentes globalmente
app.component('form-costo', FormCosto);
app.component('pay-lines-table', PayLinesTable);
