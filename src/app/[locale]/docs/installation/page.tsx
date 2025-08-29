'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Download, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  HardDrive, 
  Monitor,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

export default function InstallationPage() {
  const t = useTranslations('docs');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, commandId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(commandId);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const CodeBlock = ({ command, commandId, description }: { 
    command: string; 
    commandId: string; 
    description?: string;
  }) => (
    <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
      {description && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-white/10 text-sm text-gray-400">
          {description}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 text-green-400 font-mono text-sm overflow-x-auto">
          <code>{command}</code>
        </pre>
        <button
          onClick={() => copyToClipboard(command, commandId)}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-lg"
        >
          {copiedCommand === commandId ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
          {t('installation.title')}
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          {t('installation.subtitle')}
        </p>
      </motion.div>

      {/* System Requirements */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <Monitor className="w-8 h-8 mr-3 text-blue-400" />
          {t('installation.requirements.title')}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Terminal className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold ml-4">Node.js</h3>
            </div>
            <p className="text-gray-300">{t('installation.requirements.nodeVersion')}</p>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Cpu className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold ml-4">Memory</h3>
            </div>
            <p className="text-gray-300">{t('installation.requirements.memory')}</p>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold ml-4">Storage</h3>
            </div>
            <p className="text-gray-300">{t('installation.requirements.storage')}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-amber-400 mb-2">Important Note</h3>
            <p className="text-gray-300">
              AutoProvider requires significant computational resources for optimal performance. 
              We recommend running on a dedicated server or cloud instance for production use.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Installation Steps */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <Download className="w-8 h-8 mr-3 text-blue-400" />
          {t('installation.steps.title')}
        </h2>

        <div className="space-y-8">
          {/* Step 1 */}
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                1
              </div>
              <h3 className="text-2xl font-semibold ml-4">{t('installation.steps.step1')}</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Install the AutoProvider CLI globally to manage your autonomous companies from anywhere.
            </p>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-200">Using npm:</h4>
              <CodeBlock
                command="npm install -g @autoprovider/cli"
                commandId="npm-install"
                description="Install AutoProvider CLI globally via npm"
              />

              <h4 className="text-lg font-medium text-gray-200 mt-6">Using yarn:</h4>
              <CodeBlock
                command="yarn global add @autoprovider/cli"
                commandId="yarn-install"
                description="Install AutoProvider CLI globally via yarn"
              />

              <h4 className="text-lg font-medium text-gray-200 mt-6">Using pnpm:</h4>
              <CodeBlock
                command="pnpm add -g @autoprovider/cli"
                commandId="pnpm-install"
                description="Install AutoProvider CLI globally via pnpm"
              />
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                2
              </div>
              <h3 className="text-2xl font-semibold ml-4">{t('installation.steps.step2')}</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Create a new autonomous company project using the AutoProvider CLI.
            </p>

            <CodeBlock
              command={`autoprovider create my-autonomous-company
cd my-autonomous-company`}
              commandId="create-project"
              description="Create and enter new project directory"
            />

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Tip:</strong> You can replace "my-autonomous-company" with any name you prefer for your company.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                3
              </div>
              <h3 className="text-2xl font-semibold ml-4">{t('installation.steps.step3')}</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Configure your company's goals, parameters, and operational settings.
            </p>

            <CodeBlock
              command="autoprovider config --interactive"
              commandId="config-setup"
              description="Interactive configuration setup"
            />

            <div className="mt-6 space-y-3">
              <h4 className="text-lg font-medium text-gray-200">Configuration Options:</h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Company objectives and goals
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Resource allocation preferences
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  AI decision-making parameters
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Security and access controls
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                4
              </div>
              <h3 className="text-2xl font-semibold ml-4">{t('installation.steps.step4')}</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Deploy and start your autonomous company. Watch as it begins operating independently.
            </p>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-200">Development Mode:</h4>
              <CodeBlock
                command="autoprovider dev"
                commandId="dev-mode"
                description="Start in development mode with monitoring dashboard"
              />

              <h4 className="text-lg font-medium text-gray-200 mt-6">Production Deployment:</h4>
              <CodeBlock
                command={`autoprovider build
autoprovider deploy --production`}
                commandId="production-deploy"
                description="Build and deploy for production environment"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Verification */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold mb-8 flex items-center">
          <CheckCircle className="w-8 h-8 mr-3 text-green-400" />
          {t('installation.verification.title')}
        </h2>

        <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
          <p className="text-gray-300 mb-6">
            {t('installation.verification.description')}
          </p>

          <CodeBlock
            command="autoprovider status"
            commandId="verify-status"
            description="Check your autonomous company status"
          />

          <div className="mt-6 space-y-4">
            <h4 className="text-lg font-medium text-gray-200">Expected Output:</h4>
            <div className="bg-black/50 border border-green-500/20 rounded-lg p-4">
              <pre className="text-green-400 text-sm">
{`✓ AutoProvider CLI v1.0.0
✓ Company Status: Active
✓ AI Agents: 3/3 Running
✓ Tasks Completed: 15
✓ Uptime: 2h 34m
✓ Performance Score: 98%`}
              </pre>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <a
              href="http://localhost:3000/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Monitor className="w-5 h-5" />
              <span>Open Dashboard</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button className="flex items-center justify-center space-x-2 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
              <Terminal className="w-5 h-5" />
              <span>Run Diagnostics</span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Troubleshooting */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-3xl font-bold mb-8">Troubleshooting</h2>

        <div className="space-y-6">
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-red-400">Command not found: autoprovider</h3>
            <p className="text-gray-300 mb-4">
              If you get this error, the CLI wasn't installed globally or isn't in your PATH.
            </p>
            <CodeBlock
              command="npm list -g @autoprovider/cli"
              commandId="check-install"
              description="Verify global installation"
            />
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-red-400">Permission denied errors</h3>
            <p className="text-gray-300 mb-4">
              On macOS/Linux, you might need to use sudo or configure npm to install packages globally without sudo.
            </p>
            <CodeBlock
              command={`# Option 1: Use sudo (not recommended)
sudo npm install -g @autoprovider/cli

# Option 2: Configure npm (recommended)
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH`}
              commandId="permission-fix"
              description="Fix permission issues"
            />
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-red-400">Out of memory errors</h3>
            <p className="text-gray-300 mb-4">
              AutoProvider requires substantial memory. Increase Node.js memory limit if needed.
            </p>
            <CodeBlock
              command='export NODE_OPTIONS="--max-old-space-size=8192"'
              commandId="memory-fix"
              description="Increase Node.js memory limit to 8GB"
            />
          </div>
        </div>
      </motion.section>

      {/* Next Steps */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-green-500/10 border border-green-500/20 rounded-xl p-8"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">🎉 Installation Complete!</h2>
        <p className="text-gray-300 text-center mb-8">
          Your autonomous company is now ready to operate. Here's what you can do next:
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <a
            href="/docs/quick-start"
            className="bg-gray-900/50 border border-white/10 rounded-xl p-6 hover:bg-gray-900/70 transition-all duration-300 block"
          >
            <h3 className="text-lg font-semibold mb-2 text-blue-400">Quick Start Guide</h3>
            <p className="text-gray-400 text-sm">Learn the basics of managing your autonomous company</p>
          </a>
          
          <a
            href="/docs/api"
            className="bg-gray-900/50 border border-white/10 rounded-xl p-6 hover:bg-gray-900/70 transition-all duration-300 block"
          >
            <h3 className="text-lg font-semibold mb-2 text-purple-400">API Reference</h3>
            <p className="text-gray-400 text-sm">Explore the full API documentation and examples</p>
          </a>
        </div>
      </motion.section>
    </div>
  );
}