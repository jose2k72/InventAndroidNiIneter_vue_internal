const FormFamiliares = {
    props: ['data'],
    emits: ['save', 'cancel', 'ocr-scan'],
    template: `
        <div class="form-container">
            <div class="form-header">
                <h2>👨‍👩‍👧‍👦 Composición Familiar</h2>
            </div>

            <div class="btn-group" style="margin-bottom: 20px; display: flex; gap: 10px;">
                <button class="btn btn-secondary" style="flex: 1; padding: 15px;" @click="$emit('cancel')">VOLVER</button>
                <button class="btn btn-primary" style="flex: 1; padding: 15px;" @click="save">💾 GUARDAR</button>
            </div>

            <div v-for="(fam, index) in formData.Familiares" :key="index" class="section document-item">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #e3f2fd; padding-bottom: 8px;">
                    <h3 style="margin: 0; color: #1565C0;">Integrante #{{ index + 1 }}: {{ fam.FirstName }} {{ fam.FirstSurName }}</h3>
                    <button class="btn-delete" @click="quitarFamiliar(index)">🗑️</button>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors[index + '_FirstName'] ? 'red' : 'inherit', fontWeight: errors[index + '_FirstName'] ? 'bold' : 'normal'}">Primer Nombre *</label>
                        <input type="text" v-model="fam.FirstName" :style="{borderColor: errors[index + '_FirstName'] ? '#d32f2f' : '#ccc'}">
                        <button type="button" class="ocr-btn" @click="scanField('Familiar_Nombres_' + index)" title="Escanear Nombres" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Segundo Nombre</label>
                        <input type="text" v-model="fam.SecondName">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors[index + '_FirstSurName'] ? 'red' : 'inherit', fontWeight: errors[index + '_FirstSurName'] ? 'bold' : 'normal'}">Primer Apellido *</label>
                        <input type="text" v-model="fam.FirstSurName" :style="{borderColor: errors[index + '_FirstSurName'] ? '#d32f2f' : '#ccc'}">
                        <button type="button" class="ocr-btn" @click="scanField('Familiar_Apellidos_' + index)" title="Escanear Apellidos" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Segundo Apellido</label>
                        <input type="text" v-model="fam.SecondSurName">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors[index + '_Gender'] ? 'red' : 'inherit', fontWeight: errors[index + '_Gender'] ? 'bold' : 'normal'}">Sexo *</label>
                        <select v-model.number="fam.Gender" :style="{borderColor: errors[index + '_Gender'] ? '#d32f2f' : '#ccc'}">
                            <option :value="null">Seleccione...</option>
                            <option :value="1">Masculino</option>
                            <option :value="2">Femenino</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors[index + '_Age'] ? 'red' : 'inherit', fontWeight: errors[index + '_Age'] ? 'bold' : 'normal'}">Edad *</label>
                        <input type="number" v-model.number="fam.Age" min="0" :style="{borderColor: errors[index + '_Age'] ? '#d32f2f' : '#ccc'}">
                    </div>
                </div>

                <div class="form-group">
                    <label :style="{color: errors[index + '_Parentesco'] ? 'red' : 'inherit', fontWeight: errors[index + '_Parentesco'] ? 'bold' : 'normal'}">Parentesco *</label>
                    <div class="selector-display" @click="pedirParentesco(index)" :style="{borderColor: errors[index + '_Parentesco'] ? '#d32f2f' : '#ccc'}">
                        <span v-if="fam._ParentescoName" style="color: #1565C0; font-weight: 600;">{{ fam._ParentescoName }}</span>
                        <span v-else style="color: #757575;">Seleccione parentesco...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                    </div>
                </div>
            </div>

            <button class="btn btn-secondary" style="width: 100%; margin-top: 10px; border-style: dashed; padding: 15px;" @click="agregarFamiliar">
                ➕ AGREGAR INTEGRANTE FAMILIAR
            </button>

            <div class="btn-group" style="margin-top: 25px; display: flex; gap: 10px;">
                <button class="btn btn-secondary" style="flex: 1; padding: 15px;" @click="$emit('cancel')">VOLVER</button>
                <button class="btn btn-primary" style="flex: 1; padding: 15px;" @click="save">💾 GUARDAR</button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const formData = props.data;
        const errors = Vue.reactive({});

        // Asegurar que la lista existe
        if (!formData.Familiares) {
            formData.Familiares = [];
        }

        const agregarFamiliar = () => {
            formData.Familiares.push({
                FirstName: '',
                SecondName: '',
                FirstSurName: '',
                SecondSurName: '',
                Gender: null,
                Age: null,
                ParentescoCatalog: 0,
                _ParentescoName: ''
            });
        };

        const quitarFamiliar = (index) => {
            formData.Familiares.splice(index, 1);
            // Limpiar errores asociados
            delete errors[index + '_FirstName'];
            delete errors[index + '_FirstSurName'];
            delete errors[index + '_Gender'];
            delete errors[index + '_Age'];
            delete errors[index + '_Parentesco'];
        };

        const pedirParentesco = (index) => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'Parentesco',
                    label: 'Seleccionar Parentesco...',
                    onSelect: (val) => {
                        formData.Familiares[index].ParentescoCatalog = parseInt(val.id);
                        formData.Familiares[index]._ParentescoName = val.name;
                        delete errors[index + '_Parentesco'];
                    }
                });
            }
        };

        // Watcher profundo para limpiar errores dinámicamente
        Vue.watch(() => formData.Familiares, (newVal) => {
            if (!newVal) return;
            newVal.forEach((fam, index) => {
                if (fam.FirstName?.trim()) delete errors[index + '_FirstName'];
                if (fam.FirstSurName?.trim()) delete errors[index + '_FirstSurName'];
                if (fam.Gender) delete errors[index + '_Gender'];
                if (fam.Age !== null && fam.Age !== undefined) delete errors[index + '_Age'];
                if (fam.ParentescoCatalog) delete errors[index + '_Parentesco'];
            });
        }, { deep: true });

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(k => delete errors[k]);
            const errs = [];

            if (formData.Familiares.length === 0) {
                const msg = '⚠️ Debe agregar al menos un integrante familiar.';
                if (typeof Android !== 'undefined') Android.showAlert(msg); else alert(msg);
                return;
            }

            formData.Familiares.forEach((fam, index) => {
                if (!fam.FirstName?.trim()) { errors[index + '_FirstName'] = true; errs.push('Nombre integrante ' + (index + 1)); }
                if (!fam.FirstSurName?.trim()) { errors[index + '_FirstSurName'] = true; errs.push('Apellido integrante ' + (index + 1)); }
                if (!fam.Gender) { errors[index + '_Gender'] = true; errs.push('Sexo integrante ' + (index + 1)); }
                if (fam.Age === null || fam.Age === undefined || fam.Age === '') { errors[index + '_Age'] = true; errs.push('Edad integrante ' + (index + 1)); }
                if (!fam.ParentescoCatalog) { errors[index + '_Parentesco'] = true; errs.push('Parentesco integrante ' + (index + 1)); }
            });

            if (errs.length > 0) {
                const msg = '⚠️ Faltan datos obligatorios en la composición familiar.';
                if (typeof Android !== 'undefined') Android.showAlert(msg); else alert(msg);
                return;
            }

            emit('save', Vue.toRaw(formData));
        };

        const scanField = (fieldName) => emit('ocr-scan', fieldName);

        return {
            formData, errors,
            agregarFamiliar, quitarFamiliar, pedirParentesco, save, scanField
        };
    }
};

window.app.component('form-familiares', FormFamiliares);
