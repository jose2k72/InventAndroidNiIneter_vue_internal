/**
 * Componente FormUnionConPredio - Vue 3
 * Formulario para registros de unificación (Englobamiento) con predios colindantes
 */

const FormUnionConPredio = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2 style="color: #6200EE;">🔗 Unión con Predio Master</h2>
            
            <div class="section glass-card">
                <h3>📋 Datos de Unificación</h3>
                
                <div class="form-group">
                    <label>Fecha de Registro</label>
                    <input type="date" v-model="formData.Fecha" readonly style="background-color: #f5f5f5;">
                </div>

                <div class="form-group">
                    <p class="instruction-text" style="color: #555; font-style: italic; margin-bottom: 15px;">
                        Seleccione el predio colindante que actuará como **Master**. Solo se muestran predios vecinos con información única verificada.
                    </p>
                    
                    <label :style="{color: errors.LocalizacionMaster ? 'red' : 'inherit', fontWeight: 'bold'}">Predio Master Seleccionado *</label>
                    
                    <div class="master-selection-list">
                        <div 
                            v-for="c in candidatos" 
                            :key="c.localizacion"
                            class="master-option-card"
                            :class="{ selected: formData.LocalizacionMaster === c.localizacion }"
                            @click="selectMaster(c)"
                        >
                            <div class="option-header">
                                <span class="loc-code">{{ c.localizacion }}</span>
                                <span class="dir-badge">{{ getDirName(c.direccionRelativa) }}</span>
                            </div>
                            <div class="option-check">
                                <span v-if="formData.LocalizacionMaster === c.localizacion">✅ Seleccionado</span>
                            </div>
                        </div>
                    </div>
                    
                    <small v-if="errors.LocalizacionMaster" style="color: #d32f2f; font-weight: bold;">
                        Debe seleccionar obligatoriamente un predio master de la lista.
                    </small>
                </div>
            </div>

            <div class="section">
                <h3>📍 Predio Actual (Dependiente)</h3>
                <div class="display-box" style="background: #f1f8e9; border-color: #c5e1a5;">
                    <span style="font-weight: bold; color: #33691E;">Localización:</span><br>
                    <span>{{ formData.Localizacion || 'No capturada' }}</span>
                </div>
            </div>

            <div class="btn-group">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR UNIFICACIÓN
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const formData = Vue.reactive(props.data);
        const errors = Vue.reactive({});
        const candidatos = Vue.ref([]);

        // Mapeo de direcciones relativas para etiquetas
        const dirMap = {
            'N': 'Norte', 'S': 'Sur', 'E': 'Este', 'O': 'Oeste',
            'NE': 'Noreste', 'NO': 'Noroeste', 'SE': 'Sureste', 'SO': 'Suroeste'
        };

        const getDirName = (code) => dirMap[code] || ('Al ' + code);

        // Cargar candidatos usando WorkflowService (una sola fuente de verdad)
        Vue.onMounted(() => {
            if (window.WorkflowService && formData.IdObject) {
                candidatos.value = window.WorkflowService.getMasterCandidates(formData.IdObject);
            }
        });

        const selectMaster = (c) => {
            formData.LocalizacionMaster = c.localizacion;
            formData._MasterDireccionRelativa = c.direccionRelativa;
            delete errors.LocalizacionMaster;
        };

        const save = () => {
            // Limpiar errores
            Object.keys(errors).forEach(key => delete errors[key]);

            if (!formData.LocalizacionMaster) {
                errors.LocalizacionMaster = true;
                const msg = '⚠️ Debe seleccionar el predio master que hereda la información.';
                if (typeof Android !== 'undefined' && Android.showAlert) {
                    Android.showAlert(msg);
                } else {
                    alert(msg);
                }
                return;
            }

            // Normalizar fecha para el DTO final
            if (formData.Fecha && formData.Fecha.includes('T')) {
                formData.Fecha = formData.Fecha.split('T')[0];
            }

            emit('save', Vue.toRaw(formData));
        };

        return {
            formData,
            errors,
            candidatos,
            getDirName,
            selectMaster,
            save
        };
    }
};

// Estilos específicos para este componente (Inline para facilitar la integración)
const style = document.createElement('style');
style.innerHTML = `
    .master-selection-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 10px;
        max-height: 400px;
        overflow-y: auto;
    }
    .master-option-card {
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .master-option-card:hover {
        border-color: #9575cd;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .master-option-card.selected {
        border-color: #6200EE;
        background-color: #f3e5f5;
        box-shadow: 0 4px 15px rgba(98, 0, 238, 0.2);
    }
    .option-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .loc-code {
        font-family: 'Courier New', monospace;
        font-size: 1.1rem;
        font-weight: bold;
        color: #333;
    }
    .dir-badge {
        font-size: 0.8rem;
        background: #eee;
        padding: 2px 8px;
        border-radius: 4px;
        color: #666;
        width: fit-content;
    }
    .master-option-card.selected .dir-badge {
        background: #6200EE;
        color: white;
    }
    .option-check {
        font-weight: bold;
        color: #6200EE;
    }
`;
document.head.appendChild(style);

// Registrar componente
window.app.component('form-union-con-predio', FormUnionConPredio);
