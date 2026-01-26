// ═══════════════════════════════════════════════════════════════════════════════
// FXDEFI.WORLD - WHITEPAPER v1.0
// The Future of Tokenized Forex - Professional Documentation
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Globe, TrendingUp, Shield, Zap, Database, Lock, Coins,
  BarChart3, Network, Layers, Clock, CheckCircle, ArrowRight, ChevronDown,
  ChevronUp, BookOpen, FileText, Download, ExternalLink, Target, Users,
  Building2, Wallet, Activity, Bot, Brain, Cpu, Server, Radio, Eye
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// THEME - LemonMinted Dark Theme
// ═══════════════════════════════════════════════════════════════════════════════

const theme = {
  bg: {
    primary: '#0a0a0a',
    secondary: '#111111',
    tertiary: '#1a1a1a',
    card: '#0f0f0f'
  },
  text: {
    primary: '#ffffff',
    secondary: '#a0a0a0',
    muted: '#666666'
  },
  accent: {
    lemon: '#A3E635',
    lime: '#84CC16',
    green: '#22C55E'
  },
  border: {
    primary: '#2a2a2a',
    secondary: '#333333'
  },
  gradient: {
    lemon: 'linear-gradient(135deg, #A3E635 0%, #84CC16 100%)'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  en: {
    backToFxDefi: 'Back to FxDefi',
    whitepaper: 'Whitepaper',
    version: 'Version 1.0 - January 2026',
    tableOfContents: 'Table of Contents',
    
    // Section titles
    executiveSummary: 'Executive Summary',
    theForexMarket: 'The Forex Market: The Largest in the World',
    problemStatement: 'Problem Statement',
    solutionOverview: 'Solution: FxDefi Protocol',
    tokenizedCurrencies: 'Tokenized Currencies (V-Currencies)',
    tokenizedCommodities: 'Tokenized Commodities',
    platformArchitecture: 'Platform Architecture',
    tradingFeatures: 'Trading Features',
    aiIntegration: 'AI & Algorithmic Trading',
    securityCompliance: 'Security & Compliance',
    roadmap: 'Development Roadmap',
    tokenomics: 'Tokenomics',
    conclusion: 'Conclusion',
    
    // Executive Summary
    execSummaryP1: 'FxDefi represents a paradigm shift in global finance. We are entering the largest market on Earth—the $7.5 trillion daily forex ecosystem—to fundamentally transform how currencies are traded. Through blockchain technology on LemonChain, we are pioneering the tokenization of traditional forex assets, bringing unprecedented transparency, efficiency, and accessibility to an industry that has remained largely unchanged for decades.',
    execSummaryP2: 'Our vision is to become the bridge between traditional finance and the decentralized future. FxDefi enables 24/7 trading of 15 major tokenized currencies and 15 commodities, with institutional-grade infrastructure, sub-3-second settlement, and complete on-chain transparency—opening the doors of the world\'s most liquid market to everyone.',
    
    // Forex Market Section
    forexTitle: 'Understanding the Forex Market',
    forexP1: 'The Foreign Exchange (Forex) market is the undisputed king of global financial markets. With a daily trading volume exceeding $7.5 trillion, it dwarfs all other markets combined:',
    forexComparison: 'Market Volume Comparison',
    forexMarket: 'Forex Market',
    stockMarket: 'Global Stock Markets',
    cryptoMarket: 'Cryptocurrency Market',
    bondMarket: 'Bond Market',
    forexP2: 'The forex market operates 24 hours a day, 5 days a week, spanning all time zones from Sydney to New York. It is the backbone of international trade, enabling businesses, governments, and individuals to convert currencies for commerce, investment, and speculation.',
    forexP3: 'Despite its size and importance, the traditional forex market suffers from significant inefficiencies:',
    forexIssue1: 'Centralized intermediaries extract billions in fees',
    forexIssue2: 'Settlement takes 2-3 business days (T+2)',
    forexIssue3: 'Limited access for retail traders',
    forexIssue4: 'Lack of transparency in pricing',
    forexIssue5: 'High barriers to entry for smaller participants',
    
    // Problem Statement
    problemTitle: 'The Problem with Traditional Forex',
    problemP1: 'Traditional forex trading is dominated by large banks and financial institutions that act as market makers. This creates several systemic issues:',
    problemIssue1: 'Counterparty Risk',
    problemIssue1Desc: 'Traders must trust centralized exchanges and brokers with their funds',
    problemIssue2: 'Opaque Pricing',
    problemIssue2Desc: 'Spreads and fees are often hidden or manipulated',
    problemIssue3: 'Settlement Delays',
    problemIssue3Desc: 'T+2 settlement creates capital inefficiency',
    problemIssue4: 'Geographic Restrictions',
    problemIssue4Desc: 'Many regions have limited access to forex markets',
    problemIssue5: 'High Costs',
    problemIssue5Desc: 'Multiple intermediaries add layers of fees',
    
    // Solution
    solutionTitle: 'FxDefi: The Decentralized Solution',
    solutionP1: 'FxDefi tokenizes traditional fiat currencies on LemonChain, creating a truly decentralized forex market. Each V-Currency (VUSD, VEUR, VGBP, etc.) is fully backed 1:1 by reserves held in regulated custody accounts.',
    solutionBenefit1: 'Instant Settlement',
    solutionBenefit1Desc: 'Trades settle in under 3 seconds on LemonChain',
    solutionBenefit2: 'True Ownership',
    solutionBenefit2Desc: 'Users maintain custody of their assets at all times',
    solutionBenefit3: 'Transparent Pricing',
    solutionBenefit3Desc: 'Real-time price feeds from institutional FX data providers',
    solutionBenefit4: 'Global Access',
    solutionBenefit4Desc: '24/7 trading from anywhere in the world',
    solutionBenefit5: 'Deep Liquidity',
    solutionBenefit5Desc: 'Institutional-grade order books with tight spreads',
    
    // V-Currencies
    currenciesTitle: '15 Tokenized Currencies',
    currenciesP1: 'FxDefi launches with 15 major world currencies, each tokenized with full reserve backing:',
    currenciesP2: 'Each V-Currency maintains a 1:1 peg with its underlying fiat currency through:',
    currencyMechanism1: 'Proof of Reserves audits published on-chain',
    currencyMechanism2: 'Real-time price feeds from multiple institutional sources',
    currencyMechanism3: 'Arbitrage incentives for market makers',
    currencyMechanism4: 'Automated rebalancing mechanisms',
    
    // Commodities
    commoditiesTitle: '15 Tokenized Commodities',
    commoditiesP1: 'Beyond currencies, FxDefi enables trading of tokenized commodities, bringing precious metals, energy, and agricultural products on-chain:',
    commoditiesCategory1: 'Precious Metals',
    commoditiesCategory2: 'Energy',
    commoditiesCategory3: 'Agriculture',
    
    // Platform Architecture
    architectureTitle: 'Technical Architecture',
    architectureP1: 'FxDefi is built on LemonChain, a high-performance EVM-compatible blockchain optimized for financial applications:',
    archFeature1: 'LemonChain Integration',
    archFeature1Desc: 'Native integration with LemonChain\'s high-throughput consensus',
    archFeature2: 'Smart Contract Engine',
    archFeature2Desc: 'Audited Solidity contracts for order matching and settlement',
    archFeature3: 'Price Feed Network',
    archFeature3Desc: 'Decentralized price feeds from multiple institutional providers',
    archFeature4: 'Order Book Engine',
    archFeature4Desc: 'On-chain limit order books with MEV protection',
    
    // Trading Features
    tradingTitle: 'Professional Trading Features',
    tradingP1: 'FxDefi provides institutional-grade trading capabilities:',
    tradingFeature1: 'Advanced Order Types',
    tradingFeature1Desc: 'Market, Limit, Stop-Loss, Take-Profit, OCO, Trailing Stop',
    tradingFeature2: 'Deep Order Books',
    tradingFeature2Desc: 'Multiple price levels with real-time depth visualization',
    tradingFeature3: 'Technical Analysis',
    tradingFeature3Desc: 'Integrated charting with 50+ indicators',
    tradingFeature4: 'Portfolio Management',
    tradingFeature4Desc: 'Multi-currency portfolios with P&L tracking',
    
    // AI Integration
    aiTitle: 'AI-Powered Trading',
    aiP1: 'FxDefi integrates cutting-edge artificial intelligence for enhanced trading:',
    aiFeature1: 'Predictive Analytics',
    aiFeature1Desc: 'ML models trained on historical forex data for price predictions',
    aiFeature2: 'Sentiment Analysis',
    aiFeature2Desc: 'Real-time analysis of news and social media for market sentiment',
    aiFeature3: 'Automated Trading Bots',
    aiFeature3Desc: 'Customizable trading algorithms with risk management',
    aiFeature4: 'Smart Signals',
    aiFeature4Desc: 'AI-generated trading signals with confidence scores',
    
    // Security
    securityTitle: 'Security & Compliance',
    securityP1: 'FxDefi prioritizes security at every layer:',
    secFeature1: 'Smart Contract Audits',
    secFeature1Desc: 'Multiple audits by leading security firms (CertiK, OpenZeppelin)',
    secFeature2: 'Reserve Transparency',
    secFeature2Desc: 'Real-time proof of reserves with monthly third-party attestations',
    secFeature3: 'Regulatory Compliance',
    secFeature3Desc: 'KYC/AML integration with licensed partners',
    secFeature4: 'Insurance Fund',
    secFeature4Desc: 'Protocol insurance pool for black swan events',
    
    // Roadmap
    roadmapTitle: 'Development Roadmap',
    roadmapQ1: 'Q1 2026',
    roadmapQ1Items: ['Mainnet Launch', 'Initial 15 Currency Pairs', 'Basic Trading Interface', 'Mobile App Beta'],
    roadmapQ2: 'Q2 2026',
    roadmapQ2Items: ['Commodities Trading', 'AI Trading Bots', 'Institutional API', 'Leverage Trading'],
    roadmapQ3: 'Q3 2026',
    roadmapQ3Items: ['Options & Derivatives', 'Social Trading', 'Cross-chain Bridges', 'Governance Token'],
    roadmapQ4: 'Q4 2026',
    roadmapQ4Items: ['100+ Currency Pairs', 'Decentralized Governance', 'Layer 2 Scaling', 'Global Partnerships'],
    
    // Tokenomics
    tokenomicsTitle: 'Tokenomics',
    tokenomicsP1: 'The FXD governance token powers the FxDefi ecosystem:',
    tokenAllocation: 'Token Allocation',
    tokenAlloc1: 'Community & Ecosystem',
    tokenAlloc2: 'Team & Advisors',
    tokenAlloc3: 'Treasury',
    tokenAlloc4: 'Liquidity Mining',
    tokenAlloc5: 'Strategic Partners',
    tokenUtility: 'Token Utility',
    tokenUtil1: 'Governance voting on protocol parameters',
    tokenUtil2: 'Fee discounts for traders',
    tokenUtil3: 'Staking rewards for liquidity providers',
    tokenUtil4: 'Access to premium AI features',
    
    // Conclusion
    conclusionTitle: 'The Future is Tokenized',
    conclusionP1: 'FxDefi is not just another trading platform—it is the foundation for a new global financial system. By bringing the world\'s largest market on-chain, we are:',
    conclusionPoint1: 'Democratizing access to forex trading for billions of people',
    conclusionPoint2: 'Eliminating trillions in unnecessary intermediary costs',
    conclusionPoint3: 'Creating a transparent, fair, and efficient market',
    conclusionPoint4: 'Building the infrastructure for the tokenized economy',
    conclusionP2: 'Join us in building the future of forex. The revolution starts in 2026.',
    
    downloadPdf: 'Download PDF',
    lastUpdated: 'Last Updated: January 2026'
  },
  es: {
    backToFxDefi: 'Volver a FxDefi',
    whitepaper: 'Libro Blanco',
    version: 'Versión 1.0 - Enero 2026',
    tableOfContents: 'Tabla de Contenidos',
    
    // Section titles
    executiveSummary: 'Resumen Ejecutivo',
    theForexMarket: 'El Mercado Forex: El Más Grande del Mundo',
    problemStatement: 'Declaración del Problema',
    solutionOverview: 'Solución: Protocolo FxDefi',
    tokenizedCurrencies: 'Divisas Tokenizadas (V-Currencies)',
    tokenizedCommodities: 'Commodities Tokenizados',
    platformArchitecture: 'Arquitectura de la Plataforma',
    tradingFeatures: 'Funcionalidades de Trading',
    aiIntegration: 'IA y Trading Algorítmico',
    securityCompliance: 'Seguridad y Cumplimiento',
    roadmap: 'Hoja de Ruta',
    tokenomics: 'Tokenomics',
    conclusion: 'Conclusión',
    
    // Executive Summary
    execSummaryP1: 'FxDefi representa un cambio de paradigma en las finanzas globales. Estamos entrando al mercado más grande del planeta—el ecosistema forex de $7.5 billones diarios—para transformar fundamentalmente cómo se operan las divisas. A través de tecnología blockchain en LemonChain, estamos siendo pioneros en la tokenización de activos forex tradicionales, trayendo transparencia, eficiencia y accesibilidad sin precedentes a una industria que ha permanecido prácticamente sin cambios durante décadas.',
    execSummaryP2: 'Nuestra visión es convertirnos en el puente entre las finanzas tradicionales y el futuro descentralizado. FxDefi permite trading 24/7 de 15 divisas tokenizadas principales y 15 commodities, con infraestructura de grado institucional, liquidación en menos de 3 segundos y transparencia completa on-chain—abriendo las puertas del mercado más líquido del mundo a todos.',
    
    // Forex Market Section
    forexTitle: 'Entendiendo el Mercado Forex',
    forexP1: 'El mercado de Divisas (Forex) es el rey indiscutible de los mercados financieros globales. Con un volumen diario de trading que supera los $7.5 billones, empequeñece a todos los demás mercados combinados:',
    forexComparison: 'Comparación de Volumen de Mercado',
    forexMarket: 'Mercado Forex',
    stockMarket: 'Mercados Bursátiles Globales',
    cryptoMarket: 'Mercado de Criptomonedas',
    bondMarket: 'Mercado de Bonos',
    forexP2: 'El mercado forex opera 24 horas al día, 5 días a la semana, abarcando todas las zonas horarias desde Sydney hasta Nueva York. Es la columna vertebral del comercio internacional, permitiendo a empresas, gobiernos e individuos convertir divisas para comercio, inversión y especulación.',
    forexP3: 'A pesar de su tamaño e importancia, el mercado forex tradicional sufre de ineficiencias significativas:',
    forexIssue1: 'Intermediarios centralizados extraen miles de millones en comisiones',
    forexIssue2: 'La liquidación toma 2-3 días hábiles (T+2)',
    forexIssue3: 'Acceso limitado para traders minoristas',
    forexIssue4: 'Falta de transparencia en precios',
    forexIssue5: 'Altas barreras de entrada para participantes pequeños',
    
    // Problem Statement
    problemTitle: 'El Problema con el Forex Tradicional',
    problemP1: 'El trading forex tradicional está dominado por grandes bancos e instituciones financieras que actúan como creadores de mercado. Esto crea varios problemas sistémicos:',
    problemIssue1: 'Riesgo de Contraparte',
    problemIssue1Desc: 'Los traders deben confiar en exchanges y brokers centralizados con sus fondos',
    problemIssue2: 'Precios Opacos',
    problemIssue2Desc: 'Los spreads y comisiones frecuentemente están ocultos o manipulados',
    problemIssue3: 'Retrasos en Liquidación',
    problemIssue3Desc: 'La liquidación T+2 crea ineficiencia de capital',
    problemIssue4: 'Restricciones Geográficas',
    problemIssue4Desc: 'Muchas regiones tienen acceso limitado a mercados forex',
    problemIssue5: 'Costos Elevados',
    problemIssue5Desc: 'Múltiples intermediarios añaden capas de comisiones',
    
    // Solution
    solutionTitle: 'FxDefi: La Solución Descentralizada',
    solutionP1: 'FxDefi tokeniza las divisas fiduciarias tradicionales en LemonChain, creando un mercado forex verdaderamente descentralizado. Cada V-Currency (VUSD, VEUR, VGBP, etc.) está completamente respaldada 1:1 por reservas mantenidas en cuentas de custodia reguladas.',
    solutionBenefit1: 'Liquidación Instantánea',
    solutionBenefit1Desc: 'Las operaciones se liquidan en menos de 3 segundos en LemonChain',
    solutionBenefit2: 'Propiedad Real',
    solutionBenefit2Desc: 'Los usuarios mantienen custodia de sus activos en todo momento',
    solutionBenefit3: 'Precios Transparentes',
    solutionBenefit3Desc: 'Feeds de precios en tiempo real de proveedores FX institucionales',
    solutionBenefit4: 'Acceso Global',
    solutionBenefit4Desc: 'Trading 24/7 desde cualquier parte del mundo',
    solutionBenefit5: 'Liquidez Profunda',
    solutionBenefit5Desc: 'Libros de órdenes de grado institucional con spreads ajustados',
    
    // V-Currencies
    currenciesTitle: '15 Divisas Tokenizadas',
    currenciesP1: 'FxDefi lanza con 15 divisas mundiales principales, cada una tokenizada con respaldo total de reservas:',
    currenciesP2: 'Cada V-Currency mantiene una paridad 1:1 con su divisa fiduciaria subyacente a través de:',
    currencyMechanism1: 'Auditorías de Prueba de Reservas publicadas on-chain',
    currencyMechanism2: 'Feeds de precios en tiempo real de múltiples fuentes institucionales',
    currencyMechanism3: 'Incentivos de arbitraje para creadores de mercado',
    currencyMechanism4: 'Mecanismos de rebalanceo automatizado',
    
    // Commodities
    commoditiesTitle: '15 Commodities Tokenizados',
    commoditiesP1: 'Más allá de las divisas, FxDefi permite el trading de commodities tokenizados, llevando metales preciosos, energía y productos agrícolas a la blockchain:',
    commoditiesCategory1: 'Metales Preciosos',
    commoditiesCategory2: 'Energía',
    commoditiesCategory3: 'Agricultura',
    
    // Platform Architecture
    architectureTitle: 'Arquitectura Técnica',
    architectureP1: 'FxDefi está construido sobre LemonChain, una blockchain de alto rendimiento compatible con EVM optimizada para aplicaciones financieras:',
    archFeature1: 'Integración LemonChain',
    archFeature1Desc: 'Integración nativa con el consenso de alto rendimiento de LemonChain',
    archFeature2: 'Motor de Smart Contracts',
    archFeature2Desc: 'Contratos Solidity auditados para matching de órdenes y liquidación',
    archFeature3: 'Red de Precios',
    archFeature3Desc: 'Feeds de precios descentralizados de múltiples proveedores institucionales',
    archFeature4: 'Motor de Libro de Órdenes',
    archFeature4Desc: 'Libros de órdenes límite on-chain con protección MEV',
    
    // Trading Features
    tradingTitle: 'Funcionalidades de Trading Profesional',
    tradingP1: 'FxDefi proporciona capacidades de trading de grado institucional:',
    tradingFeature1: 'Tipos de Órdenes Avanzadas',
    tradingFeature1Desc: 'Market, Límite, Stop-Loss, Take-Profit, OCO, Trailing Stop',
    tradingFeature2: 'Libros de Órdenes Profundos',
    tradingFeature2Desc: 'Múltiples niveles de precio con visualización de profundidad en tiempo real',
    tradingFeature3: 'Análisis Técnico',
    tradingFeature3Desc: 'Gráficos integrados con más de 50 indicadores',
    tradingFeature4: 'Gestión de Portafolio',
    tradingFeature4Desc: 'Portafolios multi-divisa con seguimiento de P&L',
    
    // AI Integration
    aiTitle: 'Trading Potenciado por IA',
    aiP1: 'FxDefi integra inteligencia artificial de vanguardia para trading mejorado:',
    aiFeature1: 'Analítica Predictiva',
    aiFeature1Desc: 'Modelos ML entrenados con datos históricos forex para predicciones de precio',
    aiFeature2: 'Análisis de Sentimiento',
    aiFeature2Desc: 'Análisis en tiempo real de noticias y redes sociales para sentimiento de mercado',
    aiFeature3: 'Bots de Trading Automatizado',
    aiFeature3Desc: 'Algoritmos de trading personalizables con gestión de riesgo',
    aiFeature4: 'Señales Inteligentes',
    aiFeature4Desc: 'Señales de trading generadas por IA con puntuaciones de confianza',
    
    // Security
    securityTitle: 'Seguridad y Cumplimiento',
    securityP1: 'FxDefi prioriza la seguridad en cada capa:',
    secFeature1: 'Auditorías de Smart Contracts',
    secFeature1Desc: 'Múltiples auditorías por firmas de seguridad líderes (CertiK, OpenZeppelin)',
    secFeature2: 'Transparencia de Reservas',
    secFeature2Desc: 'Prueba de reservas en tiempo real con attestations mensuales de terceros',
    secFeature3: 'Cumplimiento Regulatorio',
    secFeature3Desc: 'Integración KYC/AML con partners licenciados',
    secFeature4: 'Fondo de Seguro',
    secFeature4Desc: 'Pool de seguro del protocolo para eventos cisne negro',
    
    // Roadmap
    roadmapTitle: 'Hoja de Ruta de Desarrollo',
    roadmapQ1: 'Q1 2026',
    roadmapQ1Items: ['Lanzamiento Mainnet', '15 Pares de Divisas Iniciales', 'Interfaz de Trading Básica', 'App Móvil Beta'],
    roadmapQ2: 'Q2 2026',
    roadmapQ2Items: ['Trading de Commodities', 'Bots de Trading IA', 'API Institucional', 'Trading con Apalancamiento'],
    roadmapQ3: 'Q3 2026',
    roadmapQ3Items: ['Opciones y Derivados', 'Trading Social', 'Puentes Cross-chain', 'Token de Gobernanza'],
    roadmapQ4: 'Q4 2026',
    roadmapQ4Items: ['100+ Pares de Divisas', 'Gobernanza Descentralizada', 'Escalado Layer 2', 'Alianzas Globales'],
    
    // Tokenomics
    tokenomicsTitle: 'Tokenomics',
    tokenomicsP1: 'El token de gobernanza FXD potencia el ecosistema FxDefi:',
    tokenAllocation: 'Asignación de Tokens',
    tokenAlloc1: 'Comunidad y Ecosistema',
    tokenAlloc2: 'Equipo y Asesores',
    tokenAlloc3: 'Tesorería',
    tokenAlloc4: 'Minería de Liquidez',
    tokenAlloc5: 'Partners Estratégicos',
    tokenUtility: 'Utilidad del Token',
    tokenUtil1: 'Votación de gobernanza en parámetros del protocolo',
    tokenUtil2: 'Descuentos en comisiones para traders',
    tokenUtil3: 'Recompensas de staking para proveedores de liquidez',
    tokenUtil4: 'Acceso a funciones premium de IA',
    
    // Conclusion
    conclusionTitle: 'El Futuro es Tokenizado',
    conclusionP1: 'FxDefi no es solo otra plataforma de trading—es la base para un nuevo sistema financiero global. Al llevar el mercado más grande del mundo a la blockchain, estamos:',
    conclusionPoint1: 'Democratizando el acceso al trading forex para miles de millones de personas',
    conclusionPoint2: 'Eliminando billones en costos innecesarios de intermediarios',
    conclusionPoint3: 'Creando un mercado transparente, justo y eficiente',
    conclusionPoint4: 'Construyendo la infraestructura para la economía tokenizada',
    conclusionP2: 'Únete a nosotros en la construcción del futuro del forex. La revolución comienza en 2026.',
    
    downloadPdf: 'Descargar PDF',
    lastUpdated: 'Última Actualización: Enero 2026'
  }
};

// Currency data
const CURRENCIES = [
  { code: 'VUSD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'VEUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'VGBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'VJPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'VCHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'VAUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'VCAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'VNZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'VCNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'VHKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'VSGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'VSEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'VNOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'VMXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'VKRW', name: 'South Korean Won', flag: '🇰🇷' }
];

const COMMODITIES = {
  precious: [
    { code: 'VAU', name: 'Gold' },
    { code: 'VAG', name: 'Silver' },
    { code: 'VPT', name: 'Platinum' },
    { code: 'VPD', name: 'Palladium' }
  ],
  energy: [
    { code: 'VTI', name: 'Crude Oil (WTI)' },
    { code: 'VBR', name: 'Brent Crude' },
    { code: 'VNG', name: 'Natural Gas' },
    { code: 'VCL', name: 'Coal' }
  ],
  agriculture: [
    { code: 'VWH', name: 'Wheat' },
    { code: 'VCN', name: 'Corn' },
    { code: 'VSY', name: 'Soybeans' },
    { code: 'VCF', name: 'Coffee' },
    { code: 'VSU', name: 'Sugar' },
    { code: 'VCT', name: 'Cotton' },
    { code: 'VCU', name: 'Copper' }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface FxDefiWhitepaperProps {
  language?: 'en' | 'es';
  onBack?: () => void;
}

const FxDefiWhitepaper: React.FC<FxDefiWhitepaperProps> = ({ language: propLanguage, onBack }) => {
  const [language, setLanguage] = useState<'en' | 'es'>(propLanguage || 'en');
  const [activeSection, setActiveSection] = useState('executive-summary');
  const [expandedSections, setExpandedSections] = useState<string[]>(['executive-summary']);
  
  // Update language when prop changes
  useEffect(() => {
    if (propLanguage) setLanguage(propLanguage);
  }, [propLanguage]);
  
  const t = translations[language];

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Toggle section in TOC
  const toggleSection = (sectionId: string) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(s => s !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  // Table of contents items
  const tocItems = [
    { id: 'executive-summary', title: t.executiveSummary, icon: FileText },
    { id: 'forex-market', title: t.theForexMarket, icon: Globe },
    { id: 'problem-statement', title: t.problemStatement, icon: Target },
    { id: 'solution', title: t.solutionOverview, icon: Zap },
    { id: 'currencies', title: t.tokenizedCurrencies, icon: Coins },
    { id: 'commodities', title: t.tokenizedCommodities, icon: BarChart3 },
    { id: 'architecture', title: t.platformArchitecture, icon: Layers },
    { id: 'trading', title: t.tradingFeatures, icon: Activity },
    { id: 'ai', title: t.aiIntegration, icon: Brain },
    { id: 'security', title: t.securityCompliance, icon: Shield },
    { id: 'roadmap', title: t.roadmap, icon: Clock },
    { id: 'tokenomics', title: t.tokenomics, icon: Coins },
    { id: 'conclusion', title: t.conclusion, icon: CheckCircle }
  ];

  // Generate and download PDF
  const downloadPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF');
      return;
    }

    const currentT = translations[language];
    
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FxDefi.world - Whitepaper v1.0</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: white;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      padding-bottom: 40px;
      border-bottom: 3px solid #A3E635;
      margin-bottom: 40px;
    }
    
    .header h1 {
      font-size: 36px;
      font-weight: 800;
      color: #A3E635;
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 16px;
    }
    
    .header .version {
      font-size: 12px;
      color: #999;
      padding: 6px 16px;
      background: #f5f5f5;
      border-radius: 20px;
      display: inline-block;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #A3E635;
    }
    
    .section-title h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .section-icon {
      width: 32px;
      height: 32px;
      background: #A3E635;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    
    p {
      font-size: 14px;
      color: #444;
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .stat-card .value {
      font-size: 24px;
      font-weight: 800;
      color: #A3E635;
    }
    
    .stat-card .label {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
    
    ul {
      list-style: none;
      margin: 16px 0;
    }
    
    ul li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      font-size: 13px;
      color: #555;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    
    ul li::before {
      content: '✓';
      color: #A3E635;
      font-weight: bold;
    }
    
    .highlight-box {
      background: #f9fdf5;
      border: 1px solid #A3E63530;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
    }
    
    .highlight-box h4 {
      color: #A3E635;
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .currency-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin: 16px 0;
    }
    
    .currency-card {
      background: #f5f5f5;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
      font-size: 11px;
    }
    
    .currency-card .code {
      font-weight: 700;
      color: #A3E635;
    }
    
    .roadmap-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    
    .roadmap-card {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 16px;
    }
    
    .roadmap-card h4 {
      color: #A3E635;
      font-size: 13px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }
    
    .roadmap-card li::before {
      content: '•';
    }
    
    .footer {
      text-align: center;
      padding-top: 40px;
      border-top: 2px solid #A3E635;
      margin-top: 40px;
    }
    
    .footer p {
      font-size: 12px;
      color: #888;
    }
    
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FxDefi.world</h1>
    <p class="subtitle">The Future of Tokenized Forex Trading</p>
    <span class="version">${currentT.version}</span>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">1</div>
      <h2>${currentT.executiveSummary}</h2>
    </div>
    <p>${currentT.execSummaryP1}</p>
    <p>${currentT.execSummaryP2}</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">$7.5T</div><div class="label">Daily Volume</div></div>
      <div class="stat-card"><div class="value">15+</div><div class="label">Currencies</div></div>
      <div class="stat-card"><div class="value">15</div><div class="label">Commodities</div></div>
      <div class="stat-card"><div class="value">&lt;3s</div><div class="label">Settlement</div></div>
    </div>
  </div>

  <!-- Forex Market -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">2</div>
      <h2>${currentT.theForexMarket}</h2>
    </div>
    <p>${currentT.forexP1}</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">$7.5T</div><div class="label">${currentT.forexMarket}</div></div>
      <div class="stat-card"><div class="value">$500B</div><div class="label">${currentT.stockMarket}</div></div>
      <div class="stat-card"><div class="value">$150B</div><div class="label">${currentT.cryptoMarket}</div></div>
      <div class="stat-card"><div class="value">$1.2T</div><div class="label">${currentT.bondMarket}</div></div>
    </div>
    <p>${currentT.forexP2}</p>
    <p>${currentT.forexP3}</p>
    <ul>
      <li>${currentT.forexIssue1}</li>
      <li>${currentT.forexIssue2}</li>
      <li>${currentT.forexIssue3}</li>
      <li>${currentT.forexIssue4}</li>
      <li>${currentT.forexIssue5}</li>
    </ul>
  </div>

  <!-- Problem Statement -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">3</div>
      <h2>${currentT.problemStatement}</h2>
    </div>
    <p>${currentT.problemP1}</p>
    <div class="highlight-box">
      <h4>${currentT.problemIssue1}</h4>
      <p>${currentT.problemIssue1Desc}</p>
    </div>
    <div class="highlight-box">
      <h4>${currentT.problemIssue2}</h4>
      <p>${currentT.problemIssue2Desc}</p>
    </div>
    <div class="highlight-box">
      <h4>${currentT.problemIssue3}</h4>
      <p>${currentT.problemIssue3Desc}</p>
    </div>
  </div>

  <!-- Solution -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">4</div>
      <h2>${currentT.solutionOverview}</h2>
    </div>
    <p>${currentT.solutionP1}</p>
    <ul>
      <li><strong>${currentT.solutionBenefit1}:</strong> ${currentT.solutionBenefit1Desc}</li>
      <li><strong>${currentT.solutionBenefit2}:</strong> ${currentT.solutionBenefit2Desc}</li>
      <li><strong>${currentT.solutionBenefit3}:</strong> ${currentT.solutionBenefit3Desc}</li>
      <li><strong>${currentT.solutionBenefit4}:</strong> ${currentT.solutionBenefit4Desc}</li>
      <li><strong>${currentT.solutionBenefit5}:</strong> ${currentT.solutionBenefit5Desc}</li>
    </ul>
  </div>

  <!-- Currencies -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">5</div>
      <h2>${currentT.tokenizedCurrencies}</h2>
    </div>
    <p>${currentT.currenciesP1}</p>
    <div class="currency-grid">
      ${CURRENCIES.map(c => `<div class="currency-card"><div class="code">${c.code}</div><div>${c.name}</div></div>`).join('')}
    </div>
    <p>${currentT.currenciesP2}</p>
    <ul>
      <li>${currentT.currencyMechanism1}</li>
      <li>${currentT.currencyMechanism2}</li>
      <li>${currentT.currencyMechanism3}</li>
      <li>${currentT.currencyMechanism4}</li>
    </ul>
  </div>

  <!-- Commodities -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">6</div>
      <h2>${currentT.tokenizedCommodities}</h2>
    </div>
    <p>${currentT.commoditiesP1}</p>
    <div class="highlight-box">
      <h4>${currentT.commoditiesCategory1}</h4>
      <p>VAU (Gold), VAG (Silver), VPT (Platinum), VPD (Palladium)</p>
    </div>
    <div class="highlight-box">
      <h4>${currentT.commoditiesCategory2}</h4>
      <p>VTI (Crude Oil), VBR (Brent), VNG (Natural Gas), VCL (Coal)</p>
    </div>
    <div class="highlight-box">
      <h4>${currentT.commoditiesCategory3}</h4>
      <p>VWH (Wheat), VCN (Corn), VSY (Soybeans), VCF (Coffee), VSU (Sugar), VCT (Cotton), VCU (Copper)</p>
    </div>
  </div>

  <!-- Architecture -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">7</div>
      <h2>${currentT.platformArchitecture}</h2>
    </div>
    <p>${currentT.architectureP1}</p>
    <ul>
      <li><strong>${currentT.archFeature1}:</strong> ${currentT.archFeature1Desc}</li>
      <li><strong>${currentT.archFeature2}:</strong> ${currentT.archFeature2Desc}</li>
      <li><strong>${currentT.archFeature3}:</strong> ${currentT.archFeature3Desc}</li>
      <li><strong>${currentT.archFeature4}:</strong> ${currentT.archFeature4Desc}</li>
    </ul>
  </div>

  <!-- Trading Features -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">8</div>
      <h2>${currentT.tradingFeatures}</h2>
    </div>
    <p>${currentT.tradingP1}</p>
    <ul>
      <li><strong>${currentT.tradingFeature1}:</strong> ${currentT.tradingFeature1Desc}</li>
      <li><strong>${currentT.tradingFeature2}:</strong> ${currentT.tradingFeature2Desc}</li>
      <li><strong>${currentT.tradingFeature3}:</strong> ${currentT.tradingFeature3Desc}</li>
      <li><strong>${currentT.tradingFeature4}:</strong> ${currentT.tradingFeature4Desc}</li>
    </ul>
  </div>

  <!-- AI -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">9</div>
      <h2>${currentT.aiIntegration}</h2>
    </div>
    <p>${currentT.aiP1}</p>
    <ul>
      <li><strong>${currentT.aiFeature1}:</strong> ${currentT.aiFeature1Desc}</li>
      <li><strong>${currentT.aiFeature2}:</strong> ${currentT.aiFeature2Desc}</li>
      <li><strong>${currentT.aiFeature3}:</strong> ${currentT.aiFeature3Desc}</li>
      <li><strong>${currentT.aiFeature4}:</strong> ${currentT.aiFeature4Desc}</li>
    </ul>
  </div>

  <!-- Security -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">10</div>
      <h2>${currentT.securityCompliance}</h2>
    </div>
    <p>${currentT.securityP1}</p>
    <ul>
      <li><strong>${currentT.secFeature1}:</strong> ${currentT.secFeature1Desc}</li>
      <li><strong>${currentT.secFeature2}:</strong> ${currentT.secFeature2Desc}</li>
      <li><strong>${currentT.secFeature3}:</strong> ${currentT.secFeature3Desc}</li>
      <li><strong>${currentT.secFeature4}:</strong> ${currentT.secFeature4Desc}</li>
    </ul>
  </div>

  <!-- Roadmap -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">11</div>
      <h2>${currentT.roadmap}</h2>
    </div>
    <div class="roadmap-grid">
      <div class="roadmap-card">
        <h4>${currentT.roadmapQ1}</h4>
        <ul>${currentT.roadmapQ1Items.map((item: string) => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="roadmap-card">
        <h4>${currentT.roadmapQ2}</h4>
        <ul>${currentT.roadmapQ2Items.map((item: string) => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="roadmap-card">
        <h4>${currentT.roadmapQ3}</h4>
        <ul>${currentT.roadmapQ3Items.map((item: string) => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="roadmap-card">
        <h4>${currentT.roadmapQ4}</h4>
        <ul>${currentT.roadmapQ4Items.map((item: string) => `<li>${item}</li>`).join('')}</ul>
      </div>
    </div>
  </div>

  <!-- Tokenomics -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">12</div>
      <h2>${currentT.tokenomics}</h2>
    </div>
    <p>${currentT.tokenomicsP1}</p>
    <div class="highlight-box">
      <h4>${currentT.tokenAllocation}</h4>
      <ul>
        <li>${currentT.tokenAlloc1}: 40%</li>
        <li>${currentT.tokenAlloc2}: 20%</li>
        <li>${currentT.tokenAlloc3}: 15%</li>
        <li>${currentT.tokenAlloc4}: 15%</li>
        <li>${currentT.tokenAlloc5}: 10%</li>
      </ul>
    </div>
    <div class="highlight-box">
      <h4>${currentT.tokenUtility}</h4>
      <ul>
        <li>${currentT.tokenUtil1}</li>
        <li>${currentT.tokenUtil2}</li>
        <li>${currentT.tokenUtil3}</li>
        <li>${currentT.tokenUtil4}</li>
      </ul>
    </div>
  </div>

  <!-- Conclusion -->
  <div class="section">
    <div class="section-title">
      <div class="section-icon">13</div>
      <h2>${currentT.conclusionTitle}</h2>
    </div>
    <p>${currentT.conclusionP1}</p>
    <ul>
      <li>${currentT.conclusionPoint1}</li>
      <li>${currentT.conclusionPoint2}</li>
      <li>${currentT.conclusionPoint3}</li>
      <li>${currentT.conclusionPoint4}</li>
    </ul>
    <p style="text-align: center; font-weight: bold; color: #A3E635; margin-top: 24px; font-size: 16px;">
      ${currentT.conclusionP2}
    </p>
  </div>

  <div class="footer">
    <p><strong>FxDefi.world</strong> - Powered by LemonMinted Protocol</p>
    <p>${currentT.lastUpdated}</p>
    <p style="margin-top: 12px;">© 2026 FxDefi. All Rights Reserved.</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  // Intersection observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme.bg.primary,
      color: theme.text.primary,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .wp-container {
          display: flex;
          max-width: 1600px;
          margin: 0 auto;
        }
        
        /* Sidebar */
        .wp-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          width: 320px;
          height: 100vh;
          background: ${theme.bg.secondary};
          border-right: 1px solid ${theme.border.primary};
          overflow-y: auto;
          padding: 24px;
          z-index: 100;
        }
        
        .wp-sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 24px;
          border-bottom: 1px solid ${theme.border.primary};
          margin-bottom: 24px;
        }
        
        .wp-logo {
          width: 48px;
          height: 48px;
          background: ${theme.gradient.lemon};
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .wp-sidebar-title h1 {
          font-size: 20px;
          font-weight: 700;
          color: ${theme.text.primary};
        }
        
        .wp-sidebar-title p {
          font-size: 12px;
          color: ${theme.text.muted};
          margin-top: 2px;
        }
        
        .wp-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 8px;
          color: ${theme.text.secondary};
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          margin-bottom: 24px;
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .wp-back-btn:hover {
          background: ${theme.accent.lemon};
          color: ${theme.bg.primary};
          border-color: ${theme.accent.lemon};
        }
        
        .wp-toc-title {
          font-size: 11px;
          font-weight: 700;
          color: ${theme.text.muted};
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        
        .wp-toc-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          color: ${theme.text.secondary};
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
        }
        
        .wp-toc-item:hover {
          background: ${theme.bg.tertiary};
          color: ${theme.text.primary};
        }
        
        .wp-toc-item.active {
          background: ${theme.accent.lemon}15;
          color: ${theme.accent.lemon};
          border-left: 3px solid ${theme.accent.lemon};
        }
        
        .wp-toc-item svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        
        .wp-lang-switch {
          display: flex;
          gap: 8px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid ${theme.border.primary};
        }
        
        .wp-lang-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid ${theme.border.primary};
          border-radius: 6px;
          background: ${theme.bg.tertiary};
          color: ${theme.text.secondary};
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .wp-lang-btn.active {
          background: ${theme.accent.lemon};
          color: ${theme.bg.primary};
          border-color: ${theme.accent.lemon};
        }
        
        /* Main Content */
        .wp-main {
          margin-left: 320px;
          flex: 1;
          padding: 48px 64px;
          max-width: calc(100% - 320px);
        }
        
        .wp-header {
          text-align: center;
          margin-bottom: 64px;
          padding-bottom: 48px;
          border-bottom: 1px solid ${theme.border.primary};
        }
        
        .wp-header h1 {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 16px;
          background: ${theme.gradient.lemon};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .wp-header .subtitle {
          font-size: 20px;
          color: ${theme.text.secondary};
          margin-bottom: 24px;
        }
        
        .wp-header .version {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 20px;
          font-size: 13px;
          color: ${theme.text.muted};
        }
        
        .wp-section {
          margin-bottom: 64px;
          scroll-margin-top: 32px;
        }
        
        .wp-section-title {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .wp-section-title .icon {
          width: 48px;
          height: 48px;
          background: ${theme.accent.lemon}15;
          border: 1px solid ${theme.accent.lemon}30;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${theme.accent.lemon};
        }
        
        .wp-section-title h2 {
          font-size: 28px;
          font-weight: 700;
          color: ${theme.text.primary};
        }
        
        .wp-paragraph {
          font-size: 16px;
          line-height: 1.8;
          color: ${theme.text.secondary};
          margin-bottom: 20px;
        }
        
        .wp-highlight-box {
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
        }
        
        .wp-highlight-box.accent {
          background: ${theme.accent.lemon}08;
          border-color: ${theme.accent.lemon}30;
        }
        
        .wp-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin: 32px 0;
        }
        
        .wp-stat-card {
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .wp-stat-card .value {
          font-size: 28px;
          font-weight: 800;
          color: ${theme.accent.lemon};
          margin-bottom: 4px;
        }
        
        .wp-stat-card .label {
          font-size: 13px;
          color: ${theme.text.muted};
        }
        
        .wp-list {
          list-style: none;
          margin: 20px 0;
        }
        
        .wp-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid ${theme.border.primary};
          color: ${theme.text.secondary};
          font-size: 15px;
          line-height: 1.6;
        }
        
        .wp-list li:last-child {
          border-bottom: none;
        }
        
        .wp-list li svg {
          color: ${theme.accent.lemon};
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .wp-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin: 32px 0;
        }
        
        .wp-feature-card {
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 12px;
          padding: 24px;
        }
        
        .wp-feature-card .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .wp-feature-card .icon {
          width: 40px;
          height: 40px;
          background: ${theme.accent.lemon}15;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${theme.accent.lemon};
        }
        
        .wp-feature-card h4 {
          font-size: 16px;
          font-weight: 600;
          color: ${theme.text.primary};
        }
        
        .wp-feature-card p {
          font-size: 14px;
          color: ${theme.text.muted};
          line-height: 1.6;
        }
        
        .wp-currency-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin: 24px 0;
        }
        
        .wp-currency-card {
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }
        
        .wp-currency-card .flag {
          font-size: 24px;
          margin-bottom: 8px;
        }
        
        .wp-currency-card .code {
          font-size: 14px;
          font-weight: 700;
          color: ${theme.accent.lemon};
          margin-bottom: 2px;
        }
        
        .wp-currency-card .name {
          font-size: 11px;
          color: ${theme.text.muted};
        }
        
        .wp-roadmap-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin: 32px 0;
        }
        
        .wp-roadmap-card {
          background: ${theme.bg.tertiary};
          border: 1px solid ${theme.border.primary};
          border-radius: 12px;
          padding: 24px;
        }
        
        .wp-roadmap-card h4 {
          font-size: 14px;
          font-weight: 700;
          color: ${theme.accent.lemon};
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${theme.border.primary};
        }
        
        .wp-roadmap-card ul {
          list-style: none;
        }
        
        .wp-roadmap-card li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: ${theme.text.secondary};
          padding: 6px 0;
        }
        
        .wp-roadmap-card li::before {
          content: '';
          width: 6px;
          height: 6px;
          background: ${theme.accent.lemon};
          border-radius: 50%;
        }
        
        .wp-tokenomics-chart {
          display: flex;
          gap: 40px;
          margin: 32px 0;
        }
        
        .wp-pie-chart {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: conic-gradient(
            ${theme.accent.lemon} 0deg 144deg,
            #22C55E 144deg 216deg,
            #3B82F6 216deg 270deg,
            #A855F7 270deg 324deg,
            #F97316 324deg 360deg
          );
          position: relative;
        }
        
        .wp-pie-chart::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          background: ${theme.bg.tertiary};
          border-radius: 50%;
        }
        
        .wp-legend {
          flex: 1;
        }
        
        .wp-legend-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }
        
        .wp-legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        
        .wp-legend-text {
          flex: 1;
          font-size: 14px;
          color: ${theme.text.secondary};
        }
        
        .wp-legend-value {
          font-size: 14px;
          font-weight: 600;
          color: ${theme.text.primary};
        }
        
        .wp-conclusion-box {
          background: ${theme.accent.lemon}08;
          border: 2px solid ${theme.accent.lemon}30;
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin-top: 48px;
        }
        
        .wp-conclusion-box h3 {
          font-size: 24px;
          font-weight: 700;
          color: ${theme.accent.lemon};
          margin-bottom: 16px;
        }
        
        .wp-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: ${theme.gradient.lemon};
          border: none;
          border-radius: 10px;
          color: ${theme.bg.primary};
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 24px;
          transition: all 0.2s;
        }
        
        .wp-download-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px ${theme.accent.lemon}40;
        }
        
        /* Responsive */
        @media (max-width: 1200px) {
          .wp-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .wp-roadmap-grid { grid-template-columns: repeat(2, 1fr); }
          .wp-currency-grid { grid-template-columns: repeat(3, 1fr); }
        }
        
        @media (max-width: 900px) {
          .wp-sidebar { 
            position: relative; 
            width: 100%; 
            height: auto;
            border-right: none;
            border-bottom: 1px solid ${theme.border.primary};
          }
          .wp-main { 
            margin-left: 0; 
            max-width: 100%;
            padding: 32px 24px;
          }
          .wp-header h1 { font-size: 32px; }
          .wp-feature-grid { grid-template-columns: 1fr; }
          .wp-tokenomics-chart { flex-direction: column; align-items: center; }
        }
        
        @media (max-width: 600px) {
          .wp-stats-grid { grid-template-columns: 1fr; }
          .wp-roadmap-grid { grid-template-columns: 1fr; }
          .wp-currency-grid { grid-template-columns: repeat(2, 1fr); }
          .wp-section-title h2 { font-size: 22px; }
        }
      `}</style>

      <div className="wp-container">
        {/* Sidebar */}
        <aside className="wp-sidebar">
          <div className="wp-sidebar-header">
            <div className="wp-logo">
              <TrendingUp size={24} color={theme.bg.primary} />
            </div>
            <div className="wp-sidebar-title">
              <h1>FxDefi</h1>
              <p>{t.whitepaper}</p>
            </div>
          </div>

          <button 
            onClick={onBack ? onBack : () => window.location.href = '/fxdefi'} 
            className="wp-back-btn"
          >
            <ArrowLeft size={16} />
            {t.backToFxDefi}
          </button>

          <div className="wp-toc-title">{t.tableOfContents}</div>
          
          {tocItems.map((item) => (
            <div
              key={item.id}
              className={`wp-toc-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => scrollToSection(item.id)}
            >
              <item.icon />
              <span>{item.title}</span>
            </div>
          ))}

          <div className="wp-lang-switch">
            <button 
              className={`wp-lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
            <button 
              className={`wp-lang-btn ${language === 'es' ? 'active' : ''}`}
              onClick={() => setLanguage('es')}
            >
              Español
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="wp-main">
          {/* Header */}
          <header className="wp-header">
            <h1>FxDefi.world</h1>
            <p className="subtitle">The Future of Tokenized Forex Trading</p>
            <span className="version">
              <FileText size={14} />
              {t.version}
            </span>
          </header>

          {/* Executive Summary */}
          <section id="executive-summary" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><FileText size={24} /></div>
              <h2>{t.executiveSummary}</h2>
            </div>
            <p className="wp-paragraph">{t.execSummaryP1}</p>
            <p className="wp-paragraph">{t.execSummaryP2}</p>
            
            <div className="wp-stats-grid">
              <div className="wp-stat-card">
                <div className="value">$7.5T</div>
                <div className="label">Daily Volume</div>
              </div>
              <div className="wp-stat-card">
                <div className="value">15+</div>
                <div className="label">Currencies</div>
              </div>
              <div className="wp-stat-card">
                <div className="value">15</div>
                <div className="label">Commodities</div>
              </div>
              <div className="wp-stat-card">
                <div className="value">&lt;3s</div>
                <div className="label">Settlement</div>
              </div>
            </div>
          </section>

          {/* Forex Market */}
          <section id="forex-market" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Globe size={24} /></div>
              <h2>{t.theForexMarket}</h2>
            </div>
            <p className="wp-paragraph">{t.forexP1}</p>
            
            <div className="wp-highlight-box">
              <h4 style={{ color: theme.text.primary, marginBottom: '16px', fontWeight: 600 }}>{t.forexComparison}</h4>
              <div className="wp-stats-grid">
                <div className="wp-stat-card">
                  <div className="value">$7.5T</div>
                  <div className="label">{t.forexMarket}</div>
                </div>
                <div className="wp-stat-card">
                  <div className="value" style={{ color: '#3B82F6' }}>$500B</div>
                  <div className="label">{t.stockMarket}</div>
                </div>
                <div className="wp-stat-card">
                  <div className="value" style={{ color: '#A855F7' }}>$150B</div>
                  <div className="label">{t.cryptoMarket}</div>
                </div>
                <div className="wp-stat-card">
                  <div className="value" style={{ color: '#F97316' }}>$1.2T</div>
                  <div className="label">{t.bondMarket}</div>
                </div>
              </div>
            </div>
            
            <p className="wp-paragraph">{t.forexP2}</p>
            <p className="wp-paragraph">{t.forexP3}</p>
            
            <ul className="wp-list">
              <li><CheckCircle size={18} />{t.forexIssue1}</li>
              <li><CheckCircle size={18} />{t.forexIssue2}</li>
              <li><CheckCircle size={18} />{t.forexIssue3}</li>
              <li><CheckCircle size={18} />{t.forexIssue4}</li>
              <li><CheckCircle size={18} />{t.forexIssue5}</li>
            </ul>
          </section>

          {/* Problem Statement */}
          <section id="problem-statement" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Target size={24} /></div>
              <h2>{t.problemStatement}</h2>
            </div>
            <p className="wp-paragraph">{t.problemP1}</p>
            
            <div className="wp-feature-grid">
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Shield size={20} /></div>
                  <h4>{t.problemIssue1}</h4>
                </div>
                <p>{t.problemIssue1Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Eye size={20} /></div>
                  <h4>{t.problemIssue2}</h4>
                </div>
                <p>{t.problemIssue2Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Clock size={20} /></div>
                  <h4>{t.problemIssue3}</h4>
                </div>
                <p>{t.problemIssue3Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Globe size={20} /></div>
                  <h4>{t.problemIssue4}</h4>
                </div>
                <p>{t.problemIssue4Desc}</p>
              </div>
            </div>
          </section>

          {/* Solution */}
          <section id="solution" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Zap size={24} /></div>
              <h2>{t.solutionOverview}</h2>
            </div>
            <p className="wp-paragraph">{t.solutionP1}</p>
            
            <div className="wp-feature-grid">
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Zap size={20} /></div>
                  <h4>{t.solutionBenefit1}</h4>
                </div>
                <p>{t.solutionBenefit1Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Wallet size={20} /></div>
                  <h4>{t.solutionBenefit2}</h4>
                </div>
                <p>{t.solutionBenefit2Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Activity size={20} /></div>
                  <h4>{t.solutionBenefit3}</h4>
                </div>
                <p>{t.solutionBenefit3Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Globe size={20} /></div>
                  <h4>{t.solutionBenefit4}</h4>
                </div>
                <p>{t.solutionBenefit4Desc}</p>
              </div>
            </div>
          </section>

          {/* Tokenized Currencies */}
          <section id="currencies" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Coins size={24} /></div>
              <h2>{t.tokenizedCurrencies}</h2>
            </div>
            <p className="wp-paragraph">{t.currenciesP1}</p>
            
            <div className="wp-currency-grid">
              {CURRENCIES.map((currency) => (
                <div key={currency.code} className="wp-currency-card">
                  <div className="flag">{currency.flag}</div>
                  <div className="code">{currency.code}</div>
                  <div className="name">{currency.name}</div>
                </div>
              ))}
            </div>
            
            <p className="wp-paragraph">{t.currenciesP2}</p>
            <ul className="wp-list">
              <li><CheckCircle size={18} />{t.currencyMechanism1}</li>
              <li><CheckCircle size={18} />{t.currencyMechanism2}</li>
              <li><CheckCircle size={18} />{t.currencyMechanism3}</li>
              <li><CheckCircle size={18} />{t.currencyMechanism4}</li>
            </ul>
          </section>

          {/* Commodities */}
          <section id="commodities" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><BarChart3 size={24} /></div>
              <h2>{t.tokenizedCommodities}</h2>
            </div>
            <p className="wp-paragraph">{t.commoditiesP1}</p>
            
            <div className="wp-highlight-box">
              <h4 style={{ color: theme.accent.lemon, marginBottom: '16px' }}>{t.commoditiesCategory1}</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {COMMODITIES.precious.map((c) => (
                  <span key={c.code} style={{ 
                    padding: '8px 16px', 
                    background: theme.bg.card, 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: theme.text.secondary
                  }}>
                    <strong style={{ color: theme.accent.lemon }}>{c.code}</strong> - {c.name}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="wp-highlight-box">
              <h4 style={{ color: '#F97316', marginBottom: '16px' }}>{t.commoditiesCategory2}</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {COMMODITIES.energy.map((c) => (
                  <span key={c.code} style={{ 
                    padding: '8px 16px', 
                    background: theme.bg.card, 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: theme.text.secondary
                  }}>
                    <strong style={{ color: '#F97316' }}>{c.code}</strong> - {c.name}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="wp-highlight-box">
              <h4 style={{ color: '#22C55E', marginBottom: '16px' }}>{t.commoditiesCategory3}</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {COMMODITIES.agriculture.map((c) => (
                  <span key={c.code} style={{ 
                    padding: '8px 16px', 
                    background: theme.bg.card, 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: theme.text.secondary
                  }}>
                    <strong style={{ color: '#22C55E' }}>{c.code}</strong> - {c.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Layers size={24} /></div>
              <h2>{t.platformArchitecture}</h2>
            </div>
            <p className="wp-paragraph">{t.architectureP1}</p>
            
            <div className="wp-feature-grid">
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Network size={20} /></div>
                  <h4>{t.archFeature1}</h4>
                </div>
                <p>{t.archFeature1Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Cpu size={20} /></div>
                  <h4>{t.archFeature2}</h4>
                </div>
                <p>{t.archFeature2Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Radio size={20} /></div>
                  <h4>{t.archFeature3}</h4>
                </div>
                <p>{t.archFeature3Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Database size={20} /></div>
                  <h4>{t.archFeature4}</h4>
                </div>
                <p>{t.archFeature4Desc}</p>
              </div>
            </div>
          </section>

          {/* Trading Features */}
          <section id="trading" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Activity size={24} /></div>
              <h2>{t.tradingFeatures}</h2>
            </div>
            <p className="wp-paragraph">{t.tradingP1}</p>
            
            <div className="wp-feature-grid">
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><TrendingUp size={20} /></div>
                  <h4>{t.tradingFeature1}</h4>
                </div>
                <p>{t.tradingFeature1Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><BarChart3 size={20} /></div>
                  <h4>{t.tradingFeature2}</h4>
                </div>
                <p>{t.tradingFeature2Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Activity size={20} /></div>
                  <h4>{t.tradingFeature3}</h4>
                </div>
                <p>{t.tradingFeature3Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Wallet size={20} /></div>
                  <h4>{t.tradingFeature4}</h4>
                </div>
                <p>{t.tradingFeature4Desc}</p>
              </div>
            </div>
          </section>

          {/* AI Integration */}
          <section id="ai" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Brain size={24} /></div>
              <h2>{t.aiIntegration}</h2>
            </div>
            <p className="wp-paragraph">{t.aiP1}</p>
            
            <div className="wp-feature-grid">
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><TrendingUp size={20} /></div>
                  <h4>{t.aiFeature1}</h4>
                </div>
                <p>{t.aiFeature1Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Activity size={20} /></div>
                  <h4>{t.aiFeature2}</h4>
                </div>
                <p>{t.aiFeature2Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Bot size={20} /></div>
                  <h4>{t.aiFeature3}</h4>
                </div>
                <p>{t.aiFeature3Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Zap size={20} /></div>
                  <h4>{t.aiFeature4}</h4>
                </div>
                <p>{t.aiFeature4Desc}</p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section id="security" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Shield size={24} /></div>
              <h2>{t.securityCompliance}</h2>
            </div>
            <p className="wp-paragraph">{t.securityP1}</p>
            
            <div className="wp-feature-grid">
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><CheckCircle size={20} /></div>
                  <h4>{t.secFeature1}</h4>
                </div>
                <p>{t.secFeature1Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Eye size={20} /></div>
                  <h4>{t.secFeature2}</h4>
                </div>
                <p>{t.secFeature2Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Users size={20} /></div>
                  <h4>{t.secFeature3}</h4>
                </div>
                <p>{t.secFeature3Desc}</p>
              </div>
              <div className="wp-feature-card">
                <div className="header">
                  <div className="icon"><Lock size={20} /></div>
                  <h4>{t.secFeature4}</h4>
                </div>
                <p>{t.secFeature4Desc}</p>
              </div>
            </div>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Clock size={24} /></div>
              <h2>{t.roadmap}</h2>
            </div>
            
            <div className="wp-roadmap-grid">
              <div className="wp-roadmap-card">
                <h4>{t.roadmapQ1}</h4>
                <ul>
                  {t.roadmapQ1Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="wp-roadmap-card">
                <h4>{t.roadmapQ2}</h4>
                <ul>
                  {t.roadmapQ2Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="wp-roadmap-card">
                <h4>{t.roadmapQ3}</h4>
                <ul>
                  {t.roadmapQ3Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="wp-roadmap-card">
                <h4>{t.roadmapQ4}</h4>
                <ul>
                  {t.roadmapQ4Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Tokenomics */}
          <section id="tokenomics" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><Coins size={24} /></div>
              <h2>{t.tokenomics}</h2>
            </div>
            <p className="wp-paragraph">{t.tokenomicsP1}</p>
            
            <div className="wp-highlight-box">
              <h4 style={{ color: theme.text.primary, marginBottom: '24px' }}>{t.tokenAllocation}</h4>
              <div className="wp-tokenomics-chart">
                <div className="wp-pie-chart"></div>
                <div className="wp-legend">
                  <div className="wp-legend-item">
                    <div className="wp-legend-color" style={{ background: theme.accent.lemon }}></div>
                    <span className="wp-legend-text">{t.tokenAlloc1}</span>
                    <span className="wp-legend-value">40%</span>
                  </div>
                  <div className="wp-legend-item">
                    <div className="wp-legend-color" style={{ background: '#22C55E' }}></div>
                    <span className="wp-legend-text">{t.tokenAlloc2}</span>
                    <span className="wp-legend-value">20%</span>
                  </div>
                  <div className="wp-legend-item">
                    <div className="wp-legend-color" style={{ background: '#3B82F6' }}></div>
                    <span className="wp-legend-text">{t.tokenAlloc3}</span>
                    <span className="wp-legend-value">15%</span>
                  </div>
                  <div className="wp-legend-item">
                    <div className="wp-legend-color" style={{ background: '#A855F7' }}></div>
                    <span className="wp-legend-text">{t.tokenAlloc4}</span>
                    <span className="wp-legend-value">15%</span>
                  </div>
                  <div className="wp-legend-item">
                    <div className="wp-legend-color" style={{ background: '#F97316' }}></div>
                    <span className="wp-legend-text">{t.tokenAlloc5}</span>
                    <span className="wp-legend-value">10%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="wp-highlight-box accent">
              <h4 style={{ color: theme.accent.lemon, marginBottom: '16px' }}>{t.tokenUtility}</h4>
              <ul className="wp-list">
                <li><CheckCircle size={18} />{t.tokenUtil1}</li>
                <li><CheckCircle size={18} />{t.tokenUtil2}</li>
                <li><CheckCircle size={18} />{t.tokenUtil3}</li>
                <li><CheckCircle size={18} />{t.tokenUtil4}</li>
              </ul>
            </div>
          </section>

          {/* Conclusion */}
          <section id="conclusion" className="wp-section">
            <div className="wp-section-title">
              <div className="icon"><CheckCircle size={24} /></div>
              <h2>{t.conclusionTitle}</h2>
            </div>
            <p className="wp-paragraph">{t.conclusionP1}</p>
            
            <ul className="wp-list">
              <li><ArrowRight size={18} />{t.conclusionPoint1}</li>
              <li><ArrowRight size={18} />{t.conclusionPoint2}</li>
              <li><ArrowRight size={18} />{t.conclusionPoint3}</li>
              <li><ArrowRight size={18} />{t.conclusionPoint4}</li>
            </ul>
            
            <div className="wp-conclusion-box">
              <h3>{t.conclusionP2}</h3>
              <button className="wp-download-btn" onClick={downloadPDF}>
                <Download size={18} />
                {t.downloadPdf}
              </button>
              <p style={{ marginTop: '16px', fontSize: '12px', color: theme.text.muted }}>
                {t.lastUpdated}
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default FxDefiWhitepaper;
