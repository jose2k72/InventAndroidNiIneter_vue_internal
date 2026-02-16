/**
 * CatalogoSelector.js
 * Componente modal para búsqueda y selección de elementos en catálogos grandes.
 */

const CatalogoSelector = {
    props: {
        modelValue: {
            type: Object,
            default: () => ({ id: null, name: '' })
        },
        catalogName: {
            type: String,
            required: true
        },
        label: {
            type: String,
            default: 'Seleccionar...'
        },
        placeholder: {
            type: String,
            default: 'Buscar...'
        }
    },
    emits: ['update:modelValue'],
    template: `
        <div class="catalogo-selector-container">
            <style>
                .catalogo-selector-container {
                    margin-bottom: 12px;
                }
                .selector-display {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    min-height: 50px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .selector-icon {
                    color: #1976D2;
                    font-size: 1.2rem;
                }
                .placeholder-text {
                    color: #757575;
                }
                .selected-text {
                    color: #1565C0;
                    font-weight: 600;
                }
                
                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }
                .catalog-modal {
                    background: #fff;
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
                .catalog-modal-header {
                    padding: 16px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }
                .catalog-modal-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    color: #1976D2;
                }
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #666;
                    cursor: pointer;
                    padding: 5px;
                }
                
                .search-box {
                    padding: 16px;
                    background: #fff;
                    border-bottom: 1px solid #eee;
                }
                .search-box input {
                    width: 100%;
                    padding: 14px 18px;
                    font-size: 17px; /* Más grande para fácil lectura */
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .search-box input:focus {
                    border-color: #1976D2;
                }
                
                .catalog-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px; /* Espacio alrededor de la lista */
                    background: #f5f5f5; /* Fondo ligeramente gris para contrastar con los items blancos */
                }
                .catalog-item {
                    padding: 22px 20px; /* Aún más grande para touch */
                    margin-bottom: 10px; /* Separación física entre elementos para evitar errores */
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    font-size: 18px; /* Texto más grande y legible */
                    color: #333;
                    transition: all 0.2s;
                    line-height: 1.4;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .catalog-item:last-child {
                    margin-bottom: 0;
                }
                .catalog-item:active {
                    background: #e3f2fd;
                    transform: scale(0.98); /* Feedback visual al tocar */
                }
                .catalog-item.selected {
                    background: #e3f2fd;
                    color: #1565C0;
                    font-weight: bold;
                    border: 2px solid #1976D2;
                }
                
                .loading-state, .empty-state {
                    padding: 40px 20px;
                    text-align: center;
                    color: #757575;
                }
                .load-more-hint {
                    padding: 15px;
                    text-align: center;
                    font-size: 0.9rem;
                    color: #9e9e9e;
                    background: #fafafa;
                }
            </style>

            <div class="selector-display" @click="openModal">
                <span v-if="modelValue && modelValue.name" class="selected-text">{{ modelValue.name }}</span>
                <span v-else class="placeholder-text">{{ label }}</span>
                <span class="selector-icon">🔍</span>
            </div>

            <!-- Modal de Búsqueda -->
            <div v-if="showModal" class="modal-overlay" style="z-index: 2000;">
                <div class="modal-content catalog-modal">
                    <div class="catalog-modal-header">
                        <h3>{{ label }}</h3>
                        <button class="btn-close" @click="closeModal">✕</button>
                    </div>
                    
                    <div class="search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            :placeholder="placeholder"
                            ref="searchInput"
                        >
                    </div>

                    <div class="catalog-list" ref="listContainer">
                        <div v-if="loading" class="loading-state">Cargando catálogo...</div>
                        <div v-else-if="filteredItems.length === 0" class="empty-state">
                            No se encontraron resultados
                        </div>
                        <div 
                            v-for="item in visibleItems" 
                            :key="item.id" 
                            class="catalog-item"
                            :class="{ selected: modelValue && modelValue.id === item.id }"
                            @click="selectItem(item)"
                        >
                            {{ item.name }}
                        </div>
                        <div v-if="hasMore" class="load-more-hint">
                            Escribe más para filtrar... ({{ filteredItems.length }} total)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const showModal = Vue.ref(false);
        const searchQuery = Vue.ref('');
        const allItems = Vue.ref([]);
        const loading = Vue.ref(false);
        const limit = 50; // Limitar visualización para rendimiento

        const loadData = async () => {
            if (allItems.value.length > 0) return;

            loading.value = true;
            const filename = `${props.catalogName}.json`;
            console.log('📂 Cargando catálogo:', filename);

            try {
                let data = null;
                // Intento 1: Android Bridge
                if (window.Android && window.Android.loadCatalogJson) {
                    const jsonStr = window.Android.loadCatalogJson(filename);
                    if (jsonStr) {
                        data = JSON.parse(jsonStr);
                    }
                }

                // Intento 2: Fetch (para browser dev)
                if (!data) {
                    const response = await fetch(`data/${filename}`);
                    if (response.ok) {
                        data = await response.json();
                    }
                }

                if (data) {
                    allItems.value = data;
                    console.log(`✅ Catálogo ${props.catalogName} cargado: ${data.length} items`);
                } else {
                    console.error('❌ No se pudo cargar el catálogo:', filename);
                }
            } catch (e) {
                console.error('❌ Error cargando catálogo:', e);
            } finally {
                loading.value = false;
            }
        };

        const openModal = () => {
            showModal.value = true;
            loadData();
            Vue.nextTick(() => {
                const input = document.querySelector('.search-box input');
                if (input) input.focus();
            });
        };

        const closeModal = () => {
            showModal.value = false;
            searchQuery.value = '';
        };

        const selectItem = (item) => {
            emit('update:modelValue', { id: item.id, name: item.name });
            closeModal();
        };

        const filteredItems = Vue.computed(() => {
            if (!searchQuery.value) return allItems.value;
            const q = searchQuery.value.toLowerCase();
            return allItems.value.filter(item => {
                if (!item) return false;
                const nameMatch = item.name && item.name.toLowerCase().includes(q);
                const idMatch = item.id && item.id.toString() === q;
                return nameMatch || idMatch;
            });
        });

        const visibleItems = Vue.computed(() => {
            return filteredItems.value.slice(0, limit);
        });

        const hasMore = Vue.computed(() => {
            return filteredItems.value.length > limit;
        });

        return {
            showModal,
            searchQuery,
            loading,
            filteredItems,
            visibleItems,
            hasMore,
            openModal,
            closeModal,
            selectItem
        };
    }
};

window.app.component('catalogo-selector', CatalogoSelector);
