import time
import random

class BigDataEngine:
    def __init__(self):
        self.reset_system()

    def reset_system(self):
        """Estado inicial saludable del clúster"""
        self.metrics = {
            "volume_records": 1250,
            "velocity_tps": 4.5,
            "variety_breakdown": {
                "structured": 60,
                "semi_structured": 25,
                "unstructured": 15
            },
            "veracity_score": 98.5,
            "veracity_status": "Validación Óptima (Nodo Principal)",
            "value_insights": {
                "top_style": "Atardecer Andino (Óleo)",
                "total_sales_value": "$280.000 COP",
                "recommended_action": "Aumentar stock de cuadros al óleo"
            }
        }
        
        # Topología con nodo de respaldo (Failover) para Veracidad
        self.nodes = [
            {"id": "Node-01-Ingestion", "ip": "192.168.1.10", "status": "Activo", "role": "Kafka / Ingesta Streaming", "load": "42%"},
            {"id": "Node-02-Veracity-Primary", "ip": "192.168.1.11", "status": "Activo", "role": "Validador Principal de Veracidad (ETL)", "load": "65%"},
            {"id": "Node-03-Storage", "ip": "192.168.1.12", "status": "Replicado", "role": "Data Lake / Almacenamiento NoSQL", "load": "55%"},
            {"id": "Node-04-Veracity-Backup", "ip": "192.168.1.13", "status": "Standby", "role": "Nodo Respaldo (Failover Veracidad)", "load": "5%"}
        ]
        self.failover_active = False

    def get_system_status(self):
        """Devuelve el estado actual de los nodos y las 5 V"""
        self.metrics["velocity_tps"] = round(random.uniform(3.8, 7.2), 2)
        return {
            "metrics": self.metrics,
            "nodes": self.nodes,
            "failover_active": self.failover_active
        }

    def simulate_node_failure(self):
        """Simula la caída del nodo principal de Veracidad y la entrada del respaldo"""
        if not self.failover_active:
            # 1. El nodo principal falla
            self.nodes[1]["status"] = "Caído (Fallo)"
            self.nodes[1]["load"] = "0%"
            
            # 2. El nodo de respaldo entra automáticamente a reemplazarlo
            self.nodes[3]["status"] = "Activo (Reemplazo)"
            self.nodes[3]["load"] = "78%"
            
            # 3. La veracidad cae levemente durante el cambio pero se recupera sin detener la tienda
            self.metrics["veracity_score"] = 94.1
            self.metrics["veracity_status"] = "⚠️ Failover Activo: Node-04 reemplazó a Node-02"
            self.failover_active = True
        else:
            # Si ya estaba en fallo, este botón restaura el nodo principal
            self.reset_system()
            
        return self.get_system_status()

    def simulate_traffic_surge(self):
        """Simula un evento de alto tráfico"""
        self.metrics["volume_records"] += random.randint(300, 800)
        self.metrics["velocity_tps"] = round(random.uniform(14.5, 26.0), 2)
        self.nodes[0]["load"] = "92%"
        if not self.failover_active:
            self.nodes[1]["load"] = "95%"
        else:
            self.nodes[3]["load"] = "96%"
        self.nodes[2]["load"] = "88%"
        return self.get_system_status()

    def process_art_interaction(self, action_type, item_name):
        """Registra una compra o vista y alimenta el Big Data"""
        self.metrics["volume_records"] += 1
        if action_type == "purchase":
            self.metrics["value_insights"]["top_style"] = item_name
        return self.get_system_status()

engine = BigDataEngine()