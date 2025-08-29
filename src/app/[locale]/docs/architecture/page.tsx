'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  Database, 
  Network, 
  Brain,
  Zap,
  Shield,
  Cloud,
  GitBranch,
  Layers,
  Activity,
  Globe,
  Server,
  BarChart3,
  Lock
} from 'lucide-react';

export default function ArchitecturePage() {
  const t = useTranslations('docs');

  const ArchitectureCard = ({ 
    icon: Icon, 
    title, 
    description, 
    details,
    color = 'blue' 
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    details: string[];
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
      green: 'bg-green-500/20 text-green-400 border-green-500/20',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
      red: 'bg-red-500/20 text-red-400 border-red-500/20'
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300"
      >
        <div className="flex items-center mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold ml-4">{title}</h3>
        </div>
        <p className="text-gray-300 mb-4">{description}</p>
        <ul className="space-y-2">
          {details.map((detail, index) => (
            <li key={index} className="flex items-start space-x-2 text-sm text-gray-400">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
          {t('architecture.title')}
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          {t('architecture.subtitle')}
        </p>
      </motion.div>

      {/* Architecture Overview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-900/30 border border-white/10 rounded-xl p-8"
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center">
          <Layers className="w-8 h-8 mr-3 text-blue-400" />
          {t('architecture.overview.title')}
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed mb-8">
          {t('architecture.overview.description')}
        </p>

        {/* Architecture Diagram */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Layer 1: AI Decision Engine */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/20 border-2 border-blue-500/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-blue-400 mb-2">AI Decision Layer</h3>
              <p className="text-sm text-gray-400">Autonomous decision making and strategic planning</p>
            </div>

            {/* Layer 2: Orchestration */}
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-500/20 border-2 border-purple-500/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Network className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Orchestration Layer</h3>
              <p className="text-sm text-gray-400">Task coordination and resource management</p>
            </div>

            {/* Layer 3: Execution */}
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Execution Layer</h3>
              <p className="text-sm text-gray-400">Task execution and business operations</p>
            </div>
          </div>

          {/* Connecting Lines */}
          <div className="hidden md:block relative mt-8">
            <div className="absolute top-0 left-1/3 w-1/3 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400"></div>
            <div className="absolute top-4 left-1/3 w-1/3 h-0.5 bg-gradient-to-r from-purple-400 to-green-400"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-black/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-400 mb-3">Key Principles</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• Microservices architecture for scalability</li>
              <li>• Event-driven communication patterns</li>
              <li>• Fault-tolerant and self-healing systems</li>
              <li>• Real-time monitoring and analytics</li>
            </ul>
          </div>
          <div className="bg-black/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-400 mb-3">Technology Stack</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• Kubernetes for container orchestration</li>
              <li>• gRPC for high-performance communication</li>
              <li>• Redis for caching and session management</li>
              <li>• PostgreSQL for persistent data storage</li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Core Components */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <Cpu className="w-8 h-8 mr-3 text-green-400" />
          {t('architecture.core.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <ArchitectureCard
            icon={Brain}
            title="AI Decision Engine"
            description={t('architecture.core.ai')}
            details={[
              "Advanced neural networks for decision making",
              "Real-time learning and adaptation algorithms", 
              "Multi-objective optimization capabilities",
              "Ethical AI constraints and safety measures"
            ]}
            color="blue"
          />

          <ArchitectureCard
            icon={Zap}
            title="Execution Engine"
            description={t('architecture.core.execution')}
            details={[
              "High-performance task processing pipeline",
              "Parallel execution with load balancing",
              "Error handling and retry mechanisms",
              "Resource optimization and scaling"
            ]}
            color="green"
          />

          <ArchitectureCard
            icon={Activity}
            title="Learning System"
            description={t('architecture.core.learning')}
            details={[
              "Continuous learning from operational data",
              "Performance feedback loops",
              "Adaptive strategy refinement",
              "Knowledge base expansion and curation"
            ]}
            color="purple"
          />

          <ArchitectureCard
            icon={Network}
            title="Orchestration System"
            description={t('architecture.core.orchestration')}
            details={[
              "Multi-agent coordination protocols",
              "Dynamic task assignment and routing",
              "Resource conflict resolution",
              "Communication protocol management"
            ]}
            color="orange"
          />
        </div>
      </motion.section>

      {/* Data Flow */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <GitBranch className="w-8 h-8 mr-3 text-purple-400" />
          Data Flow Architecture
        </h2>

        <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
          <div className="space-y-8">
            {/* Input Layer */}
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-full md:w-1/4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Input Sources
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• API Requests</li>
                  <li>• Real-time Data Streams</li>
                  <li>• Scheduled Tasks</li>
                  <li>• External Integrations</li>
                </ul>
              </div>

              <div className="hidden md:block text-gray-500">→</div>

              <div className="w-full md:w-1/4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Processing
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Data Validation</li>
                  <li>• Context Analysis</li>
                  <li>• Decision Making</li>
                  <li>• Task Planning</li>
                </ul>
              </div>

              <div className="hidden md:block text-gray-500">→</div>

              <div className="w-full md:w-1/4 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-400 mb-2 flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Execution
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Task Distribution</li>
                  <li>• Resource Allocation</li>
                  <li>• Operation Execution</li>
                  <li>• Quality Assurance</li>
                </ul>
              </div>

              <div className="hidden md:block text-gray-500">→</div>

              <div className="w-full md:w-1/4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-400 mb-2 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Output & Analytics
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Results Delivery</li>
                  <li>• Performance Metrics</li>
                  <li>• Learning Updates</li>
                  <li>• Reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Security Architecture */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <Shield className="w-8 h-8 mr-3 text-red-400" />
          Security Architecture
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <ArchitectureCard
            icon={Lock}
            title="Authentication & Authorization"
            description="Multi-layered security with enterprise-grade access controls"
            details={[
              "JWT-based authentication system",
              "Role-based access control (RBAC)",
              "OAuth 2.0 and SAML integration",
              "Multi-factor authentication support"
            ]}
            color="red"
          />

          <ArchitectureCard
            icon={Shield}
            title="Data Protection"
            description="Comprehensive data security and privacy measures"
            details={[
              "End-to-end encryption for all data",
              "Zero-trust network architecture",
              "Regular security audits and compliance",
              "GDPR and SOC 2 Type II compliance"
            ]}
            color="red"
          />

          <ArchitectureCard
            icon={Activity}
            title="Monitoring & Compliance"
            description="Real-time security monitoring and threat detection"
            details={[
              "24/7 security operations center",
              "Automated threat detection and response",
              "Comprehensive audit logging",
              "Incident response automation"
            ]}
            color="red"
          />
        </div>
      </motion.section>

      {/* Deployment Architecture */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <Cloud className="w-8 h-8 mr-3 text-blue-400" />
          {t('architecture.deployment.title')}
        </h2>

        <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8 mb-8">
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            {t('architecture.deployment.description')}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center">
                <Cloud className="w-6 h-6 mr-2" />
                Cloud-Native Architecture
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <span><strong>Kubernetes Orchestration:</strong> Container management and scaling</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <span><strong>Service Mesh:</strong> Istio for secure service communication</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <span><strong>Auto-scaling:</strong> Horizontal and vertical pod autoscaling</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <span><strong>Multi-region:</strong> Global deployment with geo-redundancy</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center">
                <Server className="w-6 h-6 mr-2" />
                Infrastructure Components
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <span><strong>Load Balancers:</strong> High-availability traffic distribution</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <span><strong>CDN Integration:</strong> Global content delivery network</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <span><strong>Database Clusters:</strong> Distributed data storage with replication</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <span><strong>Message Queues:</strong> Reliable event streaming and processing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Deployment Options */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-black/30 border border-blue-500/20 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <Cloud className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Cloud Deployment</h3>
            <p className="text-gray-300 text-sm mb-4">
              Fully managed cloud deployment with automatic scaling and maintenance.
            </p>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>• AWS, Azure, GCP support</li>
              <li>• Managed Kubernetes clusters</li>
              <li>• Auto-scaling and load balancing</li>
              <li>• 99.99% uptime SLA</li>
            </ul>
          </div>

          <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Server className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Hybrid Deployment</h3>
            <p className="text-gray-300 text-sm mb-4">
              Combine on-premises and cloud resources for optimal performance and control.
            </p>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>• On-premises data processing</li>
              <li>• Cloud-based AI services</li>
              <li>• Secure VPN connectivity</li>
              <li>• Flexible resource allocation</li>
            </ul>
          </div>

          <div className="bg-black/30 border border-orange-500/20 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-orange-400 mb-2">On-Premises</h3>
            <p className="text-gray-300 text-sm mb-4">
              Complete on-premises deployment for maximum security and data control.
            </p>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>• Air-gapped environments</li>
              <li>• Custom security policies</li>
              <li>• Local data processing</li>
              <li>• Enterprise integration</li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Performance & Scalability */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border border-green-500/20 rounded-xl p-8"
      >
        <h2 className="text-3xl font-bold mb-8 text-center">Performance & Scalability</h2>
        
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">99.99%</div>
            <div className="text-gray-300">Uptime SLA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">&lt;100ms</div>
            <div className="text-gray-300">Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">10K+</div>
            <div className="text-gray-300">Concurrent Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400 mb-2">∞</div>
            <div className="text-gray-300">Horizontal Scale</div>
          </div>
        </div>

        <p className="text-gray-300 text-center">
          AutoProvider's architecture is designed to handle enterprise-scale workloads 
          with linear scalability and predictable performance characteristics.
        </p>
      </motion.section>
    </div>
  );
}