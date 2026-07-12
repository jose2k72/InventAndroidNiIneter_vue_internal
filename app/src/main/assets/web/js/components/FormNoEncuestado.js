/**
 * Componente FormNoEncuestado - Vue 3
 * Formulario para registros donde no se pudo realizar la encuesta
 */

const FormNoEncuestado = {
    props: ['data'],
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

            <!-- 3. FOTOGRAFÍA OPCIONAL (Último elemento) -->
            <div class="section glass-card">
                <h3>📷 Fotografía (Opcional)</h3>
                <div class="form-group" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <div v-if="fotoBase64" class="photo-preview-container" style="position: relative; width: 100%; max-width: 320px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 1px solid #ddd;">
                        <img :src="fotoBase64" @click="verFoto" style="width: 100%; display: block; object-fit: cover; aspect-ratio: 4/3; cursor: pointer;">
                        <button type="button" @click="confirmEliminarFoto" class="btn btn-danger" style="position: absolute; top: 10px; right: 10px; border-radius: 50%; width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; border: none; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                    
                    <div v-if="fotoBase64" style="display: flex; width: 100%; justify-content: center;">
                        <button type="button" class="btn btn-primary" @click="exportarFoto" style="width: 100%; max-width: 320px; display: flex; align-items: center; justify-content: center; gap: 5px; background-color: #1976D2; color: white; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; min-height: 44px;">
                            📥 Exportar foto
                        </button>
                    </div>

                    <div v-else style="display: flex; width: 100%; max-width: 320px; margin: 10px 0; justify-content: center;">
                        <button type="button" class="btn btn-primary" @click="$emit('camera')" style="width: 100%; min-height: 54px; font-weight: bold; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer;">
                            <span>📷</span>
                            <span>Tomar Foto</span>
                        </button>
                    </div>
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
        const fotoBase64 = Vue.ref('');

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

        // Cargar foto Base64 desde el almacenamiento privado de Android
        const cargarFoto = () => {
            if (formData.Imagenes && typeof Android !== 'undefined' && typeof Android.loadPhotoAsBase64 === 'function') {
                const filename = formData.Imagenes.split(',')[0].trim();
                const b64 = Android.loadPhotoAsBase64(filename);
                if (b64) {
                    fotoBase64.value = 'data:image/jpeg;base64,' + b64;
                } else {
                    fotoBase64.value = '';
                }
            } else {
                fotoBase64.value = '';
            }
        };

        Vue.watch(() => formData.Imagenes, cargarFoto, { immediate: true });

        const verFoto = () => {
            if (formData.Imagenes && typeof Android !== 'undefined' && typeof Android.showPhoto === 'function') {
                Android.showPhoto(formData.Imagenes.split(',')[0].trim());
            }
        };

        const confirmEliminarFoto = () => {
            const filename = formData.Imagenes.split(',')[0].trim();
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
                        } else {
                            formData.Imagenes = '';
                        }
                    }
                });
            } else {
                if (confirm('¿Desea eliminar la foto?')) {
                    if (window.deletePhoto) {
                        window.deletePhoto(filename);
                    } else {
                        formData.Imagenes = '';
                    }
                }
            }
        };

        const exportarFoto = () => {
            const filename = formData.Imagenes.split(',')[0].trim();
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
            fotoBase64,
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
