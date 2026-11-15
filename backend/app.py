from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from bigdata_engine import engine

# Configuramos Flask para que busque el frontend en la carpeta de al lado
frontend_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
CORS(app)

# Catálogo actualizado con precios en COP y enlaces de imágenes estables
ART_PRODUCTS = [
    {"id": 1, "name": "Atardecer Andino (Óleo)", "category": "Cuadro", "price": 60000, "image": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80"},
    {"id": 2, "name": "Guerrero Cyberpunk (Figura 3D)", "category": "Figura", "price": 80000, "image": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80"},
    {"id": 3, "name": "Abstracción Geométrica", "category": "Cuadro", "price": 60000, "image": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80"},
    {"id": 4, "name": "Busto Neoclásico Mármol", "category": "Figura", "price": 80000, "image": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"}
]

@app.route('/')
def serve_frontend():
    """Sirve la página principal de la tienda"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify(ART_PRODUCTS)

@app.route('/api/bigdata/status', methods=['GET'])
def get_bigdata_status():
    """Endpoint que consulta el panel de las 5 V y estado de nodos"""
    return jsonify(engine.get_system_status())

@app.route('/api/bigdata/surge', methods=['POST'])
def trigger_surge():
    """Simula tráfico masivo de Big Data"""
    return jsonify(engine.simulate_traffic_surge())

@app.route('/api/art/interact', methods=['POST'])
def art_interact():
    """Registra una compra o visualización que alimenta el flujo de datos"""
    data = request.json or {}
    action = data.get("action", "view")
    item = data.get("item", "Obra General")
    result = engine.process_art_interaction(action, item)
    return jsonify({"status": "success", "data": result})

if __name__ == '__main__':
    print("🚀 Servidor de ArtData Store iniciado en http://127.0.0.1:5000")
    app.run(debug=True, port=5000)