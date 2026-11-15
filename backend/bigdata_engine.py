import time
import random

class BigDataEngine:
    def __init__(self):
        # Métricas iniciales de las 5 V
        self.metrics = {
            "volume_records": 1250,        # Cantidad total de registros procesados
            "velocity_tps": 4.5,           # Transacciones por segundo en streaming
            "variety_breakdown": {
                "structured": 60,          # % Tablas relacionales (Precios, IDs, Stock)
                "semi_structured": 25,     # % Logs de navegación y JSON de carritos
                "unstructured": 15         # % Imágenes de obras y reseñas en texto
            },
            "veracity_score": 98.2,        # % de calidad de datos limpios (filtrando spam/errores)
            "value_insights": {
                "top_style": "Óleo Realista",
                "total_sales_value": "$4,850 USD",
                "recommended_action": "Aumentar stock de figuras coleccionables de anime"
            }
        }
        
        # Simulación de nodos distribuidos para la red de datos
        self.nodes = [
            {"id": "Node-01-Ingestion", "ip": "192.168.1.10", "status": "Activo", "role": "Kafka/Streaming Ingestion", "load": "42%"},
            {"id": "Node-02-Processing", "ip": "192.168.1.11", "status": "Activo", "role": "Spark Cluster (ETL & Veracity)", "load": "68%"},
            {"id": "Node-03-Storage", "ip": "192.168.1.12", "status": "Replicado", "role": "NoSQL / Data Lake HDFS", "load": "55%"}
        ]

    def get_system_status(self):
        """Devuelve el estado actual de los nodos y las 5 V"""
        # Simulamos una pequeña fluctuación realista en tiempo real
        self.metrics["velocity_tps"] = round(random.uniform(3.8, 7.2), 2)
        return {
            "metrics": self.metrics,
            "nodes": self.nodes
        }

    def simulate_traffic_surge(self):
        """Simula un evento de alto tráfico (ej. una subasta o venta especial de arte)"""
        self.metrics["volume_records"] += random.randint(300, 800)
        self.metrics["velocity_tps"] = round(random.uniform(12.5, 25.0), 2)
        # Actualizamos la carga de los nodos para mostrar actividad intensa
        self.nodes[0]["load"] = "92%"
        self.nodes[1]["load"] = "95%"
        self.nodes[2]["load"] = "88%"
        return self.get_system_status()

    def process_art_interaction(self, action_type, item_name):
        """Registra una interacción de la tienda (compra o vista) y alimenta el Big Data"""
        self.metrics["volume_records"] += 1
        if action_type == "purchase":
            self.metrics["value_insights"]["top_style"] = item_name
        return self.get_system_status()

# Instancia global del motor
engine = BigDataEngine()