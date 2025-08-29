'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Database, 
  Users, 
  BarChart3,
  Copy,
  CheckCircle,
  ExternalLink,
  Key,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';

export default function ApiPage() {
  const t = useTranslations('docs');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('authentication');

  const copyToClipboard = (text: string, codeId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, codeId, language = 'javascript', title }: { 
    code: string; 
    codeId: string; 
    language?: string;
    title?: string;
  }) => (
    <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-white/10 text-sm text-gray-300 font-medium">
          {title}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 text-gray-300 font-mono text-sm overflow-x-auto">
          <code className={`language-${language}`}>{code}</code>
        </pre>
        <button
          onClick={() => copyToClipboard(code, codeId)}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-lg"
        >
          {copiedCode === codeId ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  const ApiEndpoint = ({ method, endpoint, description, parameters, response }: {
    method: string;
    endpoint: string;
    description: string;
    parameters?: Array<{ name: string; type: string; required: boolean; description: string }>;
    response?: string;
  }) => (
    <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 mb-6">
      <div className="flex items-center mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold mr-3 ${
          method === 'GET' ? 'bg-green-500/20 text-green-400' :
          method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
          method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
          method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {method}
        </span>
        <code className="text-lg font-mono text-white">{endpoint}</code>
      </div>
      
      <p className="text-gray-300 mb-4">{description}</p>

      {parameters && parameters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-white mb-3">Parameters</h4>
          <div className="space-y-2">
            {parameters.map((param, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-black/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <code className="text-blue-400">{param.name}</code>
                  <span className="text-gray-500">•</span>
                  <span className="text-purple-400 text-sm">{param.type}</span>
                  {param.required && (
                    <span className="text-red-400 text-xs">required</span>
                  )}
                </div>
                <span className="text-gray-300 text-sm flex-1">{param.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {response && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">Response</h4>
          <CodeBlock
            code={response}
            codeId={`response-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`}
            language="json"
          />
        </div>
      )}
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
          {t('api.title')}
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          {t('api.subtitle')}
        </p>
      </motion.div>

      {/* API Overview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/30 border border-white/10 rounded-xl p-8"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Database className="w-7 h-7 mr-3 text-blue-400" />
          API Overview
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed mb-6">
          The AutoProvider API allows you to programmatically manage your autonomous companies, 
          assign tasks, monitor performance, and integrate with external systems. All endpoints 
          use RESTful conventions and return JSON responses.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-black/30 rounded-lg p-4">
            <h3 className="font-semibold text-green-400 mb-2">Base URL</h3>
            <code className="text-gray-300">https://api.autoprovider.com/v1</code>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <h3 className="font-semibold text-blue-400 mb-2">Content Type</h3>
            <code className="text-gray-300">application/json</code>
          </div>
        </div>
      </motion.section>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-wrap gap-2 mb-8 bg-gray-900/30 p-2 rounded-xl border border-white/10">
          {[
            { id: 'authentication', label: 'Authentication', icon: Shield },
            { id: 'companies', label: 'Companies', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: Zap },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Authentication Section */}
      {activeTab === 'authentication' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-green-400" />
              {t('api.authentication.title')}
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              {t('api.authentication.description')}
            </p>
          </div>

          {/* API Key Setup */}
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <Key className="w-6 h-6 mr-3 text-yellow-400" />
              API Key Authentication
            </h3>
            <p className="text-gray-300 mb-6">
              All API requests must include your API key in the Authorization header.
            </p>

            <CodeBlock
              code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     https://api.autoprovider.com/v1/companies`}
              codeId="auth-example"
              language="bash"
              title="Example Request with Authentication"
            />

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-400 mb-1">Security Notice</h4>
                <p className="text-gray-300 text-sm">
                  Never expose your API key in client-side code. Always keep it secure on your server.
                </p>
              </div>
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-blue-400" />
              Rate Limiting
            </h3>
            <p className="text-gray-300 mb-6">
              API requests are limited to ensure fair usage and system stability.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-black/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-2">1,000</div>
                <div className="text-gray-400 text-sm">Requests per hour</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-2">100</div>
                <div className="text-gray-400 text-sm">Companies per account</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-2">10,000</div>
                <div className="text-gray-400 text-sm">Tasks per company</div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Companies Section */}
      {activeTab === 'companies' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-400" />
              {t('api.companies.title')}
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              {t('api.companies.description')}
            </p>
          </div>

          {/* List Companies */}
          <ApiEndpoint
            method="GET"
            endpoint="/companies"
            description="Retrieve a list of all your autonomous companies"
            parameters={[
              { name: 'limit', type: 'integer', required: false, description: 'Maximum number of companies to return (default: 20)' },
              { name: 'offset', type: 'integer', required: false, description: 'Number of companies to skip for pagination' },
              { name: 'status', type: 'string', required: false, description: 'Filter by company status (active, paused, stopped)' }
            ]}
            response={`{
  "companies": [
    {
      "id": "comp_abc123",
      "name": "My Autonomous Company",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "goals": ["Maximize revenue", "Optimize operations"],
      "performance_score": 0.95,
      "active_agents": 8,
      "completed_tasks": 1247
    }
  ],
  "total": 1,
  "has_more": false
}`}
          />

          {/* Create Company */}
          <ApiEndpoint
            method="POST"
            endpoint="/companies"
            description="Create a new autonomous company"
            parameters={[
              { name: 'name', type: 'string', required: true, description: 'Name of the company' },
              { name: 'goals', type: 'array', required: true, description: 'Array of company objectives' },
              { name: 'industry', type: 'string', required: false, description: 'Industry sector' },
              { name: 'config', type: 'object', required: false, description: 'Custom configuration settings' }
            ]}
            response={`{
  "id": "comp_xyz789",
  "name": "Tech Startup AI",
  "status": "initializing",
  "created_at": "2024-01-20T14:22:00Z",
  "setup_progress": 0.15,
  "estimated_completion": "2024-01-20T14:32:00Z"
}`}
          />

          {/* Get Company Details */}
          <ApiEndpoint
            method="GET"
            endpoint="/companies/{company_id}"
            description="Retrieve detailed information about a specific company"
            response={`{
  "id": "comp_abc123",
  "name": "My Autonomous Company",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "goals": ["Maximize revenue", "Optimize operations"],
  "performance_score": 0.95,
  "active_agents": 8,
  "completed_tasks": 1247,
  "revenue_24h": 15420.50,
  "efficiency_metrics": {
    "task_completion_rate": 0.98,
    "error_rate": 0.02,
    "average_response_time": 0.145
  }
}`}
          />

          {/* Update Company */}
          <ApiEndpoint
            method="PUT"
            endpoint="/companies/{company_id}"
            description="Update company configuration and settings"
            parameters={[
              { name: 'name', type: 'string', required: false, description: 'New company name' },
              { name: 'goals', type: 'array', required: false, description: 'Updated company objectives' },
              { name: 'status', type: 'string', required: false, description: 'Company status (active, paused, stopped)' }
            ]}
            response={`{
  "id": "comp_abc123",
  "name": "Updated Company Name",
  "status": "active",
  "updated_at": "2024-01-20T16:45:00Z",
  "changes_applied": true
}`}
          />
        </motion.section>
      )}

      {/* Tasks Section */}
      {activeTab === 'tasks' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Zap className="w-8 h-8 mr-3 text-yellow-400" />
              {t('api.tasks.title')}
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              {t('api.tasks.description')}
            </p>
          </div>

          {/* Create Task */}
          <ApiEndpoint
            method="POST"
            endpoint="/companies/{company_id}/tasks"
            description="Assign a new task to your autonomous company"
            parameters={[
              { name: 'title', type: 'string', required: true, description: 'Task title' },
              { name: 'description', type: 'string', required: true, description: 'Detailed task description' },
              { name: 'priority', type: 'string', required: false, description: 'Task priority (low, medium, high, urgent)' },
              { name: 'deadline', type: 'string', required: false, description: 'ISO 8601 formatted deadline' },
              { name: 'tags', type: 'array', required: false, description: 'Task categorization tags' }
            ]}
            response={`{
  "id": "task_def456",
  "title": "Market Analysis Report",
  "status": "queued",
  "priority": "high",
  "created_at": "2024-01-20T17:30:00Z",
  "estimated_completion": "2024-01-20T19:15:00Z",
  "assigned_agents": ["agent_001", "agent_007"]
}`}
          />

          {/* List Tasks */}
          <ApiEndpoint
            method="GET"
            endpoint="/companies/{company_id}/tasks"
            description="Retrieve all tasks for a specific company"
            parameters={[
              { name: 'status', type: 'string', required: false, description: 'Filter by status (queued, in_progress, completed, failed)' },
              { name: 'priority', type: 'string', required: false, description: 'Filter by priority level' },
              { name: 'limit', type: 'integer', required: false, description: 'Maximum number of tasks to return' }
            ]}
            response={`{
  "tasks": [
    {
      "id": "task_def456",
      "title": "Market Analysis Report",
      "status": "in_progress",
      "priority": "high",
      "progress": 0.65,
      "created_at": "2024-01-20T17:30:00Z",
      "started_at": "2024-01-20T17:32:00Z",
      "assigned_agents": ["agent_001", "agent_007"]
    }
  ],
  "total": 1,
  "has_more": false
}`}
          />

          {/* Task Status */}
          <ApiEndpoint
            method="GET"
            endpoint="/tasks/{task_id}"
            description="Get detailed status and results of a specific task"
            response={`{
  "id": "task_def456",
  "title": "Market Analysis Report",
  "status": "completed",
  "priority": "high",
  "progress": 1.0,
  "created_at": "2024-01-20T17:30:00Z",
  "completed_at": "2024-01-20T19:12:00Z",
  "results": {
    "report_url": "https://files.autoprovider.com/reports/market_analysis_20240120.pdf",
    "key_findings": [
      "Market growth rate: 15.3%",
      "Top competitor analysis completed",
      "Recommended strategy: Focus on mobile segment"
    ],
    "confidence_score": 0.92
  }
}`}
          />
        </motion.section>
      )}

      {/* Analytics Section */}
      {activeTab === 'analytics' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-purple-400" />
              {t('api.analytics.title')}
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              {t('api.analytics.description')}
            </p>
          </div>

          {/* Performance Metrics */}
          <ApiEndpoint
            method="GET"
            endpoint="/companies/{company_id}/analytics/performance"
            description="Get comprehensive performance metrics for your company"
            parameters={[
              { name: 'period', type: 'string', required: false, description: 'Time period (1h, 24h, 7d, 30d, 90d)' },
              { name: 'metrics', type: 'array', required: false, description: 'Specific metrics to include' }
            ]}
            response={`{
  "period": "24h",
  "performance_score": 0.95,
  "metrics": {
    "tasks_completed": 47,
    "tasks_failed": 2,
    "success_rate": 0.96,
    "average_completion_time": 0.75,
    "revenue_generated": 15420.50,
    "cost_efficiency": 0.89,
    "agent_utilization": 0.87
  },
  "trends": {
    "performance_trend": "increasing",
    "efficiency_change": "+5.2%",
    "revenue_growth": "+12.8%"
  }
}`}
          />

          {/* Real-time Status */}
          <ApiEndpoint
            method="GET"
            endpoint="/companies/{company_id}/analytics/realtime"
            description="Get real-time operational status and metrics"
            response={`{
  "timestamp": "2024-01-20T18:45:23Z",
  "status": "active",
  "active_agents": 8,
  "queued_tasks": 12,
  "processing_tasks": 5,
  "system_load": 0.73,
  "memory_usage": 0.68,
  "network_activity": {
    "requests_per_second": 145,
    "data_throughput": "2.3 MB/s"
  },
  "recent_completions": [
    {
      "task_id": "task_xyz123",
      "completed_at": "2024-01-20T18:43:15Z",
      "duration": 0.42,
      "success": true
    }
  ]
}`}
          />

          {/* Historical Data */}
          <ApiEndpoint
            method="GET"
            endpoint="/companies/{company_id}/analytics/history"
            description="Retrieve historical performance data and trends"
            parameters={[
              { name: 'start_date', type: 'string', required: true, description: 'Start date (ISO 8601 format)' },
              { name: 'end_date', type: 'string', required: true, description: 'End date (ISO 8601 format)' },
              { name: 'granularity', type: 'string', required: false, description: 'Data granularity (hour, day, week)' }
            ]}
            response={`{
  "period": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-20T23:59:59Z",
    "granularity": "day"
  },
  "data_points": [
    {
      "date": "2024-01-15",
      "tasks_completed": 156,
      "performance_score": 0.92,
      "revenue": 18750.25
    },
    {
      "date": "2024-01-16",
      "tasks_completed": 189,
      "performance_score": 0.94,
      "revenue": 21340.80
    }
  ],
  "summary": {
    "total_tasks": 847,
    "average_performance": 0.94,
    "total_revenue": 98567.45,
    "growth_rate": 0.127
  }
}`}
          />
        </motion.section>
      )}

      {/* SDKs and Examples */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold mb-8">SDKs & Code Examples</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <ExternalLink className="w-5 h-5 mr-2 text-blue-400" />
              JavaScript SDK
            </h3>
            <p className="text-gray-300 mb-4">
              Official JavaScript/TypeScript SDK for Node.js and browser environments.
            </p>
            <CodeBlock
              code={`npm install @autoprovider/sdk

import { AutoProvider } from '@autoprovider/sdk';

const ap = new AutoProvider('your_api_key');

// Create a new company
const company = await ap.companies.create({
  name: 'My AI Company',
  goals: ['Automate customer service', 'Increase efficiency']
});

// Assign a task
const task = await ap.tasks.create(company.id, {
  title: 'Analyze customer feedback',
  description: 'Process and categorize recent customer reviews'
});`}
              codeId="js-sdk"
              language="javascript"
            />
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <ExternalLink className="w-5 h-5 mr-2 text-green-400" />
              Python SDK
            </h3>
            <p className="text-gray-300 mb-4">
              Python SDK with async support and comprehensive type hints.
            </p>
            <CodeBlock
              code={`pip install autoprovider-python

from autoprovider import AutoProvider

ap = AutoProvider(api_key='your_api_key')

# Create a new company
company = ap.companies.create(
    name='My AI Company',
    goals=['Automate customer service', 'Increase efficiency']
)

# Assign a task
task = ap.tasks.create(
    company_id=company.id,
    title='Analyze customer feedback',
    description='Process and categorize recent customer reviews'
)`}
              codeId="python-sdk"
              language="python"
            />
          </div>
        </div>
      </motion.section>

      {/* Error Codes */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-3xl font-bold mb-8">Error Codes</h2>
        
        <div className="bg-gray-900/30 border border-white/10 rounded-xl p-8">
          <div className="grid gap-4">
            {[
              { code: '200', name: 'OK', description: 'Request successful' },
              { code: '201', name: 'Created', description: 'Resource created successfully' },
              { code: '400', name: 'Bad Request', description: 'Invalid request parameters' },
              { code: '401', name: 'Unauthorized', description: 'Invalid or missing API key' },
              { code: '403', name: 'Forbidden', description: 'Insufficient permissions' },
              { code: '404', name: 'Not Found', description: 'Resource not found' },
              { code: '429', name: 'Too Many Requests', description: 'Rate limit exceeded' },
              { code: '500', name: 'Internal Server Error', description: 'Server error occurred' }
            ].map((error, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-black/30 rounded-lg">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  error.code.startsWith('2') ? 'bg-green-500/20 text-green-400' :
                  error.code.startsWith('4') ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {error.code}
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-white">{error.name}</span>
                  <span className="text-gray-400 ml-2">- {error.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}