'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Bot, Network, Clock, TrendingUp, CheckCircle, XCircle, Cpu, Users, Zap, Menu, X, Globe, Github } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NeuralNetworkBackground } from '@/components/NeuralNetworkBackground';

// 粒子数据类型
interface Particle {
  id: number;
  x: number;
  y: number;
  targetY: number;
  duration: number;
  delay: number;
}

export default function Home() {
  const [currentLang, setCurrentLang] = useState('zh');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');

  // 在客户端挂载后初始化粒子
  useEffect(() => {
    setMounted(true);
    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
        targetY: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080) - 200,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
      });
    }
    setParticles(newParticles);
  }, []);

  // 打字机效果
  useEffect(() => {
    const texts = ['Autonomous', '自主运行', 'AI-Driven', '智能化'];
    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let charIndex = 0;

    const type = () => {
      const fullText = texts[currentIndex];
      
      if (isDeleting) {
        currentText = fullText.substring(0, charIndex - 1);
        charIndex--;
      } else {
        currentText = fullText.substring(0, charIndex + 1);
        charIndex++;
      }

      setTypewriterText(currentText);

      let typeSpeed = 150;
      if (isDeleting) {
        typeSpeed /= 2;
      }

      if (!isDeleting && charIndex === fullText.length) {
        typeSpeed = 2000; // 暂停时间
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % texts.length;
      }

      setTimeout(type, typeSpeed);
    };

    type();
  }, []);

  const toggleLanguage = () => {
    setCurrentLang(currentLang === 'zh' ? 'en' : 'zh');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const content = {
    zh: {
      nav: {
        home: '首页',
        docs: '文档',
        github: 'GitHub'
      },
      hero: {
        title: 'AutoProvider',
        subtitle: '自主运营公司的未来',
        description: '与传统AI和Agent不同，AutoProvider创建了真正自主运营的公司，24小时无需人工干预。自驱动、自组织、自完善。',
        cta: '体验自动化',
        learnMore: '了解更多'
      },
      features: {
        title: '革命性功能',
        subtitle: '构建世界首个真正自主的公司',
        autonomous: {
          title: '完全自主',
          description: '无需人工指令，AI驱动的决策制定和任务执行。'
        },
        selfOrganizing: {
          title: '自我组织',
          description: '自动分配角色，分发任务，优化工作流程。'
        },
        continuous: {
          title: '24/7运营',
          description: '永不停歇的工作，持续改进和目标达成。'
        },
        adaptive: {
          title: '自我完善',
          description: '从每次交互中学习，持续进化能力。'
        }
      },
      comparison: {
        title: 'AutoProvider vs 传统AI',
        subtitle: '见证革命性的差异',
        traditional: '传统AI和Agent',
        autoprovider: 'AutoProvider',
        traditionalItems: ['需要人工指令', '限制于特定任务', '被动操作', '需要手动协调'],
        autoproviderItems: ['完全自驱动', '无限任务范围', '主动自主操作', '自动协调']
      },
      demo: {
        title: '实际演示',
        subtitle: '观看自主公司的运作方式',
        description: '体验商业自动化的未来，AI实体作为一个完整、自给自足的公司协同工作。',
        watchDemo: '观看演示',
        tryNow: '立即试用'
      }
    },
    en: {
      nav: {
        home: 'Home',
        docs: 'Docs',
        github: 'GitHub'
      },
      hero: {
        title: 'AutoProvider',
        subtitle: 'The Future of Autonomous Companies',
        description: 'Unlike traditional AI and Agents, AutoProvider creates fully autonomous companies that operate 24/7 without human intervention. Self-driven, self-organizing, and self-improving.',
        cta: 'Experience Automation',
        learnMore: 'Learn More'
      },
      features: {
        title: 'Revolutionary Features',
        subtitle: 'Building the world\'s first truly autonomous companies',
        autonomous: {
          title: 'Fully Autonomous',
          description: 'No human instructions needed. AI-driven decision making and task execution.'
        },
        selfOrganizing: {
          title: 'Self-Organizing',
          description: 'Automatically assigns roles, distributes tasks, and optimizes workflows.'
        },
        continuous: {
          title: '24/7 Operation',
          description: 'Never stops working. Continuous improvement and goal achievement.'
        },
        adaptive: {
          title: 'Self-Improving',
          description: 'Learns from every interaction and continuously evolves capabilities.'
        }
      },
      comparison: {
        title: 'AutoProvider vs Traditional AI',
        subtitle: 'See the revolutionary difference',
        traditional: 'Traditional AI & Agents',
        autoprovider: 'AutoProvider',
        traditionalItems: ['Requires human instructions', 'Limited to specific tasks', 'Passive operation', 'Manual coordination needed'],
        autoproviderItems: ['Fully self-driven', 'Unlimited task scope', 'Active autonomous operation', 'Automatic coordination']
      },
      demo: {
        title: 'See It In Action',
        subtitle: 'Watch how autonomous companies operate',
        description: 'Experience the future of business automation where AI entities work together as a complete, self-sustaining company.',
        watchDemo: 'Watch Demo',
        tryNow: 'Try Now'
      }
    }
  };

  const t = content[currentLang as keyof typeof content];

  return (
    <div className="bg-black text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-2xl font-bold"
            >
              AutoProvider
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('home')} className="hover:text-gray-300 transition-colors">
                {t.nav.home}
              </button>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  // 这里可以添加文档链接
                  window.open('/docs', '_blank');
                }}
                className="hover:text-gray-300 transition-colors"
              >
                {t.nav.docs}
              </a>
              <a 
                href="https://github.com/your-username/autoprovider" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 hover:text-gray-300 transition-colors group"
              >
                <Github size={20} className="group-hover:scale-110 transition-transform" />
                <span>{t.nav.github}</span>
              </a>
              
              <button onClick={toggleLanguage} className="flex items-center space-x-2 hover:text-gray-300 transition-colors">
                <Globe size={20} />
                <span>{currentLang.toUpperCase()}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="md:hidden mt-4 py-4 border-t border-white/10"
            >
              <div className="flex flex-col space-y-4">
                <button onClick={() => scrollToSection('home')} className="text-left hover:text-gray-300 transition-colors">
                  {t.nav.home}
                </button>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    window.open('/docs', '_blank');
                  }}
                  className="text-left hover:text-gray-300 transition-colors"
                >
                  {t.nav.docs}
                </a>
                <a 
                  href="https://github.com/your-username/autoprovider" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-left flex items-center space-x-2 hover:text-gray-300 transition-colors"
                >
                  <Github size={20} />
                  <span>{t.nav.github}</span>
                </a>
                <button onClick={toggleLanguage} className="text-left flex items-center space-x-2 hover:text-gray-300 transition-colors">
                  <Globe size={20} />
                  <span>{currentLang === 'zh' ? 'English' : '中文'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Neural Network Background */}
        <NeuralNetworkBackground />
        
        {/* Additional Floating Elements */}
        {mounted && (
          <div className="absolute inset-0 pointer-events-none">
            {/* 数据流动画 */}
            {particles.slice(0, 20).map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                initial={{
                  opacity: 0,
                  x: particle.x,
                  y: particle.y,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [particle.x, particle.x + 200, particle.x - 100],
                  y: [particle.y, particle.targetY, particle.y + 100],
                }}
                transition={{
                  duration: particle.duration + 2,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "easeInOut"
                }}
              />
            ))}
            
            {/* 脉冲环形动画 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute border border-white/20 rounded-full"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 2, 4],
                    opacity: [0.8, 0.4, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: i * 1.3,
                    ease: "easeOut"
                  }}
                  style={{
                    width: '200px',
                    height: '200px',
                    left: '-100px',
                    top: '-100px'
                  }}
                />
              ))}
            </div>
            
            {/* 代码雨效果 */}
            {particles.slice(20, 35).map((particle) => (
              <motion.div
                key={`code-${particle.id}`}
                className="absolute text-green-400/30 font-mono text-xs select-none"
                initial={{
                  opacity: 0,
                  x: particle.x,
                  y: -20,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: typeof window !== 'undefined' ? window.innerHeight + 20 : 1100,
                }}
                transition={{
                  duration: particle.duration + 3,
                  repeat: Infinity,
                  delay: particle.delay + 1,
                  ease: "linear"
                }}
              >
                {['AI', '01', '{}', '<>', '&&', '||', 'fn', 'AI'][particle.id % 8]}
              </motion.div>
            ))}
          </div>
        )}
        
        <div className="relative z-10 container mx-auto px-6 text-center">
          {/* 动态标题与打字机效果 */}
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-white via-green-400 to-white bg-clip-text text-transparent"
            >
              {t.hero.title}
            </motion.h1>
            
            {/* 打字机效果副标题 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-2xl md:text-4xl font-light text-green-400 mb-2 h-12 flex items-center justify-center"
            >
              <span className="mr-2">{typewriterText}</span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-green-400"
              >
                |
              </motion.span>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="text-xl md:text-2xl font-light text-gray-300"
            >
              {t.hero.subtitle}
            </motion.h2>
          </div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="text-lg md:text-xl text-gray-400 max-w-4xl mx-auto mb-12 leading-relaxed"
          >
            {t.hero.description}
          </motion.p>
          
          {/* 增强的按钮动画 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <motion.button
              onClick={() => scrollToSection('demo')}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 0 25px rgba(0, 255, 136, 0.5)"
              }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-400 text-black font-semibold rounded-full overflow-hidden transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t.hero.cta}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
            
            <motion.button
              onClick={() => scrollToSection('features')}
              whileHover={{ 
                scale: 1.05,
                borderColor: "rgba(0, 255, 136, 0.8)"
              }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-2 px-8 py-4 border border-white/30 text-white rounded-full hover:bg-green-400/10 transition-all duration-300"
            >
              <Play className="w-5 h-5 group-hover:text-green-400 transition-colors" />
              <span className="group-hover:text-green-400 transition-colors">{t.hero.learnMore}</span>
            </motion.button>
          </motion.div>
          
          {/* 数据统计显示 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.1 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { label: '自主操作', value: '24/7' },
              { label: '效率提升', value: '300%' },
              { label: '错误率', value: '< 0.1%' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="text-center p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 2.3 + index * 0.2 }}
                  className="text-2xl font-bold text-green-400 mb-1"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t.features.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Bot, ...t.features.autonomous },
              { icon: Network, ...t.features.selfOrganizing },
              { icon: Clock, ...t.features.continuous },
              { icon: TrendingUp, ...t.features.adaptive }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center"
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  
                  <div className="relative z-10 text-center">
                    <h3 className="text-xl font-semibold mb-4 text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-20 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t.comparison.title}
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t.comparison.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Traditional AI Column */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="p-8 rounded-2xl bg-gradient-to-br from-red-900/20 to-gray-900/50 backdrop-blur-sm border border-red-500/20">
                <h3 className="text-2xl font-bold mb-6 text-red-400 text-center">
                  {t.comparison.traditional}
                </h3>
                
                <div className="space-y-4">
                  {t.comparison.traditionalItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* VS Column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="text-4xl font-bold text-white mb-4">VS</div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center"
              >
                <ArrowRight className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>

            {/* AutoProvider Column */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="p-8 rounded-2xl bg-gradient-to-br from-green-900/20 to-gray-900/50 backdrop-blur-sm border border-green-500/20">
                <h3 className="text-2xl font-bold mb-6 text-green-400 text-center">
                  {t.comparison.autoprovider}
                </h3>
                
                <div className="space-y-4">
                  {t.comparison.autoproviderItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t.demo.title}
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              {t.demo.subtitle}
            </p>
            <p className="text-lg text-gray-500 max-w-4xl mx-auto">
              {t.demo.description}
            </p>
          </motion.div>

          {/* Demo Video Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="relative group">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-white/10 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="group flex items-center justify-center w-24 h-24 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300"
                  >
                    <Play className="w-12 h-12 text-white ml-1" />
                  </motion.button>
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4"
              >
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-300">
                  <Play className="w-5 h-5" />
                  {t.demo.watchDemo}
                </button>
                <button className="flex items-center gap-2 px-6 py-3 border border-white/30 text-white rounded-full hover:bg-white/10 transition-all duration-300">
                  {t.demo.tryNow}
                </button>
              </motion.div>
            </div>
          </motion.div>

          {/* Demo Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Cpu, title: "AI Decision Making", description: "Watch as AI entities make autonomous decisions without human input" },
              { icon: Users, title: "Self-Organization", description: "See how roles are automatically assigned and teams form organically" },
              { icon: Zap, title: "Real-time Adaptation", description: "Observe continuous learning and process optimization in action" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className="h-full p-6 rounded-xl bg-gradient-to-br from-gray-900/30 to-black/30 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 mb-4 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center"
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="inline-block p-8 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Build Your Autonomous Company?
              </h3>
              <p className="text-gray-400 mb-6 max-w-2xl">
                Join the revolution of truly autonomous business operations. 
                Experience the future where AI doesn't just assist - it leads.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
              >
                Get Started Today
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">AutoProvider</h3>
              <p className="text-gray-400">
                Building the future of autonomous business operations.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <div className="flex flex-col space-y-2">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Product</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <div className="flex flex-col space-y-2">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">GitHub</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
            © 2024 AutoProvider. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}