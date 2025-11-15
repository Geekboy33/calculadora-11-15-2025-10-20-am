#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Digital Commercial Bank Ltd ADVANCED REVERSE ENGINEERING SYSTEM
Sistema de Ingeniería Inversa Avanzado para Análisis Profundo de Archivos Digital Commercial Bank Ltd
Capacidades: Decompilación, Detección de Patrones, Extracción Binaria, Interpretación de Estructuras
"""

import os
import re
import struct
import binascii
import json
import hashlib
import zlib
from collections import defaultdict, Counter
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any
import math

class BinaryDecompiler:
    """Decompilador de estructuras binarias"""
    
    def __init__(self):
        self.structure_signatures = {
            # Firmas conocidas de archivos financieros
            b'DTCB': 'Digital Commercial Bank Ltd_BINARY',
            b'BANK': 'BANKING_STRUCTURE',
            b'ACCN': 'ACCOUNT_RECORD',
            b'TRNS': 'TRANSACTION_RECORD',
            b'BLNC': 'BALANCE_RECORD',
            b'\x89PNG': 'PNG_IMAGE',
            b'%PDF': 'PDF_DOCUMENT',
            b'PK\x03\x04': 'ZIP_ARCHIVE',
            b'\x1f\x8b': 'GZIP_COMPRESSED',
        }
        
        self.field_types = {
            # Tipos de campos estructurados
            'uint8': (1, '<B'),
            'uint16': (2, '<H'),
            'uint32': (4, '<I'),
            'uint64': (8, '<Q'),
            'int8': (1, '<b'),
            'int16': (2, '<h'),
            'int32': (4, '<i'),
            'int64': (8, '<q'),
            'float': (4, '<f'),
            'double': (8, '<d'),
        }
    
    def identify_file_signature(self, data: bytes) -> Dict[str, Any]:
        """Identificar firma del archivo"""
        signatures_found = []
        
        # Verificar primeros 16 bytes
        header = data[:16]
        
        for sig, file_type in self.structure_signatures.items():
            if data.startswith(sig):
                signatures_found.append({
                    'type': file_type,
                    'offset': 0,
                    'signature': binascii.hexlify(sig).decode()
                })
        
        # Buscar firmas adicionales en todo el archivo
        for sig, file_type in self.structure_signatures.items():
            offset = 0
            while True:
                offset = data.find(sig, offset)
                if offset == -1:
                    break
                if offset > 0:  # No agregar la primera si ya fue detectada
                    signatures_found.append({
                        'type': file_type,
                        'offset': offset,
                        'signature': binascii.hexlify(sig).decode()
                    })
                offset += 1
        
        return {
            'header_hex': binascii.hexlify(header).decode().upper(),
            'signatures': signatures_found,
            'is_encrypted': self._check_encryption(data),
            'is_compressed': self._check_compression(data)
        }
    
    def _check_encryption(self, data: bytes) -> bool:
        """Detectar si los datos están encriptados (alta entropía)"""
        return self._calculate_entropy(data) > 7.5
    
    def _check_compression(self, data: bytes) -> bool:
        """Detectar si los datos están comprimidos"""
        # Intentar descomprimir
        try:
            zlib.decompress(data)
            return True
        except:
            pass
        
        try:
            zlib.decompress(data, -zlib.MAX_WBITS)
            return True
        except:
            pass
        
        return False
    
    def _calculate_entropy(self, data: bytes) -> float:
        """Calcular entropía de Shannon"""
        if not data:
            return 0.0
        
        entropy = 0.0
        counter = Counter(data)
        length = len(data)
        
        for count in counter.values():
            p = count / length
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    def parse_structured_fields(self, data: bytes, offset: int = 0, count: int = 100) -> List[Dict]:
        """Parsear campos estructurados desde offset"""
        fields = []
        
        for i in range(min(count, len(data) - offset - 8)):
            pos = offset + i
            
            # Intentar parsear diferentes tipos de datos
            try:
                # Uint32
                if pos + 4 <= len(data):
                    value_u32 = struct.unpack('<I', data[pos:pos+4])[0]
                    if 1000 < value_u32 < 999999999:  # Rango razonable para montos
                        fields.append({
                            'offset': pos,
                            'type': 'uint32',
                            'value': value_u32,
                            'interpretation': 'possible_amount'
                        })
                
                # Float
                if pos + 4 <= len(data):
                    value_float = struct.unpack('<f', data[pos:pos+4])[0]
                    if 1000.0 < value_float < 999999999.0 and not math.isnan(value_float):
                        fields.append({
                            'offset': pos,
                            'type': 'float',
                            'value': round(value_float, 2),
                            'interpretation': 'possible_decimal_amount'
                        })
                
                # Double
                if pos + 8 <= len(data):
                    value_double = struct.unpack('<d', data[pos:pos+8])[0]
                    if 1000.0 < value_double < 999999999.0 and not math.isnan(value_double):
                        fields.append({
                            'offset': pos,
                            'type': 'double',
                            'value': round(value_double, 2),
                            'interpretation': 'possible_precise_amount'
                        })
            except:
                continue
        
        return fields

class AdvancedPatternDetector:
    """Detector avanzado de patrones financieros"""
    
    def __init__(self):
        # Patrones mejorados con contexto
        self.patterns = {
            # Cuentas bancarias internacionales
            'iban': re.compile(rb'[A-Z]{2}\d{2}[A-Z0-9]{11,30}'),
            'swift': re.compile(rb'[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?'),
            'routing_number': re.compile(rb'\b\d{9}\b'),
            'account_number': re.compile(rb'\b\d{8,22}\b'),
            
            # Montos financieros con formato
            'usd_amount': re.compile(rb'\$\s*[\d,]+\.?\d{0,2}'),
            'eur_amount': re.compile(rb'€\s*[\d,]+\.?\d{0,2}'),
            'gbp_amount': re.compile(rb'£\s*[\d,]+\.?\d{0,2}'),
            'generic_amount': re.compile(rb'(USD|EUR|GBP|CHF|CAD|AUD|JPY|CNY|INR|MXN|BRL|RUB|KRW|SGD|HKD)\s*[\d,]+\.?\d{0,2}'),
            
            # Fechas en múltiples formatos
            'date_iso': re.compile(rb'\d{4}-\d{2}-\d{2}'),
            'date_us': re.compile(rb'\d{2}/\d{2}/\d{4}'),
            'date_eu': re.compile(rb'\d{2}\.\d{2}\.\d{4}'),
            
            # Referencias de transacciones
            'transaction_ref': re.compile(rb'(TRN|REF|ID)[:\s]*[A-Z0-9]{8,32}'),
            'wire_ref': re.compile(rb'(WIRE|TRANSFER)[:\s]*[A-Z0-9]{8,32}'),
            
            # Nombres de bancos
            'bank_name': re.compile(rb'(BANK|BANCO|BANQUE)\s+[A-Z][A-Za-z\s]{3,30}'),
            
            # Códigos de país ISO
            'country_code': re.compile(rb'\b[A-Z]{2}\b'),
            
            # Hashes y checksums
            'sha256': re.compile(rb'[a-f0-9]{64}'),
            'md5': re.compile(rb'[a-f0-9]{32}'),
            
            # Claves y tokens
            'api_key': re.compile(rb'[A-Za-z0-9_\-]{32,}'),
            
            # Estructuras de datos
            'json_like': re.compile(rb'\{["\']?\w+["\']?\s*:\s*["\']?[\w\s\.@\-]+["\']?'),
            'xml_tag': re.compile(rb'<(\w+)>.*?</\1>'),
        }
        
        # Contextos semánticos
        self.semantic_contexts = {
            'account': ['account', 'cuenta', 'konto', 'compte'],
            'balance': ['balance', 'saldo', 'solde', 'bilanz'],
            'transaction': ['transaction', 'transaccion', 'transaktion'],
            'transfer': ['transfer', 'transferencia', 'überweisung'],
            'payment': ['payment', 'pago', 'zahlung', 'paiement'],
            'deposit': ['deposit', 'deposito', 'einzahlung', 'dépôt'],
            'withdrawal': ['withdrawal', 'retiro', 'abhebung', 'retrait'],
        }
    
    def detect_all_patterns(self, data: bytes) -> Dict[str, List[Dict]]:
        """Detectar todos los patrones en los datos"""
        results = {}
        
        for pattern_name, pattern in self.patterns.items():
            matches = []
            for match in pattern.finditer(data):
                match_data = {
                    'offset': match.start(),
                    'value': match.group(0),
                    'decoded': match.group(0).decode('utf-8', errors='ignore'),
                    'hex': binascii.hexlify(match.group(0)).decode(),
                    'context': self._extract_context(data, match.start(), 50)
                }
                matches.append(match_data)
            
            if matches:
                results[pattern_name] = matches
        
        return results
    
    def _extract_context(self, data: bytes, offset: int, radius: int = 50) -> str:
        """Extraer contexto alrededor de un offset"""
        start = max(0, offset - radius)
        end = min(len(data), offset + radius)
        context = data[start:end].decode('utf-8', errors='ignore')
        return context.replace('\n', ' ').replace('\r', ' ').strip()
    
    def detect_semantic_patterns(self, data: bytes) -> Dict[str, int]:
        """Detectar patrones semánticos (palabras clave financieras)"""
        text = data.decode('utf-8', errors='ignore').lower()
        results = {}
        
        for category, keywords in self.semantic_contexts.items():
            count = 0
            for keyword in keywords:
                count += text.count(keyword)
            if count > 0:
                results[category] = count
        
        return results

class StructureInterpreter:
    """Intérprete de estructuras de datos complejas"""
    
    def __init__(self):
        self.known_structures = {
            'ledger_entry': {
                'size': 64,
                'fields': [
                    ('timestamp', 0, 8, 'uint64'),
                    ('account_id', 8, 8, 'uint64'),
                    ('amount', 16, 8, 'double'),
                    ('currency', 24, 3, 'string'),
                    ('transaction_type', 27, 1, 'uint8'),
                    ('reference', 28, 32, 'string'),
                ]
            },
            'balance_record': {
                'size': 32,
                'fields': [
                    ('account_id', 0, 8, 'uint64'),
                    ('balance', 8, 8, 'double'),
                    ('currency', 16, 3, 'string'),
                    ('last_updated', 19, 8, 'uint64'),
                ]
            }
        }
    
    def interpret_as_structure(self, data: bytes, structure_name: str) -> Optional[Dict]:
        """Interpretar datos como estructura conocida"""
        if structure_name not in self.known_structures:
            return None
        
        struct_def = self.known_structures[structure_name]
        
        if len(data) < struct_def['size']:
            return None
        
        result = {}
        
        for field_name, offset, size, field_type in struct_def['fields']:
            try:
                field_data = data[offset:offset+size]
                
                if field_type == 'uint64':
                    result[field_name] = struct.unpack('<Q', field_data)[0]
                elif field_type == 'double':
                    result[field_name] = struct.unpack('<d', field_data)[0]
                elif field_type == 'uint8':
                    result[field_name] = struct.unpack('<B', field_data)[0]
                elif field_type == 'string':
                    result[field_name] = field_data.decode('utf-8', errors='ignore').rstrip('\x00')
                else:
                    result[field_name] = field_data
            except:
                result[field_name] = None
        
        return result
    
    def auto_detect_structure(self, data: bytes) -> List[Dict]:
        """Detectar automáticamente posibles estructuras"""
        detected = []
        
        # Buscar bloques alineados
        for block_size in [16, 32, 64, 128, 256]:
            if len(data) % block_size == 0:
                detected.append({
                    'type': 'aligned_blocks',
                    'block_size': block_size,
                    'block_count': len(data) // block_size,
                    'confidence': 0.7
                })
        
        # Buscar patrones repetitivos
        for stride in [4, 8, 16, 32]:
            pattern_found = self._check_repeating_pattern(data, stride)
            if pattern_found:
                detected.append({
                    'type': 'repeating_structure',
                    'stride': stride,
                    'confidence': 0.8
                })
        
        return detected
    
    def _check_repeating_pattern(self, data: bytes, stride: int) -> bool:
        """Verificar si hay un patrón que se repite cada N bytes"""
        if len(data) < stride * 3:
            return False
        
        matches = 0
        comparisons = 0
        
        for i in range(0, len(data) - stride * 2, stride):
            chunk1 = data[i:i+min(4, stride)]
            chunk2 = data[i+stride:i+stride+min(4, stride)]
            
            if chunk1 == chunk2:
                matches += 1
            comparisons += 1
        
        return comparisons > 0 and (matches / comparisons) > 0.3

class Digital Commercial Bank LtdReverseEngineer:
    """Sistema principal de ingeniería inversa Digital Commercial Bank Ltd"""
    
    def __init__(self):
        self.decompiler = BinaryDecompiler()
        self.pattern_detector = AdvancedPatternDetector()
        self.structure_interpreter = StructureInterpreter()
    
    def full_analysis(self, file_path: str) -> Dict[str, Any]:
        """Análisis completo de ingeniería inversa"""
        print(f"\n🔍 Iniciando análisis profundo de: {file_path}")
        
        # Leer archivo
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
        except Exception as e:
            return {'error': f'No se pudo leer el archivo: {e}'}
        
        file_size = len(data)
        print(f"📊 Tamaño del archivo: {file_size:,} bytes ({file_size/1024:.2f} KB)")
        
        # 1. Identificación de firma
        print("🔬 Identificando firma del archivo...")
        signature_info = self.decompiler.identify_file_signature(data)
        
        # 2. Detección de patrones
        print("🔎 Detectando patrones...")
        patterns = self.pattern_detector.detect_all_patterns(data)
        semantic_patterns = self.pattern_detector.detect_semantic_patterns(data)
        
        # 3. Parseo de campos estructurados
        print("📋 Parseando campos estructurados...")
        structured_fields = self.decompiler.parse_structured_fields(data, 0, 500)
        
        # 4. Detección automática de estructuras
        print("🧩 Detectando estructuras automáticamente...")
        auto_structures = self.structure_interpreter.auto_detect_structure(data)
        
        # 5. Extracción de datos financieros
        print("💰 Extrayendo datos financieros...")
        financial_data = self._extract_financial_data(patterns, structured_fields)
        
        # 6. Metadatos y hashes
        print("🔐 Calculando metadatos...")
        metadata = {
            'file_size': file_size,
            'sha256': hashlib.sha256(data).hexdigest(),
            'md5': hashlib.md5(data).hexdigest(),
            'entropy': self.decompiler._calculate_entropy(data),
            'unique_bytes': len(set(data)),
            'null_bytes': data.count(b'\x00'),
            'printable_ratio': sum(32 <= b < 127 for b in data) / file_size if file_size > 0 else 0
        }
        
        # Compilar resultados
        results = {
            'file_info': {
                'path': file_path,
                'size': file_size,
                'timestamp': datetime.now().isoformat()
            },
            'signature_analysis': signature_info,
            'metadata': metadata,
            'patterns_detected': {
                key: {
                    'count': len(value),
                    'samples': [v['decoded'] for v in value[:5]]
                }
                for key, value in patterns.items()
            },
            'semantic_patterns': semantic_patterns,
            'structured_fields': {
                'total_found': len(structured_fields),
                'by_type': self._group_by_type(structured_fields),
                'high_confidence': [f for f in structured_fields if f.get('value', 0) > 10000][:20]
            },
            'structure_detection': auto_structures,
            'financial_data': financial_data,
            'decompilation_summary': {
                'total_patterns': sum(len(v) for v in patterns.values()),
                'total_fields': len(structured_fields),
                'confidence_level': self._calculate_confidence(patterns, structured_fields),
                'recommended_actions': self._generate_recommendations(patterns, metadata)
            }
        }
        
        print("✅ Análisis completado")
        return results
    
    def _extract_financial_data(self, patterns: Dict, fields: List) -> Dict:
        """Extraer y organizar datos financieros"""
        financial = {
            'accounts': [],
            'amounts': [],
            'transactions': [],
            'banks': [],
            'currencies': set()
        }
        
        # Extraer cuentas
        if 'account_number' in patterns:
            financial['accounts'] = [p['decoded'] for p in patterns['account_number'][:20]]
        
        if 'iban' in patterns:
            financial['accounts'].extend([p['decoded'] for p in patterns['iban'][:20]])
        
        # Extraer montos
        amount_patterns = ['usd_amount', 'eur_amount', 'gbp_amount', 'generic_amount']
        for pattern_name in amount_patterns:
            if pattern_name in patterns:
                for match in patterns[pattern_name][:50]:
                    decoded = match['decoded']
                    financial['amounts'].append({
                        'raw': decoded,
                        'offset': match['offset'],
                        'context': match['context']
                    })
                    
                    # Extraer divisa
                    for currency in ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD']:
                        if currency in decoded.upper():
                            financial['currencies'].add(currency)
        
        # Extraer nombres de bancos
        if 'bank_name' in patterns:
            financial['banks'] = [p['decoded'] for p in patterns['bank_name'][:10]]
        
        # Extraer referencias de transacciones
        if 'transaction_ref' in patterns:
            financial['transactions'] = [p['decoded'] for p in patterns['transaction_ref'][:20]]
        
        financial['currencies'] = list(financial['currencies'])
        
        return financial
    
    def _group_by_type(self, fields: List[Dict]) -> Dict:
        """Agrupar campos por tipo"""
        grouped = defaultdict(list)
        for field in fields:
            grouped[field['type']].append(field['value'])
        return dict(grouped)
    
    def _calculate_confidence(self, patterns: Dict, fields: List) -> float:
        """Calcular nivel de confianza del análisis"""
        score = 0
        
        # Puntos por patrones detectados
        if patterns:
            score += min(len(patterns) * 10, 50)
        
        # Puntos por campos estructurados
        if fields:
            score += min(len(fields) / 10, 30)
        
        # Puntos por patrones financieros clave
        key_patterns = ['iban', 'swift', 'account_number', 'usd_amount']
        for key in key_patterns:
            if key in patterns and patterns[key]:
                score += 5
        
        return min(score, 100)
    
    def _generate_recommendations(self, patterns: Dict, metadata: Dict) -> List[str]:
        """Generar recomendaciones basadas en el análisis"""
        recommendations = []
        
        if metadata['entropy'] > 7.5:
            recommendations.append("⚠️ Alta entropía detectada - posible encriptación. Considerar desencriptar primero.")
        
        if metadata['null_bytes'] > metadata['file_size'] * 0.3:
            recommendations.append("📦 Alto porcentaje de bytes nulos - posible formato con padding.")
        
        if 'iban' in patterns and patterns['iban']:
            recommendations.append("✅ IBANs detectados - archivo contiene datos bancarios internacionales.")
        
        if 'swift' in patterns and patterns['swift']:
            recommendations.append("✅ Códigos SWIFT detectados - transacciones interbancarias presentes.")
        
        if not patterns:
            recommendations.append("🔍 Pocos patrones detectados - considerar análisis manual o herramientas especializadas.")
        
        return recommendations
    
    def export_report(self, results: Dict, output_path: str):
        """Exportar reporte completo"""
        # JSON completo
        json_path = output_path.replace('.txt', '.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        
        # Reporte legible
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(self._format_report(results))
        
        print(f"\n📄 Reporte exportado:")
        print(f"   JSON: {json_path}")
        print(f"   TXT:  {output_path}")
    
    def _format_report(self, results: Dict) -> str:
        """Formatear reporte legible"""
        report = f"""
{'='*80}
REPORTE DE INGENIERÍA INVERSA Digital Commercial Bank Ltd
{'='*80}
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Archivo: {results['file_info']['path']}
Tamaño: {results['file_info']['size']:,} bytes

{'='*80}
METADATOS
{'='*80}
SHA-256:           {results['metadata']['sha256']}
MD5:               {results['metadata']['md5']}
Entropía:          {results['metadata']['entropy']:.2f} bits/byte
Bytes únicos:      {results['metadata']['unique_bytes']}
Bytes nulos:       {results['metadata']['null_bytes']:,}
Ratio imprimible:  {results['metadata']['printable_ratio']:.2%}

{'='*80}
ANÁLISIS DE FIRMA
{'='*80}
Header (hex):      {results['signature_analysis']['header_hex']}
Encriptado:        {'SÍ' if results['signature_analysis']['is_encrypted'] else 'NO'}
Comprimido:        {'SÍ' if results['signature_analysis']['is_compressed'] else 'NO'}
Firmas encontradas: {len(results['signature_analysis']['signatures'])}

{'='*80}
PATRONES DETECTADOS
{'='*80}
"""
        
        for pattern_name, pattern_data in results['patterns_detected'].items():
            report += f"\n{pattern_name.upper()}: {pattern_data['count']} ocurrencias\n"
            if pattern_data['samples']:
                for sample in pattern_data['samples'][:3]:
                    report += f"  • {sample}\n"
        
        report += f"""
{'='*80}
DATOS FINANCIEROS EXTRAÍDOS
{'='*80}
Cuentas detectadas:      {len(results['financial_data']['accounts'])}
Montos detectados:       {len(results['financial_data']['amounts'])}
Transacciones:           {len(results['financial_data']['transactions'])}
Bancos identificados:    {len(results['financial_data']['banks'])}
Divisas encontradas:     {', '.join(results['financial_data']['currencies'])}

{'='*80}
RESUMEN DE DECOMPILACIÓN
{'='*80}
Total de patrones:   {results['decompilation_summary']['total_patterns']}
Campos detectados:   {results['decompilation_summary']['total_fields']}
Nivel de confianza:  {results['decompilation_summary']['confidence_level']:.1f}%

RECOMENDACIONES:
"""
        
        for rec in results['decompilation_summary']['recommended_actions']:
            report += f"  {rec}\n"
        
        report += f"\n{'='*80}\n"
        
        return report

def main():
    """Función principal de demostración"""
    import sys
    
    print("""
╔═══════════════════════════════════════════════════════════════════════╗
║     Digital Commercial Bank Ltd ADVANCED REVERSE ENGINEERING SYSTEM                        ║
║     Sistema de Ingeniería Inversa y Análisis Profundo               ║
╚═══════════════════════════════════════════════════════════════════════╝
""")
    
    if len(sys.argv) < 2:
        print("Uso: python Digital Commercial Bank Ltd_advanced_reverse_engineer.py <archivo_Digital Commercial Bank Ltd>")
        print("\nCreando archivo de prueba...")
        
        # Crear archivo de prueba
        test_file = "test_Digital Commercial Bank Ltd_sample.bin"
        with open(test_file, 'wb') as f:
            # Header
            f.write(b'DTCB')
            f.write(struct.pack('<I', 12345))
            
            # Datos de cuenta
            f.write(b'ACCN')
            f.write(b'GB29NWBK60161331926819')  # IBAN
            f.write(b'\x00' * 10)
            
            # Monto
            f.write(b'USD ')
            f.write(struct.pack('<d', 1500000.50))
            
            # Banco
            f.write(b'BANK HSBC HOLDINGS')
            
            # Transacción
            f.write(b'TRN:ABC123XYZ789')
            
            # Padding
            f.write(b'\x00' * 100)
        
        print(f"✅ Archivo de prueba creado: {test_file}")
        file_path = test_file
    else:
        file_path = sys.argv[1]
    
    # Ejecutar análisis
    engineer = Digital Commercial Bank LtdReverseEngineer()
    results = engineer.full_analysis(file_path)
    
    # Exportar reporte
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_path = f"Digital Commercial Bank Ltd_reverse_engineering_{timestamp}.txt"
    engineer.export_report(results, report_path)
    
    print("\n✅ Análisis completado exitosamente")
    print(f"📊 Nivel de confianza: {results['decompilation_summary']['confidence_level']:.1f}%")

if __name__ == "__main__":
    main()


