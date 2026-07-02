const FileBrowser = {
    template: `
        <div class="file-browser-container" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background-color: #f5f5f5; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="background-color: #1565C0; color: white; padding: 15px; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;">
                <button type="button" @click="$emit('cancel')" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
                    ⬅️
                </button>
                <div style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: bold; font-size: 1.1rem;">
                    {{ currentPath || 'Almacenamiento Interno' }}
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" style="flex-grow: 1; display: flex; justify-content: center; align-items: center;">
                <span style="font-size: 1.2rem; color: #666;">Cargando...</span>
            </div>

            <!-- File List -->
            <div v-else style="flex-grow: 1; overflow-y: auto; padding: 10px;">
                <div v-if="files.length === 0" style="text-align: center; color: #888; padding: 20px;">
                    Carpeta vacía
                </div>
                <div v-for="(file, index) in files" :key="index" 
                     @click="handleItemClick(file)"
                     style="display: flex; align-items: center; padding: 12px; background: white; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer;"
                     :style="{ border: isSelected(file) ? '2px solid #1565C0' : '2px solid transparent' }">
                    
                    <div style="font-size: 2rem; margin-right: 15px;">
                        <span v-if="file.name === '..'">⬆️</span>
                        <span v-else-if="file.isDirectory">📁</span>
                        <span v-else>🖼️</span>
                    </div>

                    <div style="flex-grow: 1; overflow: hidden;">
                        <div style="font-weight: bold; font-size: 1rem; color: #333; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
                            {{ file.name }}
                        </div>
                        <div v-if="!file.isDirectory && file.name !== '..'" style="font-size: 0.8rem; color: #888;">
                            {{ formatSize(file.size) }} - {{ formatDate(file.lastModified) }}
                        </div>
                    </div>

                    <div v-if="isSelected(file)" style="color: #1565C0; font-size: 1.5rem; font-weight: bold;">
                        ✓
                    </div>
                </div>
            </div>

            <!-- Footer Toolbar -->
            <div style="background-color: white; padding: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -2px 5px rgba(0,0,0,0.1);">
                <div style="font-weight: bold; color: #333;">
                    Seleccionados: {{ selectedPaths.length }}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Cancelar</button>
                    <button type="button" class="btn btn-primary" :disabled="selectedPaths.length === 0" @click="confirmSelection" style="background-color: #1565C0; color: white;">
                        Importar
                    </button>
                </div>
            </div>
        </div>
    `,
    props: {
        prefix: {
            type: String,
            default: ''
        }
    },
    setup(props, { emit }) {
        const { ref, onMounted } = Vue;
        if (typeof Android !== 'undefined' && Android.showToast) Android.showToast('FileBrowser mounted!');
        
        const loading = ref(false);
        const currentPath = ref('');
        const files = ref([]);
        const selectedPaths = ref([]);

        const loadDirectory = (path = null) => {
            loading.value = true;
            try {
                if (typeof Android !== 'undefined' && Android.listDirectory) {
                    const jsonStr = Android.listDirectory(path);
                    const result = JSON.parse(jsonStr);
                    files.value = result;
                    
                    // Track path locally since it's not strictly returned by API for the root
                    if (path) {
                        currentPath.value = path;
                    } else if (result.length > 0 && result[0].name === '..') {
                        currentPath.value = "Carpeta";
                    } else {
                        currentPath.value = "Almacenamiento Interno";
                    }
                } else {
                    console.warn('Android.listDirectory no está disponible');
                    // Mock data
                    files.value = [
                        { name: '..', path: '/storage/emulated/0', isDirectory: true },
                        { name: 'DCIM', path: '/storage/emulated/0/DCIM', isDirectory: true },
                        { name: 'foto1.jpg', path: '/storage/emulated/0/foto1.jpg', isDirectory: false, size: 1024500, lastModified: Date.now() }
                    ];
                }
            } catch (e) {
                console.error("Error cargando directorio:", e); if (typeof Android !== "undefined" && Android.showToast) Android.showToast("Error: " + e.message);
                files.value = [];
            } finally {
                loading.value = false;
            }
        };

        const handleItemClick = (file) => {
            if (file.isDirectory) {
                currentPath.value = file.path;
                selectedPaths.value = []; // Resetear selección al cambiar de carpeta
                loadDirectory(file.path);
            } else {
                toggleSelection(file);
            }
        };

        const toggleSelection = (file) => {
            const index = selectedPaths.value.indexOf(file.path);
            if (index > -1) {
                selectedPaths.value.splice(index, 1);
            } else {
                selectedPaths.value.push(file.path);
            }
        };

        const isSelected = (file) => {
            return !file.isDirectory && selectedPaths.value.includes(file.path);
        };

        const confirmSelection = () => {
            if (selectedPaths.value.length > 0) {
                emit('select', selectedPaths.value, props.prefix);
            }
        };

        const formatSize = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formatDate = (ms) => {
            if (!ms) return '';
            const d = new Date(ms);
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        };

        onMounted(() => {
            loadDirectory();
        });

        return {
            loading,
            currentPath,
            files,
            selectedPaths,
            handleItemClick,
            isSelected,
            confirmSelection,
            formatSize,
            formatDate
        };
    }
};

window.app.component('file-browser', FileBrowser);



