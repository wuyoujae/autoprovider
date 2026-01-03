export interface VipFeature {
  text: string;
  included: boolean; // true 显示 √, false 显示 x
}

export interface VipPlan {
  id: string;
  name: string;
  type: "free" | "pro" | "ultra" | "ultimate" | "enterprise";
  price: number;
  period: string;
  max_projects: number;
  credits: number | "unlimited";
  features: VipFeature[];
  popular?: boolean;
  description: string;
}

export const vipPlans: VipPlan[] = [
  {
    id: "free",
    name: "Free",
    type: "free",
    price: 0,
    period: "pricing.period_month",
    max_projects: 1,
    credits: 350000,
    description: "pricing.free_description",
    features: [
      { text: "pricing.feature_projects_1", included: true },
      { text: "pricing.feature_credits_350k", included: true },
      { text: "pricing.feature_basic_support", included: true },
      { text: "pricing.feature_priority_support", included: false },
      { text: "pricing.feature_advanced_ai", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    type: "pro",
    price: 15,
    period: "pricing.period_month",
    max_projects: 3,
    credits: 7000000,
    description: "pricing.pro_description",
    popular: true,
    features: [
      { text: "pricing.feature_projects_3", included: true },
      { text: "pricing.feature_credits_7m", included: true },
      { text: "pricing.feature_basic_support", included: true },
      { text: "pricing.feature_priority_support", included: true },
      { text: "pricing.feature_advanced_ai", included: true },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    type: "ultra",
    price: 40,
    period: "pricing.period_month",
    max_projects: 5,
    credits: 21000000,
    description: "pricing.ultra_description",
    features: [
      { text: "pricing.feature_projects_5", included: true },
      { text: "pricing.feature_credits_21m", included: true },
      { text: "pricing.feature_basic_support", included: true },
      { text: "pricing.feature_priority_support", included: true },
      { text: "pricing.feature_advanced_ai", included: true },
      { text: "pricing.feature_super_ai_experience", included: true },
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    type: "ultimate",
    price: 200,
    period: "pricing.period_month",
    max_projects: 10,
    credits: 150000000,
    description: "pricing.ultimate_description",
    features: [
      { text: "pricing.feature_projects_10", included: true },
      { text: "pricing.feature_credits_150m", included: true },
      { text: "pricing.feature_basic_support", included: true },
      { text: "pricing.feature_priority_support", included: true },
      { text: "pricing.feature_advanced_ai", included: true },
      { text: "pricing.feature_super_ai_experience", included: true },
      { text: "pricing.feature_dedicated_support", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    type: "enterprise",
    price: -1, // -1 表示自定义价格
    period: "pricing.period_custom",
    max_projects: -1, // -1 表示无限制
    credits: "unlimited",
    description: "pricing.enterprise_description",
    features: [
      { text: "pricing.feature_unlimited_projects", included: true },
      { text: "pricing.feature_unlimited_credits", included: true },
      { text: "pricing.feature_custom_solutions", included: true },
      { text: "pricing.feature_dedicated_account_manager", included: true },
      { text: "pricing.feature_sla_guarantee", included: true },
      { text: "pricing.feature_on_premise_deployment", included: true },
      { text: "pricing.feature_advanced_security", included: true },
    ],
  },
];
