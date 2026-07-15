/**
 * Componente FormNoEncuestado - Vue 3
 * Formulario para registros donde no se pudo realizar la encuesta
 */

const FormNoEncuestado = {
    props: ['data', 'fotos'],
    template: `
        <div class="form-container">
            <h2>🚫 Predio No Encuestado</h2>
            
            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR REGISTRO
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
            
            <!-- 1. UBICACIÓN DE REFERENCIA (Primero por requerimiento) -->
            <div class="section">
                <h3>📍 Ubicación de Referencia</h3>
                <div class="display-box" style="background: #e3f2fd; border-color: #bbdefb;">
                    <span style="font-weight: bold; color: #1565C0;">Dirección/Localización:</span><br>
                    <span>{{ formData.Localizacion || 'No capturada' }}</span>
                </div>
            </div>

            <!-- 2. REGISTRO DE VISITA -->
            <div class="section glass-card">
                <h3>📝 Registro de Visita</h3>
                
                <div class="form-group">
                    <label>Fecha de Visita</label>
                    <input type="date" v-model="formData.Fecha" readonly style="background-color: #f5f5f5;">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.Descripcion ? 'red' : 'inherit', fontWeight: errors.Descripcion ? 'bold' : 'normal'}">Motivo / Descripción *</label>
                    
                    <!-- Botones rápidos de prerrelleno: grid 2×2 con icono arriba y texto abajo -->
                    <div class="quick-reasons" style="margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button type="button" :style="chipStyle" @click="selectReason('No atendió')">
                            <span style="font-size:22px; line-height:1;">🚪</span>
                            <span>No atendió</span>
                        </button>
                        <button type="button" :style="chipStyle" @click="selectReason('No había personas en el lugar')">
                            <span style="font-size:22px; line-height:1;">👥</span>
                            <span>No había personas</span>
                        </button>
                        <button type="button" :style="chipStyle" @click="selectReason('Propietario se negó a brindar información (Rechazo)')">
                            <span style="font-size:22px; line-height:1;">🚫</span>
                            <span>Rechazo de encuesta</span>
                        </button>
                        <button type="button" :style="chipStyle" @click="selectReason('Vivienda deshabitada / desocupada')">
                            <span style="font-size:22px; line-height:1;">🏠</span>
                            <span>Vivienda deshabitada</span>
                        </button>
                    </div>

                    <textarea 
                        v-model="formData.Descripcion" 
                        rows="8" 
                        placeholder="Escriba aquí los motivos por los cuales no se pudo realizar la encuesta (Rechazo del propietario, casa deshabitada, lote baldío, etc.)..."
                        :style="{borderColor: errors.Descripcion ? '#d32f2f' : '#ccc'}"></textarea>
                    <small v-if="errors.Descripcion" style="color: #d32f2f;">Este campo es obligatorio para documentar la visita.</small>
                </div>
            </div>

            <!-- 3. FOTOGRAFÍAS OPCIONALES (Último elemento) -->
            <div class="section glass-card">
                <h3>📷 Fotografías (Opcional)</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button type="button" class="btn btn-primary" @click="$emit('camera')" style="flex: 1; min-height: 50px; font-weight: bold; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer;">
                        <span>📷</span>
                        <span>Tomar Foto</span>
                    </button>
                    <button type="button" class="btn btn-secondary" @click="$emit('import-photos')" style="flex: 1; min-height: 50px; font-weight: bold; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; background-color: #607d8b; color: white; border: none; border-radius: 4px;">
                        <span>📁</span>
                        <span>Importar Fotos</span>
                    </button>
                </div>
                
                <div v-if="fotosList.length > 0" class="photos-grid">
                    <div v-for="(foto, index) in fotosList" :key="index" class="photo-item">
                        <img :src="foto.data" class="photo-thumbnail" @click="verFoto(foto)" style="cursor: pointer;">
                        <div class="photo-info" style="display: flex; flex-direction: column; gap: 6px; padding: 8px;">
                            <span class="photo-name" style="font-size: 0.8em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; display: block;" :title="foto.name">{{ foto.name }}</span>
                            <div style="display: flex; gap: 5px; width: 100%;">
                                <button type="button" class="btn btn-danger" @click="confirmEliminarFoto(foto.name)" style="flex: 1; padding: 6px; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: none; cursor: pointer; background-color: #dc3545; color: white;">
                                    🗑️ Borrar
                                </button>
                                <button type="button" class="btn btn-primary" @click="exportarFoto(foto.name)" style="flex: 1; padding: 6px; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: none; cursor: pointer; background-color: #1976D2; color: white;">
                                    📥 Exportar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else style="text-align: center; color: #757575; font-style: italic; padding: 10px 0;">
                    No se han capturado fotos para este registro.
                </div>
            </div>

            <div class="btn-group">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR REGISTRO
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
        const fotosList = Vue.computed(() => props.fotos || []);

        // Estilos para los chips de motivos rápidos
        const chipStyle = {
            background: '#f1f3f4',
            border: '1px solid #dadce0',
            borderRadius: '12px',
            padding: '14px 8px',
            fontSize: '13px',
            color: '#3c4043',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            minHeight: '72px'
        };

        const verFoto = (foto) => {
            if (typeof Android !== 'undefined' && typeof Android.showPhoto === 'function') {
                Android.showPhoto(foto.name);
            }
        };

        const confirmEliminarFoto = (filename) => {
            if (typeof window.showConfirmModal === 'function') {
                window.showConfirmModal({
                    icon: '📷',
                    title: '¿Eliminar foto?',
                    message: 'La foto será eliminada físicamente.',
                    confirmText: 'Sí, eliminar',
                    cancelText: 'Cancelar',
                    onConfirm: () => {
                        if (window.deletePhoto) {
                            window.deletePhoto(filename);
                        }
                    }
                });
            } else {
                if (confirm('¿Desea eliminar la foto?')) {
                    if (window.deletePhoto) {
                        window.deletePhoto(filename);
                    }
                }
            }
        };

        const exportarFoto = (filename) => {
            emit('export-photo', filename);
        };

        // Concatenación inteligente de motivos rápidos
        const selectReason = (reason) => {
            if (!formData.Descripcion) {
                formData.Descripcion = reason;
            } else {
                const text = formData.Descripcion;
                if (text.endsWith(' ') || text.endsWith('\n')) {
                    formData.Descripcion = text + reason;
                } else {
                    formData.Descripcion = text + ' ' + reason;
                }
            }
        };

        // Normalizar fecha si es necesario
        if (formData.Fecha) {
            formData.Fecha = formData.Fecha.split('T')[0];
        }

        const save = () => {
            // Limpiar errores
            Object.keys(errors).forEach(key => delete errors[key]);

            if (!formData.Descripcion?.trim()) {
                errors.Descripcion = true;
                const msg = '⚠️ Por favor, detalle el motivo por el cual no se pudo realizar la encuesta.';
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
            fotosList,
            chipStyle,
            selectReason,
            verFoto,
            confirmEliminarFoto,
            exportarFoto,
            save
        };
    }
};

// Registrar componente
window.app.component('form-no-encuestado', FormNoEncuestado);
